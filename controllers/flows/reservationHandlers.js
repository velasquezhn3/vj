// reservationHandlers.js
const Reserva = require('../../models/Reserva');
const alojamientosService = require('../../services/alojamientosService');
const { createReservationWithUser, getReservationDetailsById, upsertUser, normalizePhoneNumber } = require('../../services/reservaService');
const { obtenerEstado } = require('../../services/stateService');
const { safeSend, GRUPO_JID } = require('../../utils/utils');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger');
const { enviarReservaAlGrupo } = require('./groupHelpers');

// Constantes para estados de reserva
const RESERVATION_STATUS = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmado'
};

// Constantes para mensajes
const MESSAGES = {
  ERRORS: {
    MISSING_ID: '❌ Por favor proporciona el ID de la reserva. Uso: /reservado [ID]',
    RESERVATION_NOT_FOUND: id => `❌ No se encontró reserva con ID ${id}`,
    INVALID_STATUS: id => `⚠️ La reserva #${id} no está en estado pendiente.`,
    UPDATE_ERROR: '⚠️ Error al actualizar el estado de la reserva. Intenta nuevamente.',
    PROCESSING_ERROR: '⚠️ Error procesando el comando. Intenta nuevamente.',
    USER_NOT_FOUND: '❌ No se pudo determinar el número de teléfono del usuario',
    RESERVATION_SAVE_ERROR: '⚠️ Error al guardar la reserva. Por favor intenta nuevamente.'
  },
  SUCCESS: {
    RESERVATION_CONFIRMED: id => `✅ Reserva #${id} confirmada exitosamente.`,
    RESERVATION_UPDATED: id => `✅ Reserva #${id} actualizada a estado pendiente.`,
    RESERVATION_SAVED: '✅ Reserva guardada exitosamente con estado pendiente.'
  }
};

// Helper functions
async function loadCabinsData() {
  const cabinsDataPath = path.join(__dirname, '../../data/cabañas.json');
  try {
    const cabinsJson = fs.readFileSync(cabinsDataPath, 'utf-8');
    return JSON.parse(cabinsJson);
  } catch (error) {
    logger.error('[ERROR] Failed to load cabins data:', error);
    throw new Error('Failed to load cabins data');
  }
}

function generateConfirmationMessage(reserva, reservationId) {
  return `🌟 ¡Hola ${reserva.nombre || 'Cliente'}!\n\n` +
    `Gracias por confiar en nosotros. 🎉 *¡Tu reserva ha sido confirmada con éxito!*\n\n` +
    `🔹 **Detalles de tu reserva:**\n` +
    `   - 🗓️ Fechas: Del ${reserva.fechaEntrada || reserva.start_date} al ${reserva.fechaSalida || reserva.end_date}\n` +
    `   - 👥 Personas: ${reserva.personas} ${reserva.personas > 1 ? 'huéspedes' : 'huésped'}\n` +
    `   - 🏡 Alojamiento: ${reserva.alojamiento || 'Se asignará próximamente'}\n` +
    `   - 💰 Precio total: $${reserva.precioTotal || reserva.total_price}\n` +
    `   - 🔑 Código de reserva: ${reservationId}\n\n` +
    `💼 *Tu itinerario:*\n` +
    `   • Día de llegada: Recepción a partir de las 02:00 PM\n` +
    `   • Día de salida: Habitación disponible hasta las 11:00 AM\n\n` +
    `📬 ¿Necesitas modificar algo o tienes preguntas?\n` +
    `   Estamos disponibles en:\n` +
    `   📱 50499905880\n` +
    `   📱 50499705022\n\n` +
    `✨ ¡Preparamos todo con ilusión para darte una experiencia inolvidable!\n` +
    `Deseamos que tu estancia sea perfecta en cada detalle.\n\n` +
    `Con cariño,\n` +
    `El Equipo de Reservas 🏨💖\n\n` +
    `ℹ️ *Información importante:*\n` +
    `   - Importante 1\n` +
    `   - Importante 2`;
}

function generateDepositInstructions(reservation) {
  const depositAmount = Math.ceil(reservation.total * 0.5);
  return `Hola ${reservation.nombre}, tu reserva #${reservation.reservation_id} ha sido guardada con estado pendiente.\n` +
    `⚠️ Tienes 24 horas para depositar el 50% ($${depositAmount}).\n` +
    `Por favor realiza el depósito a la siguiente cuenta:\n` +
    `Banco: Banco Ejemplo\n` +
    `Número de cuenta: 123456789\n` +
    `Titular: Empresa Ejemplo\n` +
    `Una vez realizado el depósito, envía el comprobante aquí.`;
}

// Main handlers
async function handleReservadoCommand(bot, remitente, param) {
  if (!param) {
    await safeSend(bot, remitente, MESSAGES.ERRORS.MISSING_ID);
    return;
  }

  try {
    const reserva = await getReservationDetailsById(param);
    logger.debug('[DEBUG] Reserva fetched with details:', reserva);
    
    if (!reserva) {
      await safeSend(bot, remitente, MESSAGES.ERRORS.RESERVATION_NOT_FOUND(param));
      return;
    }

    if (!reserva.status || reserva.status.trim().toLowerCase() !== RESERVATION_STATUS.PENDING) {
      await safeSend(bot, remitente, MESSAGES.ERRORS.INVALID_STATUS(param));
      return;
    }

    const updatedReserva = await Reserva.updateEstado(param, RESERVATION_STATUS.CONFIRMED);
    if (!updatedReserva) {
      await safeSend(bot, remitente, MESSAGES.ERRORS.UPDATE_ERROR);
      return;
    }

    await safeSend(bot, remitente, MESSAGES.SUCCESS.RESERVATION_CONFIRMED(param));

    // Enviar notificaciones
    await enviarReservaAlGrupo(bot, reserva);
    
    const userJid = reserva.telefono + '@s.whatsapp.net';
    const mensajePrivado = generateConfirmationMessage(reserva, param);
    await safeSend(bot, userJid, mensajePrivado.trim());

  } catch (error) {
    logger.error('[ERROR] handleReservadoCommand:', error);
    await safeSend(bot, remitente, MESSAGES.ERRORS.PROCESSING_ERROR);
  }
}

async function handleConfirmarCommand(bot, remitente, param, mensajeObj) {
  try {
    logger.info('Comando /confirmar recibido con parámetro:', param || 'ninguno');

    let userId;
    if (remitente.endsWith('@g.us')) {
      userId = param ? param.replace(/@s\.whatsapp\.net$/, '') : undefined;
    } else {
      userId = param;
    }

    if (!userId) {
      throw new Error(MESSAGES.ERRORS.USER_NOT_FOUND);
    }

    userId = normalizePhoneNumber(userId);

    logger.info('Normalized userId:', userId);

    const latestState = obtenerEstado(userId + '@s.whatsapp.net');
    const datos = latestState?.datos || {};
    let userName = datos.nombre || null;
    let totalPrice = datos.precioTotal || 0;
    let fechaEntrada = datos.fechaEntrada || null;
    let fechaSalida = datos.fechaSalida || null;
    let alojamiento = datos.alojamiento || null;
    let personas = datos.personas || null;

    // Validaciones
    if (typeof userName !== 'string' || userName.trim() === '') userName = null;
    if (typeof totalPrice !== 'number' || totalPrice < 0) totalPrice = 0;

    // Guardar usuario si tiene nombre
    if (userName) {
      try {
        const upsertResult = await upsertUser(userId, userName);
        if (!upsertResult.success) {
          throw new Error('Error al guardar el nombre de usuario');
        }
      } catch (err) {
        logger.error('Error in upsertUser:', err);
        throw err;
      }
    }

    // Crear nueva reserva
    let cabins;
    try {
      cabins = await loadCabinsData();
    } catch (err) {
      logger.error('Error loading cabins data:', err);
      throw err;
    }

    let cabinId = null;
    
    if (alojamiento) {
      const cabinMatch = cabins.find(c => c.nombre === alojamiento || c.name === alojamiento);
      if (cabinMatch) {
        cabinId = cabinMatch.id || cabinMatch.cabin_id;
      }
    }
    
    if (!cabinId && cabins.length > 0) {
      cabinId = cabins[0].id || cabins[0].cabin_id;
    }

    const reservaData = {
      start_date: fechaEntrada || new Date().toISOString().split('T')[0],
      end_date: fechaSalida || new Date().toISOString().split('T')[0],
      status: RESERVATION_STATUS.PENDING,
      total_price: totalPrice,
      personas: personas
    };

    logger.info('Creating reservation with data:', reservaData);

    let result;
    try {
      result = await createReservationWithUser(userId, reservaData, cabinId);
      logger.info('createReservationWithUser result:', result);
    } catch (err) {
      logger.error('Error in createReservationWithUser:', err);
      throw err;
    }

    if (!result.success) {
      throw new Error(result.error || MESSAGES.ERRORS.RESERVATION_SAVE_ERROR);
    }

    const reservationId = result.reservationId;
    logger.info('New reservation ID received:', reservationId);
    let reserva;
    try {
      reserva = await getReservationDetailsById(reservationId);
    } catch (err) {
      logger.error('Error fetching reservation details:', err);
      throw err;
    }
    const userJid = normalizePhoneNumber(userId) + '@s.whatsapp.net';

    // Notificar al grupo
    try {
      await safeSend(bot, GRUPO_JID, {
        text: `${MESSAGES.SUCCESS.RESERVATION_SAVED} para el teléfono ${normalizePhoneNumber(userId)}\nID de reserva: ${reservationId}`
      });
    } catch (err) {
      logger.error('Error sending message to group:', err);
      throw err;
    }

    // Instrucciones de depósito
    const depositInstructions = 'Su reserva fue aprobada. Tiene 24 horas para enviar el comprobante de transferencia a los siguientes bancos:\n' +
      '- Ficohsa\n' +
      '- BAC\n' +
      '- Occidente\n' +
      '- Atlántida\n' +
      'Puedes enviar la foto de la reserva en este chat o más adelante, seleccionando la opción 8: Ayuda post-reserva.';

    try {
      await safeSend(bot, userJid, { text: depositInstructions });
      await safeSend(bot, remitente, { text: 'Mensaje de prueba para verificar conectividad.' });
    } catch (err) {
      logger.error('Error sending messages to user:', err);
      throw err;
    }

  } catch (error) {
    logger.error('Error en handleConfirmarCommand:', error);
    await safeSend(bot, remitente, MESSAGES.ERRORS.PROCESSING_ERROR);
  }
}

async function handleConfirmadoCommand(bot, remitente, telefono, mensajeObj) {
  const userId = mensajeObj?.key?.remoteJid?.split('@')[0];

  if (!userId) {
    await safeSend(bot, remitente, MESSAGES.ERRORS.USER_NOT_FOUND);
    return;
  }

  try {
    const reservation = await alojamientosService.getReservationByPhoneAndStatus(userId, RESERVATION_STATUS.PENDING);
    if (!reservation) {
      await safeSend(bot, remitente, `❌ No se encontró reserva pendiente para el teléfono ${userId}`);
      return;
    }

    const success = await alojamientosService.updateReservationStatus(reservation.reservation_id, RESERVATION_STATUS.PENDING);
    if (!success) {
      await safeSend(bot, remitente, MESSAGES.ERRORS.UPDATE_ERROR);
      return;
    }

    await safeSend(bot, remitente, MESSAGES.SUCCESS.RESERVATION_UPDATED(reservation.reservation_id));

    const userJid = userId + '@s.whatsapp.net';
    const depositMessage = generateDepositInstructions(reservation);
    await safeSend(bot, userJid, { text: depositMessage });

  } catch (error) {
    logger.error('Error en handleConfirmadoCommand:', error);
    await safeSend(bot, remitente, MESSAGES.ERRORS.PROCESSING_ERROR);
  }
}

module.exports = {
  handleReservadoCommand,
  handleConfirmarCommand,
  handleConfirmadoCommand
};
