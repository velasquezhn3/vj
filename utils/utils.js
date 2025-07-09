/**
 * Módulo de utilidades con funciones auxiliares.
 */

/**
 * Valida el formato de fecha para reservas (ejemplo: "25/12 - 30/12").
 * @param {string} fecha - Texto con las fechas a validar.
 * @returns {boolean} - True si el formato es válido, false en caso contrario.
 */
function isValidDate(fecha) {
  const regex = /^\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}$/;
  return regex.test(fecha);
}

/**
 * Función para confirmar la reserva (puede ser extendida para lógica real).
 * @param {string} remitente - Número del usuario.
 * @param {Object} reserva - Objeto con detalles de la reserva.
 */
async function confirmarReserva(remitente, reserva) {
  // Aquí se puede agregar lógica para guardar la reserva en base de datos o enviar confirmación
  console.log(`Reserva confirmada para ${remitente}:`, reserva);
  // Simulación de envío de mensaje de confirmación (debe integrarse con bot)
  // await bot.sendMessage(remitente, { text: 'Reserva confirmada. ¡Gracias!' });
}

/**
 * Valida si una URL es válida.
 * @param {string} urlString - La URL a validar.
 * @returns {boolean} - True si la URL es válida, false en caso contrario.
 */
function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

async function validarDisponibilidad(fechaEntrada, fechaSalida) {
    // Simulación: solo rechaza una fecha específica
    if (fechaEntrada === '15/08/2025' && fechaSalida === '18/08/2025') {
        return false;
    }
    return true;
}

const GRUPO_JID = '120363420483868468@g.us'; // Cambia por el JID real de tu grupo

async function enviarAlGrupo(bot, texto) {
    try {
        await bot.sendMessage(GRUPO_JID, { text: texto });
    } catch (error) {
        console.error('Error enviando mensaje al grupo:', error);
        try {
            await bot.sendMessage(GRUPO_JID, { text: '⚠️ Ocurrió un error al enviar un mensaje al grupo.' });
        } catch (err) {
            console.error('Error enviando mensaje de error al grupo:', err);
        }
    }
}

async function reenviarComprobanteAlGrupo(bot, mensaje, datos) {
    try {
        if (mensaje.imageMessage) {
            await bot.sendMessage(GRUPO_JID, { image: mensaje.imageMessage, caption: `Comprobante de ${datos.nombre}` });
        } else if (mensaje.documentMessage) {
            await bot.sendMessage(GRUPO_JID, { document: mensaje.documentMessage, caption: `Comprobante de ${datos.nombre}` });
        }
    } catch (error) {
        console.error('Error reenviando comprobante al grupo:', error);
        try {
            await bot.sendMessage(GRUPO_JID, { text: '⚠️ Ocurrió un error al reenviar un comprobante al grupo.' });
        } catch (err) {
            console.error('Error enviando mensaje de error al grupo:', err);
        }
    }
}

module.exports = {
  isValidDate,
  confirmarReserva,
  isValidUrl,
  validarDisponibilidad,
  enviarAlGrupo,
  reenviarComprobanteAlGrupo
};
