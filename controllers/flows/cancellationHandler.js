const alojamientosService = require('../../services/alojamientosService');
const { eliminarComprobante } = require('../../services/comprobanteService');
const { safeSend, GRUPO_JID } = require('../../utils/utils');
const logger = require('../../config/logger');

async function handleCancelarCommand(bot, remitente, telefono) {
    if (!telefono) {
        await bot.sendMessage(remitente, { text: '❌ Por favor proporciona un número de teléfono. Uso: /cancelar [telefono]' });
        return;
    }

    const reservation = await alojamientosService.getReservationByPhoneAndStatus(telefono, 'comprobante_recibido');
    if (!reservation) {
        await bot.sendMessage(remitente, { text: '❌ No se encontró reserva con comprobante para el teléfono ' + telefono });
        return;
    }

    try {
        await eliminarComprobante(reservation.reservation_id);

        const userJid = telefono + '@s.whatsapp.net';
        await bot.sendMessage(userJid, { 
            text: '❌ Tu comprobante fue rechazado. Por favor envía un comprobante válido para continuar con la reserva.' 
        });

        await bot.sendMessage(GRUPO_JID, { 
            text: '❌ Comprobante rechazado para la reserva #' + reservation.reservation_id + ' del teléfono ' + telefono + '. Se solicitó comprobante válido.' 
        });

        await bot.sendMessage(remitente, { 
            text: '✅ Comprobante eliminado y estado actualizado a cancelada para la reserva #' + reservation.reservation_id + '.' 
        });
    } catch (error) {
        logger.error('Error en handleCancelarCommand: ' + error.message, { error });
        await bot.sendMessage(remitente, { text: '⚠️ Error al procesar la cancelación. Intenta nuevamente.' });
    }
}

module.exports = {
    handleCancelarCommand
};
