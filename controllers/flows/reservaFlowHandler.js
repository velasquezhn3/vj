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
    if (personas <= 3) return 'Cabaña Tortuga';
    if (personas <= 6) return 'Cabaña Caracol';
    if (personas <= 9) return 'Cabaña Tiburón';
    return null;
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
                // Guardar fechas temporalmente y esperar confirmación
                await establecerEstado(remitente, ESTADOS_RESERVA.CONFIRMAR_FECHAS, {
                    fechaEntrada: entrada,
                    fechaSalida: salida,
                    noches
                });
                break;
            }
            case ESTADOS_RESERVA.CONFIRMAR_FECHAS: {
                if (mensajeTexto.trim().toLowerCase() === 'sí' || mensajeTexto.trim().toLowerCase() === 'si') {
                    // Continúa el flujo, no vuelve a preguntar fechas
                    await bot.sendMessage(remitente, { text: '✅ *¡Fechas confirmadas!*\n📝 *Por favor, dime tu nombre completo:*' });
                    await establecerEstado(remitente, ESTADOS_RESERVA.NOMBRE, datos);
                } else {
                    await bot.sendMessage(remitente, { text: '❌ Fechas no confirmadas. Por favor, ingresa nuevamente el rango de fechas.' });
                    await establecerEstado(remitente, ESTADOS_RESERVA.FECHAS, {});
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
                
                const alojamiento = asignarAlojamiento(cantidad);
                
                if (!alojamiento) {
                    await bot.sendMessage(remitente, {
                        text: `⚠️ *Capacidad excedida* (${cantidad} personas)\nSugerencia: Alquila múltiples cabañas`
                    });
                    return;
                }
                
                await bot.sendMessage(remitente, {
                    text: `🏠 *Asignado automáticamente:*\n*${alojamiento}* para ${cantidad} persona(s)`
                });
                
                try {
                    const precioTotal = calcularPrecioTotal(
                        alojamiento, 
                        datos.fechaEntrada, 
                        datos.noches
                    );
                    console.log(`[TRACE] Calculated precioTotal=${precioTotal}`);
                    await bot.sendMessage(remitente, { 
                        text: `💵 *Precio total:* $${precioTotal}\n\n📄 *¿Aceptas las condiciones de uso?* (responde *sí* o *no*)` 
                    });
                    
                    await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, {
                        ...datos,
                        personas: cantidad,
                        alojamiento,
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
                
                const resumen = `\n📋 *NUEVA SOLICITUD DE RESERVA*\n--------------------------------\n• 👤 *Nombre:* ${datos.nombre}\n• 📱 *Teléfono:* ${datos.telefono}\n• 👥 *Personas:* ${datos.personas}\n• 🏠 *Alojamiento:* ${datos.alojamiento}\n• 📅 *Fechas:* ${datos.fechaEntrada} - ${datos.fechaSalida} (${datos.noches} noches)\n• 💰 *Total:* $${datos.precioTotal}\n--------------------------------\n                `;
                
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
