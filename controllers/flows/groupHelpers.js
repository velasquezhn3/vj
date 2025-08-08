const { safeSend, GRUPO_JID } = require('../../utils/utils');
const logger = require('../../config/logger');

// Constantes para mensajes
const RESERVATION_MESSAGES = {
  HEADER: "📝 *NUEVA RESERVA - COMPROBANTE RECIBIDO*",
  DIVIDER: "--------------------------------------",
  ID: id => `🆔 ID: ${id}`,
  NAME: name => `👤 Nombre: ${name}`,
  PHONE: phone => `📞 Teléfono: ${phone}`,
  DATES: (start, end) => `📅 Fechas: ${start} → ${end}`,
  GUESTS: guests => `👥 Personas: ${guests}`,
  ACCOMMODATION: acc => `🏠 Alojamiento: ${acc || 'N/A'}`,
  TOTAL: amount => `💵 Total: Lmps. ${amount}`,
  ACTIONS: id => `✅ Usa /reservado ${id} para confirmar\n❌ Usa /cancelar ${id} para rechazar`
};

// Función para obtener valores seguros de la reserva
const getSafeReservationValue = (reserva, ...fields) => {
  for (const field of fields) {
    if (reserva[field] !== undefined && reserva[field] !== null) {
      return reserva[field];
    }
  }
  return 'N/A';
};

// Función principal mejorada
async function enviarReservaAlGrupo(bot, reserva) {
  try {
    if (!reserva) {
      throw new Error('Reserva no definida');
    }

    // Obtener valores con manejo seguro de nulos/undefined
    const reservationId = getSafeReservationValue(reserva, 'reservation_id', '_id');
    const nombre = getSafeReservationValue(reserva, 'nombre', 'name');
    const telefono = getSafeReservationValue(reserva, 'telefono', 'phone');
    const fechaEntrada = getSafeReservationValue(reserva, 'fechaEntrada', 'start_date');
    const fechaSalida = getSafeReservationValue(reserva, 'fechaSalida', 'end_date');
    const personas = getSafeReservationValue(reserva, 'personas', 'guests');
    const precioTotal = getSafeReservationValue(reserva, 'precioTotal', 'total_price');
    
    // Manejo especial para alojamiento (puede ser objeto o string)
    let alojamiento = 'N/A';
    if (reserva.alojamiento) {
      alojamiento = typeof reserva.alojamiento === 'object' 
        ? reserva.alojamiento.nombre || 'N/A' 
        : reserva.alojamiento;
    }

    // Construir mensaje de forma más limpia
    const messageParts = [
      RESERVATION_MESSAGES.HEADER,
      RESERVATION_MESSAGES.DIVIDER,
      RESERVATION_MESSAGES.ID(reservationId),
      RESERVATION_MESSAGES.NAME(nombre),
      RESERVATION_MESSAGES.PHONE(telefono),
      RESERVATION_MESSAGES.DATES(fechaEntrada, fechaSalida),
      RESERVATION_MESSAGES.GUESTS(personas),
      RESERVATION_MESSAGES.ACCOMMODATION(alojamiento),
      RESERVATION_MESSAGES.TOTAL(precioTotal),
      RESERVATION_MESSAGES.DIVIDER,
      RESERVATION_MESSAGES.ACTIONS(reservationId)
    ];

    const resumen = messageParts.join('\n');

    await safeSend(bot, GRUPO_JID, resumen);
    logger.info(`Resumen de reserva enviado al grupo para ID: ${reservationId}`);
    
    // SIEMPRE enviar comando /reservado en mensaje separado (para copy/paste fácil)
    await safeSend(bot, GRUPO_JID, `/reservado ${reservationId}`);
    
    /* MENSAJE CON INSTRUCCIONES ELIMINADO por solicitud del usuario
    await safeSend(bot, GRUPO_JID, `🔄 *COMANDO LISTO PARA COPIAR:*\n\n\`/reservado ${reservationId}\`\n\n📋 *Instrucciones:*\n• Copia el comando de arriba\n• Pégalo en el chat para confirmar la reserva\n• O usa /cancelar ${reservationId} para rechazar`);
    */
    
  } catch (error) {
    logger.error('[ERROR] enviarReservaAlGrupo:', {
      error: error.message,
      stack: error.stack,
      reservation: reserva ? reserva._id || reserva.reservation_id : 'undefined'
    });
    
    // Opcional: Notificar al administrador sobre el fallo
    await safeSend(bot, GRUPO_JID, '⚠️ Error al enviar resumen de reserva al grupo');
  }
}

module.exports = {
  enviarReservaAlGrupo
};