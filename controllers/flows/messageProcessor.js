
// Full original content of vj/controllers/flows/messageProcessor.js with deposit receipt forwarding integrated

const { obtenerEstado, establecerEstado } = require('../../services/stateService');
const { handleGreeting } = require('./greetingHandler');
const { handleMenuState } = require('./menuHandler');
const { handleActividadesState } = require('./actividadesHandler');
const { handleReservaState } = require('./reservaFlowHandler');
const { ESTADOS_RESERVA } = require('../reservaConstants');
const { enviarMenuPrincipal } = require('../../services/messagingService');
const logger = require('../../config/logger');
const { reenviarComprobanteAlGrupo, GRUPO_JID } = require('../../utils/utils');
const alojamientosService = require('../../services/alojamientosService');

const { handleGroupCommand } = require('./groupCommandHandlers');
const { extractMessageText } = require('./messageProcessorUtils');
// const { manejarPostReserva, manejarNoReserva, procesarComprobantePostReserva } = require('../../routes/postReservaHandler'); // TEMPORALMENTE COMENTADO

async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
    // Validación básica de remitente
    if (!remitente || remitente.trim() === '') {
        logger.error('Remitente inválido', { mensaje, mensajeObj });
        return;
    }

    // Manejo de mensajes en grupo
    if (remitente === GRUPO_JID) {
        const mensajeTexto = typeof mensaje === 'string' 
            ? mensaje 
            : extractMessageText(mensajeObj);
        
        await handleGroupCommand(bot, remitente, mensajeTexto, mensajeObj);
        return;
    }

    try {
        const mensajeTexto = typeof mensaje === 'string'
            ? mensaje.toLowerCase().trim()
            : extractMessageText(mensajeObj);

        // Manejar saludos primero
        if (await handleGreeting(bot, remitente, mensajeTexto)) {
            return;
        }

        const estadoData = await obtenerEstado(remitente);
        const estado = estadoData.estado;
        const datos = estadoData.datos;
        
        logger.debug(`Procesando estado [${estado}] para ${remitente}`, {
            message: mensajeTexto
        });

        // Log current user state for debugging
        logger.info(`Usuario ${remitente} está en estado: ${estado}`);

        // Log messageObj for debugging
        logger.debug('Mensaje recibido completo:', mensajeObj);

        // Check if message contains image or document to forward as deposit receipt
        const hasImage = mensajeObj?.message?.imageMessage || mensajeObj?.imageMessage;
        const hasDocument = mensajeObj?.message?.documentMessage || mensajeObj?.documentMessage;

        if ((estado === ESTADOS_RESERVA.ESPERANDO_CONFIRMACION || estado === ESTADOS_RESERVA.ESPERANDO_PAGO) && (hasImage || hasDocument)) {
            logger.info(`Estado ${estado} y mensaje con imagen o documento detectado, reenviando comprobante al grupo.`);
            // Forward deposit receipt to group
            const datosCliente = {
                nombre: datos?.guest_name || datos?.nombre || 'Cliente desconocido'
            };
            
            let infoReserva = null;
            if (datos?.reservation_id) {
                infoReserva = `📋 *INFORMACIÓN DE RESERVA*\n\n` +
                             `🆔 ID de reserva: ${datos.reservation_id}\n` +
                             `👤 Huésped: ${datos.guest_name || 'No especificado'}\n` +
                             `📱 Teléfono: ${datos.phone_number || 'No especificado'}`;
            }
            
            await reenviarComprobanteAlGrupo(bot, mensajeObj, datosCliente, infoReserva);

            // Enviar comando /reservado con id de reserva en mensaje aparte
            try {
                let idReserva = null;
                if (datos && (datos.reservation_id || datos._id)) {
                    idReserva = datos.reservation_id || datos._id;
                } else if (datos && datos.telefono) {
                    // Buscar reserva por teléfono
                    const reserva = await alojamientosService.getReservationByPhone(datos.telefono);
                    if (reserva && (reserva.reservation_id || reserva._id)) {
                        idReserva = reserva.reservation_id || reserva._id;
                    }
                }
                if (idReserva) {
                    console.log(`[DEBUG] Enviando comando /reservado ${idReserva}`);
                    await bot.sendMessage(GRUPO_JID, { text: `/reservado ${idReserva}` });
                    console.log(`[DEBUG] Comando /reservado enviado correctamente`);
                }
            } catch (error) {
                console.error(`[ERROR] Error enviando comando /reservado: ${error.message}`);
            }

            return;
        }

        // Router de estados
        const stateHandlers = {
            MENU_PRINCIPAL: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            LISTA_CABAÑAS: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            DETALLE_CABAÑA: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            actividades: () => handleActividadesState(bot, remitente, mensajeTexto),
            // Flujo de reserva
            [ESTADOS_RESERVA.FECHAS]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.CONFIRMAR_FECHAS]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.NOMBRE]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.TELEFONO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.PERSONAS]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ALOJAMIENTO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.CONDICIONES]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ESPERANDO_PAGO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ESPERANDO_CONFIRMACION]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            // Estados post-reserva
            'post_reserva_menu': () => manejarPostReservaMenu(bot, remitente, mensajeTexto, establecerEstado, datos),
            'post_reserva_no_reserva': () => manejarNoReserva(bot, remitente, mensajeTexto, establecerEstado),
            'post_reserva_esperando_comprobante': () => {
                // Verificar si es imagen/documento para procesar comprobante
                const hasImage = mensajeObj?.message?.imageMessage || mensajeObj?.imageMessage;
                const hasDocument = mensajeObj?.message?.documentMessage || mensajeObj?.documentMessage;
                
                if (hasImage || hasDocument) {
                    return procesarComprobantePostReserva(bot, remitente, mensajeObj, establecerEstado, datos);
                } else if (mensajeTexto === 'menu') {
                    return enviarMenuPrincipal(bot, remitente);
                } else {
                    return bot.sendMessage(remitente, {
                        text: '⚠️ Por favor envía una imagen o documento con el comprobante de pago.\n\nEscribe "menu" para cancelar.'
                    });
                }
            },
            'post_reserva_comprobante_enviado': () => {
                if (mensajeTexto === '1') {
                    return manejarPostReserva(bot, remitente, '8', establecerEstado);
                } else if (mensajeTexto === '2' || mensajeTexto === 'menu') {
                    return enviarMenuPrincipal(bot, remitente);
                } else {
                    return bot.sendMessage(remitente, {
                        text: 'Por favor responde con 1, 2 o "menu".'
                    });
                }
            },
            'post_reserva_confirmar_cancelacion': async () => {
                const reserva = datos?.reserva;
                if (mensajeTexto === '1') {
                    // Confirmar cancelación
                    try {
                        const { runQuery } = require('../../db');
                        await runQuery('UPDATE Reservations SET status = ? WHERE reservation_id = ?', ['cancelada', reserva.reservation_id]);
                        
                        await bot.sendMessage(remitente, {
                            text: '✅ *RESERVA CANCELADA*\n\n' +
                                  `📅 Reserva ${reserva.reservation_id} ha sido cancelada exitosamente.\n\n` +
                                  '💰 Si realizaste algún pago, nos pondremos en contacto contigo para coordinar el reembolso según nuestras políticas.\n\n' +
                                  '📞 Cualquier consulta, no dudes en contactarnos.\n\n' +
                                  'Escribe "menu" para volver al menú principal.'
                        });
                        await establecerEstado(remitente, null);
                    } catch (error) {
                        console.error('Error cancelando reserva:', error);
                        await bot.sendMessage(remitente, {
                            text: '❌ Error al cancelar la reserva. Por favor contacta con un agente.\n\nEscribe "menu" para ir al menú principal.'
                        });
                    }
                } else if (mensajeTexto === '2') {
                    // No cancelar
                    await bot.sendMessage(remitente, {
                        text: '✅ *RESERVA MANTENIDA*\n\n' +
                              'Tu reserva se mantiene activa.\n\n' +
                              'Escribe "menu" para volver al menú principal.'
                    });
                    await establecerEstado(remitente, null);
                } else {
                    await bot.sendMessage(remitente, {
                        text: '❌ Opción no válida.\n\nPor favor responde:\n1. Sí, cancelar reserva\n2. No, mantener reserva\n\nEscribe "menu" para ir al menú principal.'
                    });
                }
            }
        };

        const handler = stateHandlers[estado];
        if (handler) {
            await handler();
        } else {
            // Si el estado no es manejado, verificar si es un estado que debe preservarse
            const estadosAPreservar = ['esperando_pago', 'ESPERANDO_PAGO', 'esperando_confirmacion', 'ESPERANDO_CONFIRMACION'];
            
            if (estadosAPreservar.includes(estado)) {
                // Para estados críticos, solo dar una advertencia pero mantener el estado
                logger.warn(`Mensaje no válido en estado crítico: ${estado}`, { userId: remitente });
                await bot.sendMessage(remitente, {
                    text: '⏳ Tu reserva está en proceso. Por favor espera la confirmación del administrador.'
                });
                return; // No cambiar el estado
            } else {
                // Si el estado no es manejado, muestra advertencia y regresa al menú principal
                logger.warn(`Estado no manejado: ${estado}`, { userId: remitente });
                await bot.sendMessage(remitente, {
                    text: '⚠️ Estado no reconocido. Te regreso al menú principal.'
                });
                await establecerEstado(remitente, 'MENU_PRINCIPAL', {});
            }
        }
    } catch (error) {
        logger.error(`Error procesando mensaje de ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente,
            mensaje: mensaje || ''
        });

        try {
            // Verificar si es un estado crítico que no debe resetearse
            const estadoActual = await obtenerEstado(remitente);
            const estadosAPreservar = ['esperando_pago', 'ESPERANDO_PAGO', 'esperando_confirmacion', 'ESPERANDO_CONFIRMACION'];
            
            if (estadosAPreservar.includes(estadoActual.estado)) {
                await bot.sendMessage(remitente, {
                    text: '⚠️ Error temporal. Tu reserva sigue en proceso, no te preocupes.'
                });
                // No resetear el estado
            } else {
                await bot.sendMessage(remitente, {
                    text: '⚠️ Error procesando tu solicitud. Intenta nuevamente.'
                });
                establecerEstado(remitente, 'MENU_PRINCIPAL');
                await enviarMenuPrincipal(bot, remitente);
            }
        } catch (fallbackError) {
            logger.critical(`Error crítico de comunicación: ${fallbackError.message}`, {
                stack: fallbackError.stack,
                userId: remitente
            });
        }
    }
}

// FUNCIONES TEMPORALES PARA POST-RESERVA (hasta resolver problema de exports)

async function manejarPostReservaMenu(bot, remitente, mensaje, establecerEstado, datos) {
    console.log('### FUNCIÓN manejarPostReservaMenu LLAMADA ###');
    console.log('### MENSAJE:', mensaje, '### DATOS:', datos);
    
    const reserva = datos?.reserva;
    if (!reserva) {
        await bot.sendMessage(remitente, {
            text: '❌ Error: No se encontraron datos de reserva.\n\nEscribe "menu" para ir al menú principal.'
        });
        await establecerEstado(remitente, null);
        return;
    }
    
    try {
        switch (mensaje) {
            case '1':
                if (reserva.tipo === 'pendiente') {
                    // Enviar comprobante
                    await bot.sendMessage(remitente, {
                        text: '📎 *ENVIAR COMPROBANTE*\n\n' +
                              'Por favor envía una foto o documento del comprobante de pago.\n\n' +
                              '✅ Formatos aceptados: JPG, PNG, PDF\n' +
                              '📱 Puedes tomar una foto directamente o enviar desde galería\n\n' +
                              'Escribe "menu" para cancelar y volver al menú principal.'
                    });
                    await establecerEstado(remitente, 'post_reserva_esperando_comprobante', { reserva });
                } else {
                    // Información de acceso
                    await bot.sendMessage(remitente, {
                        text: '🔐 *INFORMACIÓN DE ACCESO*\n\n' +
                              `📅 Reserva: ${reserva.reservation_id}\n` +
                              `🏠 Alojamiento: ${reserva.cabin_name || 'Por confirmar'}\n` +
                              `📆 Check-in: ${reserva.check_in_date}\n` +
                              `📆 Check-out: ${reserva.check_out_date}\n\n` +
                              '🗝️ Código de acceso: Se enviará 1 día antes del check-in\n' +
                              '📍 Ubicación exacta: Se proporcionará con el código\n\n' +
                              'Escribe "menu" para volver al menú principal.'
                    });
                }
                break;
                
            case '2':
                // Modificar reserva
                await bot.sendMessage(remitente, {
                    text: '✏️ *MODIFICAR RESERVA*\n\n' +
                          'Para modificar tu reserva, un agente te asistirá.\n\n' +
                          '📞 En breve nos pondremos en contacto contigo.\n' +
                          '⏰ Horario de atención: 9:00 AM - 6:00 PM\n\n' +
                          'Escribe "menu" para volver al menú principal.'
                });
                await establecerEstado(remitente, 'esperando_agente');
                break;
                
            case '3':
                // Cancelar reserva
                await bot.sendMessage(remitente, {
                    text: '❌ *CANCELAR RESERVA*\n\n' +
                          '⚠️ ¿Estás seguro que deseas cancelar tu reserva?\n\n' +
                          `📅 Reserva: ${reserva.reservation_id}\n` +
                          `📆 Fechas: ${reserva.check_in_date} - ${reserva.check_out_date}\n\n` +
                          '1. ✅ Sí, cancelar reserva\n' +
                          '2. ❌ No, mantener reserva\n\n' +
                          'Responde con 1 o 2.\n\nEscribe "menu" para volver al menú principal.'
                });
                await establecerEstado(remitente, 'post_reserva_confirmar_cancelacion', { reserva });
                break;
                
            case '4':
                // Solicitar asistencia
                await bot.sendMessage(remitente, {
                    text: '🆘 *SOLICITAR ASISTENCIA*\n\n' +
                          'Un agente se pondrá en contacto contigo para brindarte asistencia.\n\n' +
                          '📱 Te contactaremos a este mismo número\n' +
                          '⏰ Tiempo estimado de respuesta: 30 minutos\n' +
                          '🕒 Horario: Lunes a Viernes 9:00 AM - 6:00 PM\n\n' +
                          'Escribe "menu" para volver al menú principal.'
                });
                await establecerEstado(remitente, 'esperando_agente');
                break;
                
            default:
                await bot.sendMessage(remitente, {
                    text: '❌ Opción no válida.\n\nPor favor selecciona una opción del 1 al 4.\n\nEscribe "menu" para volver al menú principal.'
                });
                break;
        }
    } catch (error) {
        console.error('Error en manejarPostReservaMenu:', error);
        await bot.sendMessage(remitente, {
            text: 'Lo siento, ocurrió un error. Por favor intenta de nuevo más tarde.\n\nEscribe "menu" para ir al menú principal.'
        });
    }
}

async function manejarNoReserva(bot, remitente, mensaje, establecerEstado) {
    console.log('### FUNCIÓN manejarNoReserva LLAMADA ###');
    
    if (mensaje === '1') {
        await bot.sendMessage(remitente, {
            text: '👥 *CONTACTAR AGENTE*\n\n' +
                  'En un momento un agente se comunicará contigo para asistirte.\n\n' +
                  'Horarios de atención:\n' +
                  '• Lunes a Viernes: 9:00 AM - 6:00 PM\n' +
                  '• Sábados: 10:00 AM - 4:00 PM\n\n' +
                  'Escribe "menu" para volver al menú principal.'
        });
        await establecerEstado(remitente, 'esperando_agente');
    } else if (mensaje === '2') {
        await bot.sendMessage(remitente, {
            text: '🏠 Has vuelto al menú principal.\n\nEscribe "menu" para ver las opciones disponibles.'
        });
        await establecerEstado(remitente, null);
    } else {
        await bot.sendMessage(remitente, {
            text: '❌ Opción no válida.\n\nPor favor responde:\n1. Hablar con un agente\n2. Volver al menú principal\n\nEscribe "menu" para ir al menú principal.'
        });
    }
}

async function procesarComprobantePostReserva(bot, remitente, mensajeObj, establecerEstado, datos) {
    console.log('### FUNCIÓN procesarComprobantePostReserva LLAMADA ###');
    
    try {
        const Reserva = require('../../models/Reserva');
        const reserva = datos?.reserva;
        
        if (!reserva) {
            await bot.sendMessage(remitente, {
                text: '❌ Error: No se encontraron datos de reserva.\n\nEscribe "menu" para ir al menú principal.'
            });
            await establecerEstado(remitente, null);
            return;
        }
        
        // Aquí procesarías el comprobante (imagen/documento)
        // Por ahora simulamos que se procesa correctamente
        
        // Actualizar la reserva para indicar que se recibió el comprobante
        // PERO MANTENER EL ESTADO EN 'pendiente' (como corregimos antes)
        await Reserva.updateComprobante(reserva.reservation_id, 'comprobante_recibido_via_post_reserva');
        
        // Reenviar al grupo de administradores
        const datosCliente = {
            nombre: reserva.guest_name || 'Cliente desconocido'
        };
        
        const infoReserva = `📋 *INFORMACIÓN DE RESERVA*\n\n` +
                           `🆔 ID de reserva: ${reserva.reservation_id}\n` +
                           `👤 Huésped: ${reserva.guest_name}\n` +
                           `📅 Check-in: ${reserva.check_in_date}\n` +
                           `📅 Check-out: ${reserva.check_out_date}\n` +
                           `📱 Teléfono: ${reserva.phone_number}\n` +
                           `📋 Estado: ${reserva.status}`;
        
        await reenviarComprobanteAlGrupo(bot, mensajeObj, datosCliente, infoReserva);
        
        await bot.sendMessage(remitente, {
            text: '✅ *COMPROBANTE RECIBIDO*\n\n' +
                  '📎 Hemos recibido tu comprobante de pago.\n\n' +
                  '⏳ Tu reserva está siendo procesada por nuestro equipo.\n' +
                  'Te notificaremos cuando sea confirmada.\n\n' +
                  '📱 Puedes consultar el estado escribiendo "menu" y seleccionando la opción 8.\n\n' +
                  'Tiempo estimado de confirmación: 24-48 horas hábiles.'
        });
        
        await establecerEstado(remitente, null);
        
    } catch (error) {
        console.error('Error procesando comprobante:', error);
        await bot.sendMessage(remitente, {
            text: 'Lo siento, ocurrió un error al procesar tu comprobante. Por favor intenta de nuevo.\n\nEscribe "menu" para ir al menú principal.'
        });
    }
}

module.exports = { procesarMensaje };
