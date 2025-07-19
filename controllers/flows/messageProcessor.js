
// Full original content of vj/controllers/flows/messageProcessor.js with deposit receipt forwarding integrated

const { obtenerEstado, establecerEstado } = require('../../services/stateService');
const { handleGreeting } = require('./greetingHandler');
const { handleMenuState } = require('./menuHandler');
const { handleActividadesState } = require('./actividadesHandler');
const { handleReservaState } = require('./reservaFlowHandler');
const { ESTADOS_RESERVA } = require('../reservaConstants');
const { enviarMenuPrincipal } = require('../../services/messagingService');
const logger = require('../../config/logger');
const { reenviarComprobanteAlGrupo, GRUPO_JID, enviarAlGrupo, safeSend } = require('../../utils/utils');
const alojamientosService = require('../../services/alojamientosService');
const Reserva = require('../../models/Reserva');
const { runQuery } = require('../../db');

// Helper function to send detailed reservation info to group
async function enviarReservaAlGrupo(bot, reserva) {
    try {
        const resumen = `
📝 *NUEVA RESERVA - COMPROBANTE RECIBIDO*
--------------------------------------
🆔 ID: ${reserva.reservation_id || reserva._id}
👤 Nombre: ${reserva.nombre}
📞 Teléfono: ${reserva.telefono}
📅 Fechas: ${reserva.fechaEntrada || reserva.start_date} → ${reserva.fechaSalida || reserva.end_date}
👥 Personas: ${reserva.personas}
🏠 Alojamiento: ${reserva.alojamiento || (reserva.alojamiento && reserva.alojamiento.nombre) || 'N/A'}
💵 Total: $${reserva.precioTotal || reserva.total_price}
--------------------------------------
✅ Usa /reservado ${reserva.reservation_id || reserva._id} para confirmar
❌ Usa /cancelar ${reserva.reservation_id || reserva._id} para rechazar
        `;
        await safeSend(bot, GRUPO_JID, resumen);
    } catch (error) {
        console.error('[ERROR] enviarReservaAlGrupo:', error);
    }
}

// Comandos válidos para grupos
const GROUP_COMMANDS = {
    CONFIRMAR: '/confirmar',
    RESERVADO: '/reservado',
    CANCELAR: '/cancelar'
};

// Manejadores específicos para comandos de grupo
const groupCommandHandlers = {
    [GROUP_COMMANDS.CONFIRMAR]: handleConfirmarCommand,
    [GROUP_COMMANDS.RESERVADO]: handleReservadoCommand,
    [GROUP_COMMANDS.CANCELAR]: handleCancelarCommand
};

async function handleGroupCommand(bot, remitente, mensajeTexto, mensajeObj) {
    const [command, param] = mensajeTexto.split(' ');

    if (!(command in groupCommandHandlers)) {
        logger.warn(`Comando no válido en grupo: ${mensajeTexto}`);
        await bot.sendMessage(remitente, { 
            text: '❌ Comando no válido. Usa /confirmar, /confirmado, /reservado, /reservar o /cancelar.' 
        });
        return;
    }

    try {
        // Pass mensajeObj to handlers to allow extracting remoteJid
        await groupCommandHandlers[command](bot, remitente, param, mensajeObj);
    } catch (error) {
        logger.error(`Error procesando comando ${command}: ${error.message}`, { error });
        await bot.sendMessage(remitente, { 
            text: '⚠️ Error procesando el comando. Por favor intenta nuevamente.' 
        });
    }
}

const fs = require('fs');
const path = require('path');

const { createReservationWithUser, normalizePhoneNumber } = require('../../services/reservaService');

async function handleConfirmarCommand(bot, remitente, param, mensajeObj) {
    try {
        logger.info(`Comando /confirmar recibido con parámetro: ${param || 'ninguno'}`);

        // Determinar userId: si el comando viene de un grupo, extraer de param limpiando sufijo @s.whatsapp.net, si no usar param tal cual
        let userId;
        if (remitente.endsWith('@g.us')) {
            userId = param ? param.replace(/@s\.whatsapp\.net$/, '') : undefined;
        } else {
            userId = param;
        }

        if (!userId) {
            throw new Error('No se pudo determinar el número de teléfono del usuario');
        }

        // Normalize phone number before querying
        userId = normalizePhoneNumber(userId);

        // Buscar reserva existente por teléfono
        const existingReservation = await alojamientosService.getReservationByPhone(userId);

        if (existingReservation) {
            // Actualizar estado a pendiente
            const success = await alojamientosService.updateReservationStatus(existingReservation.reservation_id, 'pendiente');
            if (!success) {
                throw new Error('Error al actualizar el estado de la reserva existente');
            }
            const userJid = `${userId}@s.whatsapp.net`;
            await bot.sendMessage(remitente, { text: `✅ Reserva #${existingReservation.reservation_id} actualizada a estado pendiente.` });
            await bot.sendMessage(userJid, { text: `✅ Tu reserva #${existingReservation.reservation_id} ha sido actualizada a estado pendiente.` });
            return;
        }

        // Si no existe reserva, crear nueva
        const cabinsDataPath = path.join(__dirname, '../../data/cabañas.json');
        const cabinsJson = fs.readFileSync(cabinsDataPath, 'utf-8');
        const cabins = JSON.parse(cabinsJson);
        const cabinId = cabins[0].id;

        const reservaData = {
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            status: 'pendiente',
            total_price: 0
        };

        const result = await createReservationWithUser(userId, reservaData, cabinId);

        if (!result.success) {
            throw new Error(result.error || 'Error al guardar la reserva');
        }

        const reservationId = result.reservationId;
        const userJid = `${normalizePhoneNumber(userId)}@s.whatsapp.net`;
        const comandoReservado = `/reservado ${reservationId}`;

        await bot.sendMessage(GRUPO_JID, {
            text: `✅ Reserva guardada exitosamente con estado pendiente para el teléfono ${normalizePhoneNumber(userId)}\nID de reserva: ${reservationId}\n\nUsa este comando para confirmar la reserva:\n${comandoReservado}`
        });

        await bot.sendMessage(userJid, {
            text: `✅ Reserva guardada exitosamente con estado pendiente para el teléfono ${normalizePhoneNumber(userId)}\nID de reserva: ${reservationId}\n\nPara confirmar la reserva, el administrador debe usar este comando:\n${comandoReservado}`
        });

        const depositInstructions = `Su reserva fue aprobada. Tiene 24 horas para enviar el comprobante de transferencia a los siguientes bancos:
- Ficohsa
- BAC
- Occidente
- Atlántida
Puedes enviar la foto de la reserva en este chat o más adelante, seleccionando la opción 8: Ayuda post-reserva.`;

        await bot.sendMessage(userJid, { text: depositInstructions });

        await bot.sendMessage(remitente, { text: 'Mensaje de prueba para verificar conectividad.' });

    } catch (error) {
        logger.error(`Error en handleConfirmarCommand: ${error.message}`, { error });
        await bot.sendMessage(remitente, { text: '⚠️ Error procesando la reserva. Por favor intenta nuevamente.' });
    }
}


const { eliminarComprobante, actualizarEstado } = require('../../services/comprobanteService');

async function handleCancelarCommand(bot, remitente, telefono) {
    if (!telefono) {
        await bot.sendMessage(remitente, { text: '❌ Por favor proporciona un número de teléfono. Uso: /cancelar [telefono]' });
        return;
    }

    // Buscar reserva pendiente o con comprobante por teléfono
    const reservation = await alojamientosService.getReservationByPhoneAndStatus(telefono, 'comprobante_recibido');
    if (!reservation) {
        await bot.sendMessage(remitente, { text: `❌ No se encontró reserva con comprobante para el teléfono ${telefono}` });
        return;
    }

    try {
        // Eliminar comprobante y actualizar estado a cancelada
        await eliminarComprobante(reservation.reservation_id);

        // Notificar al usuario para enviar comprobante válido
        const userJid = `${telefono}@s.whatsapp.net`;
        await bot.sendMessage(userJid, { 
            text: '❌ Tu comprobante fue rechazado. Por favor envía un comprobante válido para continuar con la reserva.' 
        });

        // Notificar al grupo
        await bot.sendMessage(GRUPO_JID, { 
            text: `❌ Comprobante rechazado para la reserva #${reservation.reservation_id} del teléfono ${telefono}. Se solicitó comprobante válido.` 
        });

        // Confirmar al remitente que la acción fue realizada
        await bot.sendMessage(remitente, { 
            text: `✅ Comprobante eliminado y estado actualizado a cancelada para la reserva #${reservation.reservation_id}.` 
        });
    } catch (error) {
        logger.error(`Error en handleCancelarCommand: ${error.message}`, { error });
        await bot.sendMessage(remitente, { text: '⚠️ Error al procesar la cancelación. Intenta nuevamente.' });
    }
}

async function handleConfirmadoCommand(bot, remitente, telefono, mensajeObj) {
    // Ignore telefono param, use remoteJid from mensajeObj to get full phone number with country code
    const userId = mensajeObj?.key?.remoteJid?.split('@')[0];

    if (!userId) {
        await bot.sendMessage(remitente, { text: '❌ No se pudo obtener el número de teléfono del usuario.' });
        return;
    }

    // Buscar reserva pendiente por teléfono usando userId con código de país
    const reservation = await alojamientosService.getReservationByPhoneAndStatus(userId, 'pendiente');
    if (!reservation) {
        await bot.sendMessage(remitente, { text: `❌ No se encontró reserva pendiente para el teléfono ${userId}` });
        return;
    }

    // Confirmar reserva (guardar con estado pendiente si no existe)
    const success = await alojamientosService.updateReservationStatus(reservation.reservation_id, 'pendiente');
    if (!success) {
        await bot.sendMessage(remitente, { text: '⚠️ Error al guardar la reserva. Intenta nuevamente.' });
        return;
    }

    await bot.sendMessage(remitente, { text: `✅ Reserva #${reservation.reservation_id} guardada exitosamente con estado pendiente.` });

    // Enviar instrucciones de depósito al usuario
    const depositAmount = Math.ceil(reservation.total * 0.5);
    const depositMessage = 
`Hola ${reservation.nombre}, tu reserva #${reservation.reservation_id} ha sido guardada con estado pendiente.\n
⚠️ Tienes 24 horas para depositar el 50% ($ ${depositAmount}).\n
Por favor realiza el depósito a la siguiente cuenta:\n
Banco: Banco Ejemplo\n
Número de cuenta: 123456789\n
Titular: Empresa Ejemplo\n
Una vez realizado el depósito, envía el comprobante aquí.`;

    const userJid = `${userId}@s.whatsapp.net`;

    try {
        const sent = await bot.sendMessage(userJid, { text: depositMessage });
        logger.info(`Mensaje de instrucciones de depósito enviado a ${userJid}`, { sent });
    } catch (err) {
        logger.error(`Error enviando instrucciones de depósito a ${userJid}: ${err.message}`, { err });
    }
}

async function handleReservadoCommand(bot, remitente, param) {
    if (!param) {
        await bot.sendMessage(remitente, { text: '❌ Por favor proporciona el ID de la reserva. Uso: /reservado [ID]' });
        return;
    }

    try {
        const { getReservationDetailsById } = require('../../services/reservaService');
        const reserva = await getReservationDetailsById(param);
        console.log('[DEBUG] Reserva fetched with details:', reserva);
        if (!reserva) {
            await bot.sendMessage(remitente, { text: `❌ No se encontró reserva con ID ${param}` });
            return;
        }

        if (!reserva.status || reserva.status.trim().toLowerCase() !== 'pendiente') {
            await bot.sendMessage(remitente, { text: `⚠️ La reserva #${param} no está en estado pendiente.` });
            return;
        }

        const updatedReserva = await Reserva.updateEstado(param, 'confirmado');
        if (!updatedReserva) {
            await bot.sendMessage(remitente, { text: '⚠️ Error al actualizar el estado de la reserva. Intenta nuevamente.' });
            return;
        }

        await bot.sendMessage(remitente, { text: `✅ Reserva #${param} confirmada exitosamente.` });

        // Enviar resumen detallado al grupo con full details
        await enviarReservaAlGrupo(bot, reserva);
    } catch (error) {
        console.error('[ERROR] handleReservadoCommand:', error);
        await bot.sendMessage(remitente, { text: '⚠️ Error procesando el comando /reservado. Intenta nuevamente.' });
    }
}

function extractMessageText(mensajeObj) {
    if (!mensajeObj?.message) return '';

    if (mensajeObj.message.conversation) {
        return mensajeObj.message.conversation.toLowerCase().trim();
    }
    
    if (mensajeObj.message.extendedTextMessage?.text) {
        return mensajeObj.message.extendedTextMessage.text.toLowerCase().trim();
    }
    
    return '';
}

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
        
        await handleGroupCommand(bot, remitente, mensajeTexto);
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

        const { estado, datos } = obtenerEstado(remitente);
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
            await reenviarComprobanteAlGrupo(bot, mensajeObj, datos);
            return;
        }

        // Router de estados
        const stateHandlers = {
            MENU_PRINCIPAL: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            LISTA_CABAÑAS: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            DETALLE_CABAÑA: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            actividades: () => handleActividadesState(bot, remitente, mensajeTexto),
            [ESTADOS_RESERVA.FECHAS]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.NOMBRE]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.TELEFONO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.PERSONAS]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ALOJAMIENTO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.CONDICIONES]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ESPERANDO_PAGO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ESPERANDO_CONFIRMACION]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje)
        };

        const handler = stateHandlers[estado];
        if (handler) {
            await handler();
        } else {
            logger.warn(`Estado no manejado: ${estado}`, { userId: remitente });
            await bot.sendMessage(remitente, {
                text: '⚠️ Estado no reconocido. Reiniciando tu sesión...'
            });
            establecerEstado(remitente, 'MENU_PRINCIPAL');
            await enviarMenuPrincipal(bot, remitente);
        }
    } catch (error) {
        logger.error(`Error procesando mensaje de ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente,
            mensaje: mensaje || ''
        });

        try {
            await bot.sendMessage(remitente, {
                text: '⚠️ Error procesando tu solicitud. Intenta nuevamente.'
            });
            establecerEstado(remitente, 'MENU_PRINCIPAL');
            await enviarMenuPrincipal(bot, remitente);
        } catch (fallbackError) {
            logger.critical(`Error crítico de comunicación: ${fallbackError.message}`, {
                stack: fallbackError.stack,
                userId: remitente
            });
        }
    }
}

module.exports = { procesarMensaje };
