const reservasActivasMock = [
  {
    telefono: '50412345678',
    nombreHuesped: 'Juan Perez',
    codigoAcceso: 'B3X9',
    ubicacion: 'https://maps.google.com/?q=15.7835,-88.7879',
    fechaCheckIn: '05 junio',
    fechaCheckOut: '07 junio'
  }
];

/**
 * Busca una reserva activa por teléfono o remitente.
 * @param {string} identificador - Teléfono o ID del remitente
 * @returns {Object|null} Reserva activa o null si no existe
 */
function buscarReservaActiva(identificador) {
  return reservasActivasMock.find(reserva => reserva.telefono === identificador) || null;
}

/**
 * Maneja las opciones del menú post-reserva.
 * @param {Object} bot - Instancia del bot
 * @param {string} remitente - ID del usuario
 * @param {string} mensaje - Mensaje recibido (opción del menú)
 * @param {Function} establecerEstado - Función para establecer estado del usuario
 */
async function manejarPostReserva(bot, remitente, mensaje, establecerEstado) {
  try {
    const reserva = buscarReservaActiva(remitente);
    if (!reserva) {
      await bot.sendMessage(remitente, {
        text: '⚠️ No encontramos reservas activas asociadas a este número.\n' +
              '1. Hablar con un agente\n' +
              '2. Volver al menú principal\n\n' +
              'Por favor, responde con 1 o 2.\n\nEscribe "menu" para ir al menú principal.'
      });
      await establecerEstado(remitente, 'post_reserva_no_reserva');
      return;
    }

    switch (mensaje) {
      case '1':
        await bot.sendMessage(remitente, {
          text: `✅ Reserva encontrada: ${reserva.nombreHuesped}\n\n` +
                `🔐 Tu código de acceso: *${reserva.codigoAcceso}*\n` +
                `📍 Ubicación exacta: ${reserva.ubicacion}\n` +
                `📅 Check-in: ${reserva.fechaCheckIn} - Check-out: ${reserva.fechaCheckOut}\n\n` +
                `¿Deseas que enviemos asistencia al lugar? (Sí / No)\n\nEscribe "menu" para ir al menú principal.`
        });
        await establecerEstado(remitente, 'post_reserva_checkin');
        break;
      case '2':
        await bot.sendMessage(remitente, {
          text: 'Funcionalidad para modificar reserva próximamente.\n\nEscribe "menu" para ir al menú principal.'
        });
        break;
      case '3':
        await bot.sendMessage(remitente, {
          text: 'Funcionalidad para cancelar reserva próximamente.\n\nEscribe "menu" para ir al menú principal.'
        });
        break;
      case '4':
        await bot.sendMessage(remitente, {
          text: 'Funcionalidad para solicitar asistencia en cabaña próximamente.\n\nEscribe "menu" para ir al menú principal.'
        });
        break;
      default:
        await bot.sendMessage(remitente, {
          text: 'Opción no válida. Por favor responde con un número del 1 al 4.\n\nEscribe "menu" para ir al menú principal.'
        });
        break;
    }
  } catch (error) {
    console.error('Error en manejarPostReserva:', error);
    await bot.sendMessage(remitente, {
      text: 'Lo siento, ocurrió un error. Por favor intenta de nuevo más tarde.\n\nEscribe "menu" para ir al menú principal.'
    });
  }
}

/**
 * Maneja la respuesta cuando no se encuentra reserva activa.
 * @param {Object} bot - Instancia del bot
 * @param {string} remitente - ID del usuario
 * @param {string} mensaje - Mensaje recibido (opción 1 o 2)
 * @param {Function} establecerEstado - Función para establecer estado del usuario
 * @param {Function} handleMainMenuOptions - Función para manejar menú principal
 */
async function manejarNoReserva(bot, remitente, mensaje, establecerEstado, handleMainMenuOptions) {
  try {
    switch (mensaje) {
      case '1':
        // Redirigir a opción 4 (contacto rápido) del menú principal
        await handleMainMenuOptions(bot, remitente, '4', establecerEstado);
        break;
      case '2':
        // Volver al menú principal
        await bot.sendMessage(remitente, {
          text: 'Volviendo al menú principal.\n\nEscribe "menu" para ir al menú principal.'
        });
        await establecerEstado(remitente, 'main');
        break;
      default:
        await bot.sendMessage(remitente, {
          text: 'Opción no válida. Por favor responde con 1 o 2.\n\nEscribe "menu" para ir al menú principal.'
        });
        break;
    }
  } catch (error) {
    console.error('Error en manejarNoReserva:', error);
    await bot.sendMessage(remitente, {
      text: 'Lo siento, ocurrió un error. Por favor intenta de nuevo más tarde.\n\nEscribe "menu" para ir al menú principal.'
    });
  }
}

module.exports = {
  manejarPostReserva,
  manejarNoReserva
};
