const { parse, isFriday, isSaturday, addDays, format, getDay } = require('date-fns');

/**
 * Calcula el precio total de la reserva según el tipo de cabaña, fecha de entrada y número de noches.
 * @param {string} tipoCabaña - Tipo de cabaña: "Cabaña Tortuga", "Cabaña Caracol", "Cabaña Tiburón"
 * @param {string} fechaEntradaStr - Fecha de entrada en formato "DD/MM/YYYY"
 * @param {number} noches - Número de noches a reservar
 * @returns {number} Precio total a pagar
 */
function calcularPrecioTotal(tipoCabaña, fechaEntradaStr, noches) {
  // Parsear fecha de entrada
  const [dia, mes, anio] = fechaEntradaStr.split('/');
  const fechaEntrada = new Date(anio, mes - 1, dia);

  if (tipoCabaña === 'Cabaña Tortuga') {
    // Precio fijo 1500 por noche
    return 1500 * noches;
  }

  if (tipoCabaña === 'Cabaña Caracol') {
    // Reglas para Caracol
    if (noches === 1) {
      // Una sola noche
      if (isFriday(fechaEntrada) || isSaturday(fechaEntrada)) {
        return 5000;
      } else {
        return 3000;
      }
    } else if (noches === 2) {
      // Dos noches
      const diaEntrada = getDay(fechaEntrada); // 5 = viernes, 6 = sábado
      const diaSalida = getDay(addDays(fechaEntrada, 1));
      if (diaEntrada === 5 && diaSalida === 6) {
        // Viernes y sábado
        return 7000;
      } else {
        // Dos noches normales
        return 3000 * noches;
      }
    } else {
      // Más de 2 noches, precio normal lunes a jueves
      let total = 0;
      for (let i = 0; i < noches; i++) {
        const diaReserva = getDay(addDays(fechaEntrada, i));
        if (diaReserva >= 1 && diaReserva <= 4) {
          total += 3000; // Lunes a jueves
        } else {
          total += 5000; // Viernes o sábado noche extra
        }
      }
      return total;
    }
  }

  if (tipoCabaña === 'Cabaña Tiburón') {
    // Reglas para Tiburón
    if (noches === 1) {
      if (isFriday(fechaEntrada) || isSaturday(fechaEntrada)) {
        return 5000;
      } else {
        return 3500;
      }
    } else if (noches === 2) {
      const diaEntrada = getDay(fechaEntrada);
      const diaSalida = getDay(addDays(fechaEntrada, 1));
      if (diaEntrada === 5 && diaSalida === 6) {
        return 8000;
      } else {
        return 3500 * noches;
      }
    } else {
      let total = 0;
      for (let i = 0; i < noches; i++) {
        const diaReserva = getDay(addDays(fechaEntrada, i));
        if (diaReserva >= 1 && diaReserva <= 4) {
          total += 3500;
        } else {
          total += 5000;
        }
      }
      return total;
    }
  }

  // Si no coincide ningún tipo, retornar 0
  return 0;
}

module.exports = {
  calcularPrecioTotal
};
