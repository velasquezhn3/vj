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

module.exports = {
  isValidDate,
  confirmarReserva
};
