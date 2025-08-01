const logger = require('../../config/logger');
const { safeSend, GRUPO_JID } = require('../../utils/utils');
const alojamientosService = require('../../services/alojamientosService');
const Reserva = require('../../models/Reserva');
const { runQuery } = require('../../db');
const { upsertUser, createReservationWithUser, normalizePhoneNumber, getUserByPhone, getReservationDetailsById } = require('../../services/reservaService');
const { eliminarComprobante } = require('../../services/comprobanteService');
const { obtenerEstado } = require('../../services/stateService');
const { handleConfirmarCommand } = require('./reservationHandlers'); // Importar la función robusta
const fs = require('fs');
const path = require('path');

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

        // Enviar mensaje privado al usuario con detalles de la reserva y mensaje cordial
        const userJid = `${reserva.telefono}@s.whatsapp.net`;
        const mensajePrivado = `
🌟 ¡Hola ${reserva.nombre || 'Cliente'}!

Gracias por confiar en nosotros. 🎉 *¡Tu reserva ha sido confirmada con éxito!*

🔹 **Detalles de tu reserva:**
   - 🗓️ Fechas: Del ${reserva.fechaEntrada || reserva.start_date} al ${reserva.fechaSalida || reserva.end_date}
   - 👥 Personas: ${reserva.personas} ${reserva.personas > 1 ? 'huéspedes' : 'huésped'}
   - 🏡 Alojamiento: ${reserva.alojamiento || 'Se asignará próximamente'}
   - 💰 Precio total: $${reserva.precioTotal || reserva.total_price}
   - 🔑 Código de reserva: ${param}

💼 *Tu itinerario:*
   • Día de llegada: Recepción a partir de las 02:00 PM
   • Día de salida: Habitación disponible hasta las 11:00 AM

📬 ¿Necesitas modificar algo o tienes preguntas? 
   Estamos disponibles en:
   📱 50499905880
   📱 50499705022

✨ ¡Preparamos todo con ilusión para darte una experiencia inolvidable! 
Deseamos que tu estancia sea perfecta en cada detalle.

Con cariño,
El Equipo de Reservas 🏨💖

ℹ️ *Información importante:*
   - Importante 1
   - Importante 2
`;
        await bot.sendMessage(userJid, { text: mensajePrivado.trim() });

    } catch (error) {
        console.error('[ERROR] handleReservadoCommand:', error);
        await bot.sendMessage(remitente, { text: '⚠️ Error procesando el comando /reservado. Intenta nuevamente.' });
    }
}

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

module.exports = {
    handleGroupCommand,
    handleReservadoCommand,
    handleCancelarCommand,
    handleConfirmadoCommand,
    enviarReservaAlGrupo,
    GROUP_COMMANDS
};
