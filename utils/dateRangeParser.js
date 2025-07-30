// utils/dateRangeParser.js
const chrono = require('chrono-node');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const localeEs = require('dayjs/locale/es');
const timezone = require('dayjs/plugin/timezone');
const advancedFormat = require('dayjs/plugin/advancedFormat');

dayjs.extend(customParseFormat);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.locale(localeEs);

function formatFecha(fecha) {
  return dayjs(fecha).format('DD/MM/YYYY');
}

function nombreDia(fecha) {
  return dayjs(fecha).locale('es').format('dddd');
}

function parseDateRange(texto) {
  if (!texto || typeof texto !== 'string') {
    return { error: 'Entrada inválida. Debe proporcionar un texto.' };
  }

  // Analiza fechas con chrono-node en español
  const results = chrono.es.parse(texto, new Date(), { forwardDate: true });

  let entrada, salida;
  if (results.length === 1) {
    const r = results[0];
    if (r.start && r.end) {
      entrada = r.start.date();
      salida = r.end.date();
    } else if (r.start) {
      entrada = salida = r.start.date();
      // Si solo detecta una fecha, intenta extraer manualmente el rango
      // Ejemplo: "10 al 20 de octubre"
      const match = texto.match(/(\d{1,2})\s*(al|a|hasta|-)\s*(\d{1,2})\s*(de\s+)?([a-záéíóú]+)(\s+\d{4})?/i);
      if (match) {
        const dia1 = match[1];
        const dia2 = match[3];
        const mes = match[5];
        const año = match[6] ? match[6].trim() : dayjs().year();
        const fecha1 = dayjs(`${dia1}/${mes}/${año}`, 'D/MMMM/YYYY', 'es');
        const fecha2 = dayjs(`${dia2}/${mes}/${año}`, 'D/MMMM/YYYY', 'es');
        if (fecha1.isValid() && fecha2.isValid()) {
          entrada = fecha1.toDate();
          salida = fecha2.toDate();
        }
      }
    }
  } else if (results.length >= 2) {
    entrada = results[0].start ? results[0].start.date() : null;
    salida = results[1].start ? results[1].start.date() : null;
  }

  if (!entrada) {
    return { error: 'Fecha de inicio no válida o no detectada.' };
  }
  if (!salida) {
    salida = entrada;
  }

  // Formatea fechas
  const entradaStr = formatFecha(entrada);
  const salidaStr = formatFecha(salida);
  const diaEntrada = nombreDia(entrada);
  const diaSalida = nombreDia(salida);

  // Mensaje de confirmación
  const mensaje = `¿Confirma que su día de entrada será el ${diaEntrada} ${entradaStr} a las 2pm y su día de salida será el ${diaSalida} ${salidaStr} a las 11am?`;

  // Validación de rango
  if (dayjs(salida).isBefore(dayjs(entrada))) {
    return { error: 'La fecha de salida debe ser posterior o igual a la de entrada.' };
  }

  return {
    entrada: entradaStr,
    salida: salidaStr,
    diaEntrada,
    diaSalida,
    mensaje,
    error: null
  };
}

module.exports = { parseDateRange };
