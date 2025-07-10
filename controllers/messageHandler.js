/**
 * Módulo profesional con logger para producción
 */

const { establecerEstado, obtenerEstado, establecerUltimoSaludo, obtenerUltimoSaludo } = require('../services/stateService');
const constants = require('./constants');
const { handleMainMenuOptions } = require('../controllers/mainMenuHandler');
const { exportarReservasAExcel } = require('../services/reservaExportService');
const logger = require('../config/logger'); // Logger profesional
const { enviarMenuPrincipal, enviarMenuCabanas, enviarDetalleCabaña } = require('../services/messagingService');
const { sendActividadDetails } = require('./actividadesController');
const { ESTADOS_RESERVA } = require('./reservaConstants');
const { enviarAlGrupo, reenviarComprobanteAlGrupo } = require('../utils/utils');
const { calcularPrecioTotal } = require('../services/reservaPriceService');

async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
    const { estado, datos } = obtenerEstado(remitente);

    if (!remitente || typeof remitente !== 'string' || remitente.trim() === '') {
        logger.error('Remitente inválido en procesarMensaje', {
            mensaje,
            mensajeObj
        });
        return;
    }

    const mensajeTexto = mensaje || '';
    const textoMinuscula = mensajeTexto.toLowerCase().trim();

    try {
        const hoy = new Date().toISOString().slice(0, 10);
        const ultimoSaludo = obtenerUltimoSaludo(remitente) || '';

        if (ultimoSaludo !== hoy) {
            await establecerUltimoSaludo(remitente, hoy);
            const saludo = `🌴 ¡Bienvenido(a) a Villas Julie! 🏖️ Tu rincón ideal frente al mar te espera.`;

            try {
                await bot.sendMessage(remitente, { text: saludo });
            } catch (saludoError) {
                logger.warn(`Error enviando saludo a ${remitente}: ${saludoError.message}`, {
                    userId: remitente
                });
            }

            await enviarMenuPrincipal(bot, remitente);
            return;
        }

        if (textoMinuscula === 'menu' || textoMinuscula === 'menú') {
            await enviarMenuPrincipal(bot, remitente);
            return;
        }

        logger.debug(`Procesando mensaje de ${remitente}: ${mensajeTexto}`, {
            estado
        });

        switch (estado) {
            case 'MENU_PRINCIPAL': {
                if (mensajeTexto.trim() === '1') {
                    // Mostrar menú de alojamientos directamente
                    await enviarMenuCabanas(bot, remitente);
                } else if (mensajeTexto.trim() === 'exportar reservas') {
                    try {
                        const rutaArchivo = await exportarReservasAExcel();
                        await bot.sendMessage(remitente, { text: `Reservas exportadas exitosamente. Archivo guardado en: ${rutaArchivo}` });
                    } catch (error) {
                        await bot.sendMessage(remitente, { text: 'Error al exportar las reservas. Por favor intenta más tarde.' });
                    }
                } else {
                    await handleMainMenuOptions(bot, remitente, mensajeTexto.trim(), establecerEstado);
                }
                break;
            }

            case 'LISTA_CABAÑAS': {
                if (mensajeTexto.trim() === '0') {
                    await enviarMenuPrincipal(bot, remitente);
                } else {
                    const seleccion = parseInt(mensajeTexto.trim());
                    if (isNaN(seleccion)) {
                        await bot.sendMessage(remitente, {
                            text: '⚠️ Por favor ingresa solo el número de la cabaña que deseas ver.'
                        });
                        await enviarMenuCabanas(bot, remitente);
                    } else {
                        await enviarDetalleCabaña(bot, remitente, seleccion);
                    }
                }
                break;
            }

            case 'DETALLE_CABAÑA': {
                switch (mensajeTexto.trim().toLowerCase()) {
                    case '1':
                        await enviarMenuCabanas(bot, remitente);
                        break;
                    case '2':
                        await bot.sendMessage(remitente, {
                            text: 'Funcionalidad de reserva aún no implementada. Serás redirigido al menú principal.'
                        });
                        await enviarMenuPrincipal(bot, remitente);
                        break;
                    case '0':
                        await enviarMenuPrincipal(bot, remitente);
                        break;
                    default:
                        await bot.sendMessage(remitente, {
                            text: '⚠️ Opción no reconocida. Por favor selecciona una opción válida.'
                        });
                        if (datos && datos.seleccion) {
                            await enviarDetalleCabaña(bot, remitente, datos.seleccion);
                        } else {
                            await enviarMenuCabanas(bot, remitente);
                        }
                        break;
                }
                break;
            }

            case 'actividades': {
                if (mensajeTexto.trim() === '0') {
                    await enviarMenuPrincipal(bot, remitente);
                } else {
                    const seleccion = parseInt(mensajeTexto.trim());
                    if (isNaN(seleccion)) {
                        await bot.sendMessage(remitente, {
                            text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.'
                        });
                    } else {
                        await sendActividadDetails(bot, remitente, seleccion);
                    }
                }
                break;
            }

            // Estados del flujo de reserva
            case ESTADOS_RESERVA.FECHAS: {
                // 1. Pide fechas
                const partes = mensajeTexto.split('-');
                if (partes.length !== 2) {
                    await bot.sendMessage(remitente, { text: 'Por favor, usa el formato correcto: 20/08/2025 - 25/08/2025' });
                    return;
                }
                const fechaEntradaStr = partes[0].trim();
                const fechaSalidaStr = partes[1].trim();

                // Calcular número de noches
                const [diaE, mesE, anioE] = fechaEntradaStr.split('/');
                const [diaS, mesS, anioS] = fechaSalidaStr.split('/');
                const fechaEntradaDate = new Date(anioE, mesE - 1, diaE);
                const fechaSalidaDate = new Date(anioS, mesS - 1, diaS);
                const diffTime = fechaSalidaDate - fechaEntradaDate;
                const noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (noches < 1) {
                    await bot.sendMessage(remitente, { text: 'La fecha de salida debe ser posterior a la fecha de entrada. Por favor, ingresa las fechas nuevamente.' });
                    return;
                }

                // Validar disponibilidad (aquí puedes poner una función mock)
                const disponible = true; // Cambiar por función real si se desea
                if (disponible) {
                    await bot.sendMessage(remitente, { text: '✅ ¡Fechas disponibles! Continuemos...\nPor favor, dime tu nombre completo:' });
                    await establecerEstado(remitente, ESTADOS_RESERVA.NOMBRE, { fechaEntrada: fechaEntradaStr, fechaSalida: fechaSalidaStr, noches });
                } else {
                    await bot.sendMessage(remitente, { text: '❌ Lo sentimos, esas fechas no están disponibles. ¿Deseas intentar con otras?' });
                }
                return;
            }

            case ESTADOS_RESERVA.NOMBRE: {
                await bot.sendMessage(remitente, { text: '¿Cuál es tu número de teléfono?' });
                await establecerEstado(remitente, ESTADOS_RESERVA.TELEFONO, { ...datos, nombre: mensajeTexto });
                return;
            }

            case ESTADOS_RESERVA.TELEFONO: {
                await bot.sendMessage(remitente, { text: '¿Cuántas personas serán?' });
                await establecerEstado(remitente, ESTADOS_RESERVA.PERSONAS, { ...datos, telefono: mensajeTexto });
                return;
            }

            case ESTADOS_RESERVA.PERSONAS: {
                const cantidad = parseInt(mensajeTexto.trim());

                if (isNaN(cantidad) || cantidad < 1) {
                    await bot.sendMessage(remitente, { text: 'Por favor, ingresa una cantidad válida de personas (número mayor a 0).' });
                    return;
                }

                let alojamiento = '';
                if (cantidad <= 3) {
                    alojamiento = 'Cabaña Tortuga';
                } else if (cantidad <= 6) {
                    alojamiento = 'Cabaña Caracol';
                } else if (cantidad <= 9) {
                    alojamiento = 'Cabaña Tiburón';
                } else {
                    await bot.sendMessage(remitente, {
                        text: `La cantidad ingresada (${cantidad}) excede la capacidad máxima por cabaña (9 personas). Te sugerimos alquilar más de una cabaña.`
                    });
                    return;
                }

                await bot.sendMessage(remitente, {
                    text: `Perfecto. Se asignó automáticamente *${alojamiento}* para ${cantidad} persona(s).`
                });

                // Calcular precio total usando noches ya calculadas
                const noches = datos.noches;
                if (!noches) {
                    await bot.sendMessage(remitente, { text: 'Error: no se encontró el número de noches. Por favor, reinicia la reserva.' });
                    await establecerEstado(remitente, 'MENU_PRINCIPAL');
                    return;
                }
                const precioTotal = calcularPrecioTotal(alojamiento, datos.fechaEntrada, noches);
                await bot.sendMessage(remitente, { text: `El precio total para tu reserva es: $${precioTotal}` });
                await bot.sendMessage(remitente, { text: '¿Leíste y aceptas las condiciones de uso? (responde sí/no)' });
                await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, {
                    ...datos,
                    personas: cantidad,
                    alojamiento,
                    noches,
                    precioTotal
                });
                return;
            }
            case 'RESERVA_NOCHES': {
                const noches = parseInt(mensajeTexto.trim());
                if (isNaN(noches) || noches < 1) {
                    await bot.sendMessage(remitente, { text: 'Por favor, ingresa un número válido de noches (mayor a 0).' });
                    return;
                }
                // Calcular precio total
                const fechaEntrada = datos.fechaEntrada;
                if (!fechaEntrada) {
                    await bot.sendMessage(remitente, { text: 'Error: no se encontró la fecha de entrada. Por favor, reinicia la reserva.' });
                    await establecerEstado(remitente, 'MENU_PRINCIPAL');
                    return;
                }
                const precioTotal = calcularPrecioTotal(alojamiento, fechaEntrada, noches);
                await bot.sendMessage(remitente, { text: `El precio total para tu reserva es: $${precioTotal}` });

                await bot.sendMessage(remitente, { text: '¿Leíste y aceptas las condiciones de uso? (responde sí/no)' });

                await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, {
                    ...datos,
                    personas: cantidad,
                    alojamiento,
                    noches,
                    precioTotal
                });
                return;
            }

            case ESTADOS_RESERVA.ALOJAMIENTO: {
                await bot.sendMessage(remitente, { text: '¿Leíste y aceptas las condiciones de uso? (responde sí/no)' });
                await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, { ...datos, alojamiento: mensajeTexto });
                return;
            }

            case ESTADOS_RESERVA.CONDICIONES: {
                if (mensajeTexto.toLowerCase() === 'sí' || mensajeTexto.toLowerCase() === 'si') {
                    // ENVÍA RESUMEN AL GRUPO DE WHATSAPP
                    const resumen =
`/confirmar
Nombre: ${datos.nombre}
Teléfono: ${datos.telefono}
Personas: ${datos.personas}
Alojamiento: ${datos.alojamiento}
Fechas: ${datos.fechaEntrada} - ${datos.fechaSalida}
Noches: ${datos.noches}
Total a pagar: $${datos.precioTotal}`;

                    await enviarAlGrupo(bot, resumen); // función que debes crear
                    await bot.sendMessage(remitente, { text: 'Para confirmar tu reserva, debes hacer un depósito del 50%. Tienes 24h para enviar el comprobante.' });
                    await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_PAGO, { ...datos, condiciones: mensajeTexto });
                } else {
                    await bot.sendMessage(remitente, { text: 'Debes aceptar las condiciones para continuar.' });
                }
                return;
            }

            case ESTADOS_RESERVA.ESPERANDO_PAGO: {
                if (mensaje.imageMessage || mensaje.documentMessage) {
                    // Reenvía la imagen al grupo
                    await reenviarComprobanteAlGrupo(bot, mensaje, datos); // función que debes crear
                    await bot.sendMessage(remitente, { text: '¡Comprobante recibido! Un administrador confirmará tu reserva pronto.' });
                    await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_CONFIRMACION, datos);
                } else {
                    await bot.sendMessage(remitente, { text: 'Por favor, envía una foto o PDF del comprobante de pago.' });
                }
                return;
            }

            case ESTADOS_RESERVA.ESPERANDO_CONFIRMACION: {
                // Lógica para esperar confirmación final
                await bot.sendMessage(remitente, { text: 'Tu reserva está siendo confirmada. Por favor espera.' });
                break;
            }

            default: {
                logger.warn(`Estado no manejado: ${estado}`, {
                    userId: remitente
                });

                await bot.sendMessage(remitente, {
                    text: '⚠️ Ocurrió un error inesperado. Reiniciando tu sesión...'
                });
                await enviarMenuPrincipal(bot, remitente);
                break;
            }
        }
    } catch (error) {
        logger.error(`Error crítico en procesarMensaje para ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente,
            mensaje
        });

        try {
            await bot.sendMessage(remitente, {
                text: '⚠️ Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo más tarde.'
            });
            await establecerEstado(remitente, 'MENU_PRINCIPAL');
            await bot.sendMessage(remitente, { text: constants.MENU_PRINCIPAL });
        } catch (fallbackError) {
            if (typeof logger.critical === 'function') {
                logger.critical(`Error de comunicación crítico con ${remitente}: ${fallbackError.message}`, {
                    stack: fallbackError.stack,
                    userId: remitente
                });
            } else {
                logger.error(`Error de comunicación crítico con ${remitente}: ${fallbackError.message}`, {
                    stack: fallbackError.stack,
                    userId: remitente
                });
            }
        }
    }
}

module.exports = {
    enviarMenuPrincipal,
    procesarMensaje
};
