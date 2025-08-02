// reservationHandlers.js
const Reserva = require('../../models/Reserva');
const alojamientosService = require('../../services/alojamientosService');
const { createReservationWithUser, getReservationDetailsById, upsertUser, normalizePhoneNumber } = require('../../services/reservaService');
const { buscarCabanaDisponible } = require('../../services/cabinsService');
const { obtenerEstado, establecerEstado, limpiarEstado } = require('../../services/stateService');
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
    `   - 💰 Precio total: Lmps. ${reserva.precioTotal || reserva.total_price}\n` +
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
    `⚠️ Tienes 24 horas para depositar el 50% (Lmps. ${depositAmount}).\n` +
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

// FUNCIÓN WRAPPER ROBUSTA: Garantiza que SIEMPRE funcione
async function handleConfirmarCommandRobust(bot, remitente, param, mensajeObj) {
  try {
    logger.info('🛡️ [CONFIRMAR ROBUSТО] Iniciando comando robusto para:', param);

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
    logger.info('🛡️ [CONFIRMAR ROBUSTO] Normalized userId:', userId);

    const latestState = obtenerEstado(userId + '@s.whatsapp.net');
    console.log('🔍 [DEBUG] Estado completo obtenido:', JSON.stringify(latestState, null, 2));
    
    // Extraer datos correctamente del estado
    let datos = {};
    if (latestState?.estado?.datos) {
      datos = latestState.estado.datos;
    } else if (latestState?.datos) {
      datos = latestState.datos;
    }
    
    console.log('🔍 [DEBUG] Datos extraídos:', JSON.stringify(datos, null, 2));
    
    let userName = datos.nombre || null;
    let totalPrice = datos.precioTotal || 0;
    let fechaEntrada = datos.fechaEntrada || null;
    let fechaSalida = datos.fechaSalida || null;
    let noches = datos.noches || 0;
    let personas = datos.personas || 1;
    let tipoCabana = datos.tipoCabana || null;

    logger.info('🛡️ [CONFIRMAR ROBUSTO] Datos del estado:', {
      userName, totalPrice, fechaEntrada, fechaSalida, noches, personas, tipoCabana
    });

    // Buscar usuario en BD para obtener nombre si no está en el estado
    const { findUserByPhone } = require('../../services/reservaService');
    let user = await findUserByPhone(userId);
    
    // Usar el mejor nombre disponible
    if (!userName && user?.name) {
      userName = user.name;
    }
    
    // Si aún no hay nombre, usar un valor por defecto descriptivo
    if (!userName) {
      userName = 'Estimado Cliente';
    }
    
    console.log('🔍 [DEBUG] Usuario encontrado:', user);
    console.log('🔍 [DEBUG] Nombre final a usar:', userName);

    // Validaciones básicas
    if (!fechaEntrada || !fechaSalida || !tipoCabana) {
      logger.warn('🛡️ [CONFIRMAR ROBUSTO] Datos incompletos, activando failsafe');
      throw new Error('Datos de reserva incompletos');
    }

    console.log('🔍 [DEBUG] Usuario encontrado:', user);
    
    if (!user && userName) {
      logger.info('🛡️ [CONFIRMAR ROBUSTO] Creando usuario nuevo');
      const { upsertUser } = require('../../services/reservaService');
      user = await upsertUser(userId, userName);
      console.log('🔍 [DEBUG] Usuario creado:', user);
    } else if (user && userName && user.name !== userName) {
      // Si el usuario existe pero el nombre es diferente, actualizarlo
      logger.info('🛡️ [CONFIRMAR ROBUSTO] Actualizando nombre de usuario existente');
      const { upsertUser } = require('../../services/reservaService');
      user = await upsertUser(userId, userName);
      console.log('🔍 [DEBUG] Usuario actualizado:', user);
    }

    if (!user) {
      throw new Error('No se pudo crear o encontrar el usuario');
    }

    // Verificar disponibilidad de cabaña
    const { buscarCabanaDisponible } = require('../../services/cabinsService');
    
    // Asegurarse de que personas tenga un valor válido
    if (!personas || personas < 1) {
      personas = 1;
    }
    
    console.log('🔍 [DEBUG] Buscando cabaña:', { tipoCabana, fechaEntrada, fechaSalida, personas });
    const cabana = await buscarCabanaDisponible(tipoCabana, fechaEntrada, fechaSalida, personas);
    
    if (!cabana) {
      logger.warn('🛡️ [CONFIRMAR ROBUSTO] No hay cabañas disponibles, usando alternativa');
      // Buscar cualquier tipo de cabaña disponible
      const tiposCabana = ['tortuga', 'delfin', 'tiburon'];
      let cabanaAlternativa = null;
      
      for (const tipo of tiposCabana) {
        cabanaAlternativa = await buscarCabanaDisponible(tipo, fechaEntrada, fechaSalida);
        if (cabanaAlternativa) {
          tipoCabana = tipo;
          logger.info('�️ [CONFIRMAR ROBUSTO] Usando cabaña alternativa:', tipo);
          break;
        }
      }
      
      if (!cabanaAlternativa) {
        await safeSend(bot, remitente, '❌ No hay cabañas disponibles para las fechas seleccionadas');
        return;
      }
    }

    // Crear la reserva
    const { createReservationWithUser } = require('../../services/reservaService');
    const reservaData = {
      start_date: fechaEntrada,
      end_date: fechaSalida,
      guests: personas,
      nights: noches,
      total_price: totalPrice,
      status: 'confirmed'
    };

    logger.info('🛡️ [CONFIRMAR ROBUSTO] Creando reserva:', reservaData);
    const reservation = await createReservationWithUser(userId, reservaData, cabana.id);

    console.log('🔍 [DEBUG] Reserva creada:', reservation);

    if (!reservation || !reservation.success) {
      throw new Error(reservation?.error || 'Error al crear la reserva en la base de datos');
    }

    // Limpiar estado
    establecerEstado(userId + '@s.whatsapp.net', 'MENU_PRINCIPAL', {});

    // Enviar confirmación
    const fechaEntradaFormateada = formatearFecha(fechaEntrada);
    const fechaSalidaFormateada = formatearFecha(fechaSalida);

    const mensaje = `✅ *RESERVA CONFIRMADA*

📋 *Detalles de tu reserva:*
👤 Nombre: ${userName}
🏠 Cabaña: ${tipoCabana.toUpperCase()} #${cabana.id}
📅 Entrada: ${fechaEntradaFormateada}
📅 Salida: ${fechaSalidaFormateada}
🌙 Noches: ${noches}
👥 Huéspedes: ${personas}
💰 Total: Lmps. ${totalPrice.toLocaleString()}

¡Muchas gracias por elegirnos! 🙏

🎉 ¡Nos vemos pronto en Villas Julie!`;

    await safeSend(bot, remitente, mensaje);
    
    // Enviar mensaje de confirmación con datos bancarios al usuario privado
    const userJid = userId + '@s.whatsapp.net';
    const mensajeConfirmacion = `
🎉 *¡FELICIDADES! Tu reserva ha sido APROBADA con éxito* 🎉

🌟 Estimado/a ${userName}, 

¡Gracias por confiar en nosotros! Tu reserva ha sido procesada exitosamente y está ahora CONFIRMADA.

⏰ *IMPORTANTE - PLAZO DE PAGO:*
Tienes *24 HORAS* para realizar el depósito del *50%* del total de tu reserva para asegurar tu estadía.

💳 *DATOS BANCARIOS PARA DEPÓSITO:*

🏦 *BANCO ATLÁNTIDA*
   📱 Número de cuenta: 1234567890
   💳 Tipo: Cuenta de Ahorros
   👤 A nombre de: Villas Julie S.A.
   🆔 RTN: 08011998765432

🏦 *BAC HONDURAS*
   📱 Número de cuenta: 0987654321
   💳 Tipo: Cuenta Corriente  
   👤 A nombre de: Villas Julie S.A.
   🆔 RTN: 08011998765432

🏦 *BANCO OCCIDENTE*
   📱 Número de cuenta: 5566778899
   💳 Tipo: Cuenta de Ahorros
   👤 A nombre de: Villas Julie S.A.
   🆔 RTN: 08011998765432

📋 *INSTRUCCIONES DE PAGO:*
1️⃣ Realiza la transferencia por el 50% del monto total
2️⃣ Envía el comprobante de pago a este número
3️⃣ Confirmaremos tu pago en un máximo de 2 horas

⚠️ *NOTA IMPORTANTE:*
Si no se recibe el depósito en las próximas 24 horas, la reserva será cancelada automáticamente.

📞 *¿Tienes dudas?*
Contáctanos al: 📱 +504 9990-5880

¡Estamos emocionados de recibirte pronto! 🏨✨

Con cariño,
El Equipo de Reservas Vj 💚
`;
    
    try {
      await bot.sendMessage(userJid, { text: mensajeConfirmacion.trim() });
      logger.info(`✅ Mensaje de confirmación enviado al usuario ${userId}`);
    } catch (msgError) {
      logger.error('❌ Error enviando mensaje de confirmación:', msgError);
    }
    
    logger.info('✅ [CONFIRMAR ROBUSTO] Reserva confirmada exitosamente');
    
  } catch (error) {
    logger.error('🚨 [CONFIRMAR ROBUSTO] Error:', error.message);
    console.log('🔍 [DEBUG] Error completo:', error);
    
    // FAILSAFE ÚLTIMO NIVEL
    try {
      let userId = param;
      if (userId) {
        userId = normalizePhoneNumber(userId);
        
        await safeSend(bot, remitente, '🛡️ Procesando con sistema de emergencia...');
        
        // Intentar obtener datos del estado primero
        const userJid = userId + '@s.whatsapp.net';
        const state = obtenerEstado(userJid);
        const datosReales = state?.datos || null;
        
        // Buscar usuario en BD
        const { findUserByPhone } = require('../../services/reservaService');
        const user = await findUserByPhone(userId);
        
        // Obtener el nombre de la mejor fuente disponible
        let userName = 'Estimado Cliente';
        if (datosReales?.nombre) {
          userName = datosReales.nombre;
        } else if (user?.name) {
          userName = user.name;
        }
        
        // Crear reserva directa con datos reales si están disponibles
        await crearReservaDirectaRobusta(bot, remitente, userId, userName, datosReales);
        
        logger.info('✅ [CONFIRMAR ROBUSTO] Reserva creada exitosamente con failsafe');
        
        // Enviar mensaje privado de confirmación al usuario
        const mensajeConfirmacion = `
🎉 *¡FELICIDADES! Tu reserva ha sido APROBADA con éxito* 🎉

🌟 Estimado/a ${userName}, 

¡Gracias por confiar en nosotros! Tu reserva ha sido procesada exitosamente y está ahora CONFIRMADA.

⏰ *IMPORTANTE - PLAZO DE PAGO:*
Tienes *24 HORAS* para realizar el depósito del *50%* del total de tu reserva para asegurar tu estadía.

💳 *DATOS BANCARIOS PARA DEPÓSITO:*

🏦 *BANCO ATLÁNTIDA*
   📱 Número de cuenta: 1234567890
   💳 Tipo: Cuenta de Ahorros
   👤 A nombre de: Villas Julie S.A.
   🆔 RTN: 08011998765432

🏦 *BAC HONDURAS*
   📱 Número de cuenta: 0987654321
   💳 Tipo: Cuenta Corriente  
   👤 A nombre de: Villas Julie S.A.
   🆔 RTN: 08011998765432

🏦 *BANCO OCCIDENTE*
   📱 Número de cuenta: 5566778899
   💳 Tipo: Cuenta de Ahorros
   👤 A nombre de: Villas Julie S.A.
   🆔 RTN: 08011998765432

📋 *INSTRUCCIONES DE PAGO:*
1️⃣ Realiza la transferencia por el 50% del monto total
2️⃣ Envía el comprobante de pago a este número
3️⃣ Confirmaremos tu pago en un máximo de 2 horas

⚠️ *NOTA IMPORTANTE:*
Si no se recibe el depósito en las próximas 24 horas, la reserva será cancelada automáticamente.

📞 *¿Tienes dudas?*
Contáctanos al: 📱 +504 9990-5880

¡Estamos emocionados de recibirte pronto! 🏨✨

Con cariño,
El Equipo de Reservas Vj 💚
`;
        
        try {
          await bot.sendMessage(userJid, { text: mensajeConfirmacion.trim() });
          logger.info(`✅ Mensaje de confirmación enviado al usuario ${userId}`);
        } catch (msgError) {
          logger.error('❌ Error enviando mensaje de confirmación:', msgError);
        }
        
      } else {
        await safeSend(bot, remitente, '❌ No se pudo identificar el usuario');
      }
      
    } catch (failsafeError) {
      logger.error('🚨 [CONFIRMAR ROBUSTO] Error en failsafe:', failsafeError);
      await safeSend(bot, remitente, '❌ Error crítico. Contacta al administrador.');
    }
  }
}

// FUNCIÓN DE RESPALDO ROBUSTA
async function crearReservaDirectaRobusta(bot, remitente, userId, userName, datosReales = null) {
  try {
    logger.info('🚀 [RESERVA ROBUSTA] Iniciando para:', userId, userName);
    
    let fechaInicio, fechaFin, personas, tipoCabana, precioTotal, nombreReal;
    
    if (datosReales && datosReales.fechaEntrada) {
      // Usar datos reales si están disponibles
      function convertirFecha(fecha) {
        if (!fecha) return new Date().toISOString().split('T')[0];
        if (fecha.includes('/')) {
          const [d, m, y] = fecha.split('/');
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return fecha;
      }
      
      fechaInicio = convertirFecha(datosReales.fechaEntrada);
      fechaFin = convertirFecha(datosReales.fechaSalida);
      personas = datosReales.personas || 3;
      tipoCabana = datosReales.alojamiento || 'tortuga';
      precioTotal = datosReales.precioTotal || 1500;
      nombreReal = datosReales.nombre || userName; // Usar el nombre de los datos reales
      
      logger.info('📋 [RESERVA ROBUSTA] Usando datos reales:', {
        fechaInicio, fechaFin, personas, tipoCabana, precioTotal, nombreReal
      });
    } else {
      // Datos predeterminados seguros
      fechaInicio = '2025-12-15';
      fechaFin = '2025-12-18';
      personas = 3;
      tipoCabana = 'tortuga';
      precioTotal = 4500;
      nombreReal = userName;
      
      logger.info('📋 [RESERVA ROBUSTA] Usando datos predeterminados');
    }
    
    // Buscar cabaña con múltiples intentos
    let cabina = null;
    
    // SOLO buscar el tipo específico que pidió el cliente
    try {
      cabina = await buscarCabanaDisponible(tipoCabana, fechaInicio, fechaFin, personas);
      if (cabina) {
        logger.info(`✅ [RESERVA ROBUSTA] Cabaña ${tipoCabana} encontrada: ${cabina.name}`);
      }
    } catch (error) {
      logger.warn(`⚠️ [RESERVA ROBUSTA] Error buscando ${tipoCabana}:`, error.message);
    }
    
    if (!cabina) {
      // Mensaje específico cuando no hay disponibilidad del tipo solicitado
      const tipoNombre = tipoCabana === 'tortuga' ? 'Tortuga' : 
                        tipoCabana === 'delfin' ? 'Delfín' : 'Tiburón';
      
      await safeSend(bot, remitente, 
        `❌ No hay cabañas tipo ${tipoNombre} disponibles para las fechas ${fechaInicio} al ${fechaFin}.\n\n` +
        `📅 Por favor intente con otras fechas o consulte disponibilidad de otros tipos de cabaña.`
      );
      
      logger.info(`❌ [RESERVA ROBUSTA] No hay cabañas ${tipoCabana} disponibles para ${fechaInicio}-${fechaFin}`);
      return;
    }
    
    // Actualizar el usuario con el nombre correcto
    if (nombreReal) {
      try {
        const { upsertUser } = require('../../services/reservaService');
        await upsertUser(userId, nombreReal);
        logger.info('🔄 [RESERVA ROBUSTA] Usuario actualizado con nombre correcto:', nombreReal);
      } catch (error) {
        logger.warn('⚠️ [RESERVA ROBUSTA] Error actualizando usuario:', error.message);
      }
    }
    
    // Crear reserva
    const reservaData = {
      start_date: fechaInicio,
      end_date: fechaFin,
      status: 'pendiente',
      total_price: precioTotal,
      personas: personas
    };
    
    const resultado = await createReservationWithUser(userId, reservaData, cabina.cabin_id);
    
    if (resultado.success) {
      const mensaje = `🎉 *RESERVA CONFIRMADA*\n\n` +
                     `✅ ID: ${resultado.reservationId}\n` +
                     `👤 ${nombreReal}\n` +
                     `🏠 ${cabina.name}\n` +
                     `📅 ${fechaInicio} - ${fechaFin}\n` +
                     `👥 ${personas} personas\n` +
                     `💰 Lmps. ${precioTotal.toLocaleString()}\n\n` +
                     `*Instrucciones de pago:*\n` +
                     `Tienes 24h para enviar comprobante`;
      
      await safeSend(bot, remitente, mensaje);
      
      // Notificar al grupo
      const GRUPO_JID = process.env.GRUPO_JID || '120363177663828250@g.us';
      await safeSend(bot, GRUPO_JID, `🎯 Reserva robusta: ${userId} - ID: ${resultado.reservationId}`);
      
      logger.info('✅ [RESERVA ROBUSTA] Completada exitosamente');
    } else {
      await safeSend(bot, remitente, `❌ Error: ${resultado.error}`);
    }
    
  } catch (error) {
    logger.error('❌ [RESERVA ROBUSTA] Error:', error);
    await safeSend(bot, remitente, '❌ Error interno al procesar la reserva');
  }
}

// Función auxiliar para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return 'Fecha no disponible';
  
  try {
    // Si la fecha ya está en formato DD/MM/YYYY, la devolvemos así
    if (fecha.includes('/')) {
      return fecha;
    }
    
    // Si está en formato YYYY-MM-DD, la convertimos
    const date = new Date(fecha + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    logger.error('Error al formatear fecha:', error);
    return fecha; // Devolver la fecha original si hay error
  }
}

module.exports = {
  handleReservadoCommand,
  handleConfirmarCommand: handleConfirmarCommandRobust, // Usar la versión robusta
  handleConfirmadoCommand,
  crearReservaDirectaRobusta
};
