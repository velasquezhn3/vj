
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
const { sendMessageWithDelay } = require('../../utils/messageDelayUtils');
// const { manejarPostReserva, manejarNoReserva, procesarComprobantePostReserva } = require('../../routes/postReservaHandler'); // TEMPORALMENTE COMENTADO

/**
 * DEPRECATED: Usar sendMessageWithDelay de messageDelayUtils en su lugar
 * Genera un delay aleatorio entre 4 y 15 segundos para simular respuesta humana
 * y evitar bloqueos por envío masivo
 * @returns {Promise} Promise que se resuelve después del delay
 */
async function randomDelay() {
    const minDelay = 4000; // 4 segundos
    const maxDelay = 15000; // 15 segundos
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    
    logger.info(`⏳ Aplicando delay aleatorio de ${(delay/1000).toFixed(1)} segundos para evitar bloqueos`);
    
    return new Promise(resolve => setTimeout(resolve, delay));
}

// NOTA: La función sendMessageWithDelay ya está importada de messageDelayUtils
// Esta función local duplicada ha sido eliminada para evitar conflictos

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

        // Verificar si el usuario escribió "menu" - regresar al menú principal en cualquier momento
        if (mensajeTexto === 'menu') {
            await enviarMenuPrincipal(bot, remitente);
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

            // ✅ ENVIAR COMANDO /reservado MEJORADO
            try {
                let idReserva = null;
                
                // 1. Buscar por ID en los datos del estado
                if (datos && (datos.reservation_id || datos._id)) {
                    idReserva = datos.reservation_id || datos._id;
                    console.log(`[DEBUG] ID encontrado en datos del estado: ${idReserva}`);
                } 
                // 2. Buscar por teléfono en los datos del estado
                else if (datos && datos.telefono) {
                    const { normalizePhoneNumber } = require('../../services/reservaService');
                    const phoneNormalized = normalizePhoneNumber(datos.telefono);
                    console.log(`[DEBUG] Buscando reserva reciente para teléfono: ${phoneNormalized}`);
                    
                    // Buscar la reserva MÁS RECIENTE con estado 'pendiente' del usuario
                    const { runQuery } = require('../../db');
                    const sql = `
                        SELECT r.reservation_id 
                        FROM Reservations r
                        JOIN Users u ON r.user_id = u.user_id
                        WHERE u.phone_number = ? 
                        AND r.status = 'pendiente'
                        ORDER BY r.created_at DESC
                        LIMIT 1
                    `;
                    const rows = await runQuery(sql, [phoneNormalized]);
                    
                    if (rows && rows.length > 0) {
                        idReserva = rows[0].reservation_id;
                        console.log(`[DEBUG] ID encontrado por teléfono: ${idReserva}`);
                    } else {
                        console.log(`[DEBUG] No se encontró reserva pendiente para ${phoneNormalized}`);
                    }
                }
                // 3. Buscar por el número del remitente directamente
                else {
                    const { normalizePhoneNumber } = require('../../services/reservaService');
                    const phoneFromSender = normalizePhoneNumber(remitente.replace('@s.whatsapp.net', ''));
                    console.log(`[DEBUG] Buscando reserva reciente para remitente: ${phoneFromSender}`);
                    
                    const { runQuery } = require('../../db');
                    const sql = `
                        SELECT r.reservation_id 
                        FROM Reservations r
                        JOIN Users u ON r.user_id = u.user_id
                        WHERE u.phone_number = ? 
                        AND r.status = 'pendiente'
                        ORDER BY r.created_at DESC
                        LIMIT 1
                    `;
                    const rows = await runQuery(sql, [phoneFromSender]);
                    
                    if (rows && rows.length > 0) {
                        idReserva = rows[0].reservation_id;
                        console.log(`[DEBUG] ID encontrado por remitente: ${idReserva}`);
                    } else {
                        console.log(`[DEBUG] No se encontró reserva pendiente para remitente ${phoneFromSender}`);
                    }
                }
                
                // ✅ Enviar SOLO el comando /reservado sin texto adicional
                if (idReserva) {
                    console.log(`[DEBUG] Enviando comando /reservado ${idReserva} al grupo`);
                    await bot.sendMessage(GRUPO_JID, { text: `/reservado ${idReserva}` });
                    console.log(`[DEBUG] ✅ Comando /reservado ${idReserva} enviado exitosamente`);
                } else {
                    console.log(`[ERROR] No se pudo determinar el ID de la reserva`);
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
            actividades: () => handleActividadesState(bot, remitente, mensajeTexto, establecerEstado),
            post_actividad: () => handlePostActividadState(bot, remitente, mensajeTexto, establecerEstado),
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
                    return sendMessageWithDelay(bot, remitente, {
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
                    return sendMessageWithDelay(bot, remitente, {
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
                        
                        await sendMessageWithDelay(bot, remitente, {
                            text: '✅ *RESERVA CANCELADA*\n\n' +
                                  `📅 Reserva ${reserva.reservation_id} ha sido cancelada exitosamente.\n\n` +
                                  '💰 Si realizaste algún pago, nos pondremos en contacto contigo para coordinar el reembolso según nuestras políticas.\n\n' +
                                  '📞 Cualquier consulta, no dudes en contactarnos.\n\n' +
                                  'Escribe "menu" para volver al menú principal.'
                        });
                        await establecerEstado(remitente, null);
                    } catch (error) {
                        console.error('Error cancelando reserva:', error);
                        await sendMessageWithDelay(bot, remitente, {
                            text: '❌ Error al cancelar la reserva. Por favor contacta con un agente.\n\nEscribe "menu" para ir al menú principal.'
                        });
                    }
                } else if (mensajeTexto === '2') {
                    // No cancelar
                    await sendMessageWithDelay(bot, remitente, {
                        text: '✅ *RESERVA MANTENIDA*\n\n' +
                              'Tu reserva se mantiene activa.\n\n' +
                              'Escribe "menu" para volver al menú principal.'
                    });
                    await establecerEstado(remitente, null);
                } else {
                    await sendMessageWithDelay(bot, remitente, {
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
                await sendMessageWithDelay(bot, remitente, {
                    text: '⏳ Tu reserva está en proceso. Por favor espera la confirmación del administrador.'
                });
                return; // No cambiar el estado
            } else {
                // Si el estado no es manejado, muestra advertencia y regresa al menú principal
                logger.warn(`Estado no manejado: ${estado}`, { userId: remitente });
                await sendMessageWithDelay(bot, remitente, {
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
                await sendMessageWithDelay(bot, remitente, {
                    text: '⚠️ Error temporal. Tu reserva sigue en proceso, no te preocupes.'
                });
                // No resetear el estado
            } else {
                await sendMessageWithDelay(bot, remitente, {
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
        await sendMessageWithDelay(bot, remitente, {
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
                    await sendMessageWithDelay(bot, remitente, {
                        text: '📎 *ENVIAR COMPROBANTE*\n\n' +
                              'Por favor envía una foto o documento del comprobante de pago.\n\n' +
                              '✅ Formatos aceptados: JPG, PNG, PDF\n' +
                              '📱 Puedes tomar una foto directamente o enviar desde galería\n\n' +
                              'Escribe "menu" para cancelar y volver al menú principal.'
                    });
                    await establecerEstado(remitente, 'post_reserva_esperando_comprobante', { reserva });
                } else {
                    // Información de acceso
                    await sendMessageWithDelay(bot, remitente, {
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
                await sendMessageWithDelay(bot, remitente, {
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
                await sendMessageWithDelay(bot, remitente, {
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
                await sendMessageWithDelay(bot, remitente, {
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
                await sendMessageWithDelay(bot, remitente, {
                    text: '❌ Opción no válida.\n\nPor favor selecciona una opción del 1 al 4.\n\nEscribe "menu" para volver al menú principal.'
                });
                break;
        }
    } catch (error) {
        console.error('Error en manejarPostReservaMenu:', error);
        await sendMessageWithDelay(bot, remitente, {
            text: 'Lo siento, ocurrió un error. Por favor intenta de nuevo más tarde.\n\nEscribe "menu" para ir al menú principal.'
        });
    }
}

async function manejarNoReserva(bot, remitente, mensaje, establecerEstado) {
    console.log('### FUNCIÓN manejarNoReserva LLAMADA ###');
    
    if (mensaje === '1') {
        await sendMessageWithDelay(bot, remitente, {
            text: '👥 *CONTACTAR AGENTE*\n\n' +
                  'En un momento un agente se comunicará contigo para asistirte.\n\n' +
                  'Horarios de atención:\n' +
                  '• Lunes a Viernes: 9:00 AM - 6:00 PM\n' +
                  '• Sábados: 10:00 AM - 4:00 PM\n\n' +
                  'Escribe "menu" para volver al menú principal.'
        });
        await establecerEstado(remitente, 'esperando_agente');
    } else if (mensaje === '2') {
        await sendMessageWithDelay(bot, remitente, {
            text: '🏠 Has vuelto al menú principal.\n\nEscribe "menu" para ver las opciones disponibles.'
        });
        await establecerEstado(remitente, null);
    } else {
        await sendMessageWithDelay(bot, remitente, {
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
            await sendMessageWithDelay(bot, remitente, {
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
        
        // ✅ ENVIAR COMANDO /reservado también en post-reserva
        try {
            if (reserva && reserva.reservation_id) {
                console.log(`[DEBUG] Enviando comando /reservado ${reserva.reservation_id} desde post-reserva`);
                await bot.sendMessage(GRUPO_JID, { text: `/reservado ${reserva.reservation_id}` });
                console.log(`[DEBUG] ✅ Comando /reservado ${reserva.reservation_id} enviado exitosamente desde post-reserva`);
            } else {
                console.log(`[ERROR] No se encontró reservation_id en post-reserva`);
            }
        } catch (error) {
            console.error(`[ERROR] Error enviando comando /reservado en post-reserva: ${error.message}`);
        }
        
        await sendMessageWithDelay(bot, remitente, {
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
        await sendMessageWithDelay(bot, remitente, {
            text: 'Lo siento, ocurrió un error al procesar tu comprobante. Por favor intenta de nuevo.\n\nEscribe "menu" para ir al menú principal.'
        });
    }
}

// Manejar estado post-actividad (después de mostrar una actividad)
async function handlePostActividadState(bot, remitente, mensajeTexto, establecerEstado) {
    const mensaje = mensajeTexto.trim();
    
    switch (mensaje) {
        case '1':
            // Ver más actividades - volver al menú de actividades
            const { generateDynamicMenu } = require('../mainMenuHandler');
            const menuActividades = await generateDynamicMenu('actividades');
            await sendMessageWithDelay(bot, remitente, { text: menuActividades });
            await establecerEstado(remitente, 'actividades');
            break;
            
        case '0':
            // Menú principal
            const { handleMainMenu } = require('../mainMenuHandler');
            await handleMainMenu(bot, remitente, 'menu');
            break;
            
        default:
            await sendMessageWithDelay(bot, remitente, {
                text: '⚠️ Opción no válida.\n\n' +
                      '🔹 Escribe *1* para ver más actividades\n' +
                      '🔹 Escribe *0* para ir al menú principal'
            });
            break;
    }
}

module.exports = { procesarMensaje };
