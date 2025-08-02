const { establecerEstado } = require('../../services/stateService');
const { calcularPrecioTotal } = require('../../services/reservaPriceService');
const { enviarAlGrupo } = require('../../utils/utils');
const { guardarComprobante } = require('../../services/comprobanteService');
const { descargarMedia } = require('../../utils/mediaUtils');
const { enviarReservaAlGrupo } = require('../../utils/grupoUtils');
const { ESTADOS_RESERVA } = require('../reservaConstants');
const { createReservationWithUser, normalizePhoneNumber } = require('../../services/reservaService');
const alojamientosService = require('../../services/alojamientosService');
const { parseDateRange } = require('../../utils/dateRangeParser');

// Funciones auxiliares para mejorar la legibilidad

const calcularDiferenciaDias = (entrada, salida) => {
    const fechaEntrada = new Date(entrada.split('/').reverse().join('-'));
    const fechaSalida = new Date(salida.split('/').reverse().join('-'));
    return Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
};

const asignarAlojamiento = (personas) => {
    if (personas <= 3) return 'tortuga';
    if (personas <= 6) return 'delfin';
    if (personas <= 9) return 'tiburon';
    return null;
};

const formatearFechaCompleta = (fechaStr) => {
    // Convierte fecha DD/MM/YYYY a formato legible
    const [dia, mes, año] = fechaStr.split('/');
    const fecha = new Date(año, mes - 1, dia);
    
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const diaSemana = diasSemana[fecha.getDay()];
    const diaNum = fecha.getDate();
    const mesNombre = meses[fecha.getMonth()];
    const añoNum = fecha.getFullYear();
    
    return `${diaSemana} ${diaNum} de ${mesNombre} de ${añoNum}`;
};

async function handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje) {
    try {
        console.log(`[TRACE] handleReservaState called with estado=${estado}, datos=`, datos);
        console.log(`[DEBUG] Mensaje recibido para fechas: '${mensajeTexto}'`);
        switch (estado) {
            case ESTADOS_RESERVA.FECHAS: {
                const resultado = parseDateRange(mensajeTexto);
                console.log('[DEBUG] Resultado parseDateRange:', resultado);
                if (resultado.error) {
                    await bot.sendMessage(remitente, { text: `❌ ${resultado.error} Intenta con otro formato, ejemplo: *20/08/2025 al 25/08/2025*` });
                    return;
                }
                const { entrada, salida, mensaje } = resultado;
                const noches = calcularDiferenciaDias(entrada, salida);
                if (noches < 1) {
                    await bot.sendMessage(remitente, { text: '❌ La fecha de salida debe ser *posterior* a la entrada' });
                    return;
                }
                // Confirmar fechas con el usuario
                await bot.sendMessage(remitente, { text: mensaje });
                
                // Mensaje adicional para pedir confirmación
                const mensajeConfirmacion = `
📝 *Para continuar con tu reserva:*

✅ Escribe *"SÍ"* para confirmar estas fechas
❌ Escribe *"NO"* para ingresar nuevas fechas

💡 *¿Estás listo para continuar?*`;
                
                await bot.sendMessage(remitente, { text: mensajeConfirmacion.trim() });
                // Guardar fechas temporalmente y esperar confirmación
                await establecerEstado(remitente, ESTADOS_RESERVA.CONFIRMAR_FECHAS, {
                    fechaEntrada: entrada,
                    fechaSalida: salida,
                    noches
                });
                break;
            }
            case ESTADOS_RESERVA.CONFIRMAR_FECHAS: {
                const respuesta = mensajeTexto.trim().toLowerCase();
                if (respuesta === 'sí' || respuesta === 'si') {
                    // Continúa el flujo, no vuelve a preguntar fechas
                    await bot.sendMessage(remitente, { text: '✅ *¡Fechas confirmadas!*\n📝 *Por favor, dime tu nombre completo:*' });
                    await establecerEstado(remitente, ESTADOS_RESERVA.NOMBRE, datos);
                } else if (respuesta === 'no') {
                    await bot.sendMessage(remitente, { text: '🔄 *De acuerdo, volvamos a empezar.*\n\n📅 *Por favor, ingresa nuevamente las fechas de tu reserva.*\n\n💡 *Ejemplo:* 20/08/2025 al 25/08/2025' });
                    await establecerEstado(remitente, ESTADOS_RESERVA.FECHAS, {});
                } else {
                    await bot.sendMessage(remitente, { text: '❓ *No entendí tu respuesta.*\n\n✅ Escribe *"SÍ"* para confirmar las fechas\n❌ Escribe *"NO"* para cambiar las fechas' });
                }
                break;
            }

            case ESTADOS_RESERVA.NOMBRE: {
                const telefono = remitente.split('@')[0];
                await bot.sendMessage(remitente, { text: '👥 *¿Cuántas personas serán?*' });
                console.log(`[TRACE] Setting nombre=${mensajeTexto.trim()} and telefono=${telefono} in datos`);
                await establecerEstado(remitente, ESTADOS_RESERVA.PERSONAS, { 
                    ...datos, 
                    nombre: mensajeTexto.trim(),
                    telefono 
                });
                break;
            }

            case ESTADOS_RESERVA.PERSONAS: {
                const cantidad = parseInt(mensajeTexto);
                if (isNaN(cantidad) || cantidad < 1) {
                    await bot.sendMessage(remitente, { text: '🔢 Por favor ingresa un *número válido* (ej: 4)' });
                    return;
                }
                const tipoCabana = asignarAlojamiento(cantidad);
                if (!tipoCabana) {
                    await bot.sendMessage(remitente, {
                        text: `⚠️ *Capacidad excedida* (${cantidad} personas)\nSugerencia: Alquila múltiples cabañas`
                    });
                    return;
                }
                await bot.sendMessage(remitente, {
                    text: `🏠 *Asignado automáticamente:*
*${tipoCabana}* para ${cantidad} persona(s)`
                });
                try {
                    const precioTotal = calcularPrecioTotal(
                        tipoCabana, 
                        datos.fechaEntrada, 
                        datos.noches
                    );
                    console.log(`[TRACE] Calculated precioTotal=${precioTotal}`);
                    
                    // Formatear fechas para mejor presentación
                    const fechaEntradaFormatted = formatearFechaCompleta(datos.fechaEntrada);
                    const fechaSalidaFormatted = formatearFechaCompleta(datos.fechaSalida);
                    
                    // Resumen completo de la reserva
                    const resumenReserva = `📋 *RESUMEN DE TU RESERVA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *Nombre:* ${datos.nombre}
📞 *Teléfono:* ${datos.telefono}
📅 *Fechas:* ${fechaEntradaFormatted} hasta ${fechaSalidaFormatted}
🌙 *Noches:* ${datos.noches}
� *Personas:* ${cantidad}
🏠 *Alojamiento:* ${tipoCabana.toUpperCase()}
💵 *Total:* Lmps. ${precioTotal.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 *¿Aceptas las condiciones de uso?* (responde *sí* o *no*)`;

                    await bot.sendMessage(remitente, { 
                        text: resumenReserva
                    });
                    
                    await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, {
                        ...datos,
                        personas: cantidad,
                        alojamiento: tipoCabana,
                        precioTotal
                    });
                } catch (error) {
                    console.error('Error cálculo precio:', error);
                    await bot.sendMessage(remitente, { 
                        text: '❌ Error calculando el precio. Intenta nuevamente' 
                    });
                }
                break;
            }

            case ESTADOS_RESERVA.CONDICIONES: {
                const aceptado = /^s[iíí]$/i.test(mensajeTexto.trim());
                
                if (!aceptado) {
                    await bot.sendMessage(remitente, { 
                        text: '📝 Debes aceptar las condiciones para continuar\nResponde *"sí"* si estás de acuerdo' 
                    });
                    return;
                }
                
                // ✅ VERIFICAR DISPONIBILIDAD ANTES DE ACEPTAR LA RESERVA
                const { buscarCabanaDisponible } = require('../../services/cabinsService');
                
                try {
                    // Convertir fechas al formato correcto para la búsqueda
                    const fechaInicio = datos.fechaEntrada.split('/').reverse().join('-'); // DD/MM/YYYY -> YYYY-MM-DD
                    const fechaFin = datos.fechaSalida.split('/').reverse().join('-');
                    
                    const cabanaDisponible = await buscarCabanaDisponible(
                        datos.alojamiento, 
                        fechaInicio, 
                        fechaFin, 
                        datos.personas
                    );
                    
                    if (!cabanaDisponible) {
                        // NO HAY DISPONIBILIDAD - Informar al cliente
                        const tipoNombre = datos.alojamiento === 'tortuga' ? 'Tortuga' : 
                                          datos.alojamiento === 'delfin' ? 'Delfín' : 'Tiburón';
                        
                        await bot.sendMessage(remitente, { 
                            text: `❌ Lo sentimos, no hay cabañas tipo *${tipoNombre}* disponibles para las fechas *${datos.fechaEntrada} - ${datos.fechaSalida}*.\n\n` +
                                  `📅 Por favor selecciona otras fechas o consulta disponibilidad de otros tipos de cabaña.\n\n` +
                                  `Para empezar de nuevo, escribe *"hola"*.`
                        });
                        
                        // Limpiar estado para que pueda empezar de nuevo
                        await establecerEstado(remitente, null, {});
                        return;
                    }
                    
                    // HAY DISPONIBILIDAD - Continuar con la reserva
                    console.log(`✅ Cabaña ${datos.alojamiento} disponible: ${cabanaDisponible.name}`);
                    
                } catch (error) {
                    console.error('Error verificando disponibilidad:', error);
                    await bot.sendMessage(remitente, { 
                        text: '❌ Error verificando disponibilidad. Por favor intenta nuevamente.' 
                    });
                    return;
                }
                
                const resumen = `\n📋 *NUEVA SOLICITUD DE RESERVA*\n--------------------------------\n• 👤 *Nombre:* ${datos.nombre}\n• 📱 *Teléfono:* ${datos.telefono}\n• 👥 *Personas:* ${datos.personas}\n• 🏠 *Alojamiento:* ${datos.alojamiento}\n• 📅 *Fechas:* ${datos.fechaEntrada} - ${datos.fechaSalida} (${datos.noches} noches)\n• 💰 *Total:* Lmps. ${datos.precioTotal}\n--------------------------------\n                `;
                
                await enviarAlGrupo(bot, resumen);
                await enviarAlGrupo(bot, `/confirmar ${datos.telefono}`);
                await bot.sendMessage(remitente, { 
                    text: '📤 Reserva enviada para confirmación\n\n 💳 *Porfavor esperar admistracion confirme su Reserva:*' 
                });

                // Remove fetching latest pending reservation here to avoid reusing old reservation ID
                // The reservation will be created in handleConfirmarCommand and state updated accordingly
                
                await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_PAGO, datos);
                break;
            }

            case ESTADOS_RESERVA.ESPERANDO_PAGO: {
                console.log('Mensaje completo recibido en ESPERANDO_PAGO:', JSON.stringify(mensaje));
                console.log('Mensaje keys:', Object.keys(mensaje));
                console.log('Mensaje tiene imageMessage:', mensaje.hasOwnProperty('imageMessage'));
                console.log('Mensaje tiene documentMessage:', mensaje.hasOwnProperty('documentMessage'));
                const esComprobante = mensaje.imageMessage || mensaje.documentMessage;
                console.log('ESPERANDO_PAGO - esComprobante:', esComprobante);
                if (!esComprobante) {
                    await bot.sendMessage(remitente, { 
                        text: '📎 Por favor envía una *foto* o *PDF* del comprobante' 
                    });
                    return;
                }
                
                try {
                    console.log('Descargando media del mensaje...');
                    const { buffer, mimetype, nombreArchivo } = await descargarMedia(mensaje);
                    console.log('Media descargada:', { mimetype, nombreArchivo, bufferLength: buffer.length });
                    const reservaActualizada = await guardarComprobante(
                        datos.reservaId,
                        buffer,
                        mimetype,
                        nombreArchivo
                    );
                    console.log('Reserva actualizada con comprobante:', reservaActualizada);
                    await bot.sendMessage(remitente, { 
                        text: '✅ Comprobante recibido! Estamos verificando tu pago.' 
                    });
                    await enviarReservaAlGrupo(bot, reservaActualizada);
                    await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_CONFIRMACION, datos);
                } catch (error) {
                    console.error('Error procesando comprobante:', error);
                    await bot.sendMessage(remitente, {
                        text: '⚠️ Error procesando tu comprobante. Intenta nuevamente.'
                    });
                }
                break;
            }

            case ESTADOS_RESERVA.ESPERANDO_CONFIRMACION: {
                await bot.sendMessage(remitente, { 
                    text: '⏳ Tu reserva está en proceso de confirmación\nTe notificaremos cuando esté lista' 
                });
                break;
            }
        }
    } catch (error) {
        console.error('Error en handleReservaState:', error);
        await bot.sendMessage(remitente, { 
            text: '⚠️ Ocurrió un error inesperado. Por favor intenta nuevamente' 
        });
        await establecerEstado(remitente, 'MENU_PRINCIPAL');
    }
}

module.exports = { handleReservaState };
