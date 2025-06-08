/**
 * Módulo para el procesamiento de mensajes y flujo de conversación del bot con manejo mejorado de errores.
 */

const { establecerEstado, obtenerEstado, establecerUltimoSaludo, obtenerUltimoSaludo } = require('../services/stateService');
const weatherService = require('../services/weatherService');
const { isValidDate, confirmarReserva } = require('../utils/utils');
const constants = require('./constants');
const { flowAlojamientos } = require('../routes/alojamientos');
const { handleMainMenuOptions } = require('../controllers/mainMenuHandler');
const { manejarNoReserva } = require('../routes/postReservaHandler');

/**
 * Envía el menú principal al usuario.
 * @param {Object} bot - Instancia del bot.
 * @param {string} remitente - Número del usuario.
 */
async function enviarMenuPrincipal(bot, remitente) {
  try {
    await establecerEstado(remitente, 'main');
    await bot.sendMessage(remitente, { text: constants.MENU_PRINCIPAL });
  } catch (error) {
    console.error('Error enviando menú principal:', error);
  }
}

/**
 * Procesa los mensajes recibidos y maneja la lógica de conversación con manejo de errores.
 * @param {Object} bot - Instancia del bot.
 * @param {string} remitente - Número del usuario.
 * @param {string} mensaje - Texto del mensaje recibido.
 */
async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
  const estado = obtenerEstado(remitente);
  const textoMinuscula = mensaje.toLowerCase();

  // Check if greeting was sent today
  const hoy = new Date().toISOString().slice(0, 10);
  const ultimoSaludo = obtenerUltimoSaludo(remitente);
  let esPrimerMensajeDelDia = false;

  if (ultimoSaludo !== hoy) {
    esPrimerMensajeDelDia = true;
    await establecerUltimoSaludo(remitente, hoy);
    const saludo = `🌴 ¡Bienvenido(a) a Villas Julie! 🏖️ .Tu rincón ideal frente al mar te espera.`;
    try {
      await bot.sendMessage(remitente, { text: saludo });
    } catch (error) {
      console.error('Error enviando saludo:', error);
    }
    // Set state to MENU_PRINCIPAL after greeting
    await establecerEstado(remitente, 'MENU_PRINCIPAL');
    try {
      await enviarMenuPrincipal(bot, remitente);
    } catch (error) {
      console.error('Error enviando menú principal:', error);
    }
    return;
  }

  if (textoMinuscula === 'menu' || textoMinuscula === 'menú') {
    try {
      await enviarMenuPrincipal(bot, remitente);
    } catch (error) {
      console.error('Error enviando menú principal:', error);
    }
    return;
  }

const { handleShareExperienceResponse } = require('../routes/shareExperience');

switch (estado.estado) {
  case 'main':
    await handleMainMenuOptions(bot, remitente, mensaje, establecerEstado);
    break;

  case 'experienciasLocales':
    const { handleExperienciasLocales } = require('./flows/experienciasLocales');
    await handleExperienciasLocales(bot, remitente, mensaje, establecerEstado);
    break;

  case 'share_experience':
    await handleShareExperienceResponse(bot, remitente, mensaje, establecerEstado);
    break;

  case 'alojamientos':
    try {
      const cabañas = require('../data/cabañas.json');
      const seleccion = parseInt(mensaje.trim());
      if (isNaN(seleccion) || seleccion < 1 || seleccion > cabañas.length) {
        await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
        break;
      }
      const cabaña = cabañas[seleccion - 1];
      let detalles = `🏖️ *${cabaña.nombre}* (${cabaña.tipo})\n`;
      detalles += `👥 Capacidad: ${cabaña.capacidad} personas\n`;
      detalles += `🛏️ Habitaciones: ${cabaña.habitaciones} | 🚿 Baños: ${cabaña.baños}\n`;
      detalles += `💰 Precio por noche: ${cabaña.precio_noche.toLocaleString()} ${cabaña.moneda}\n`;
      detalles += `📍 Ubicación: ${cabaña.ubicacion.ciudad}, ${cabaña.ubicacion.departamento}\n\n`;
      detalles += `🛋️ Comodidades:\n`;
      cabaña.comodidades.forEach(item => {
        detalles += `- ${item}\n`;
      });
      if (cabaña.reservas && cabaña.reservas.length > 0) {
        detalles += `\n📅 Fechas reservadas:\n`;
        cabaña.reservas.forEach(reserva => {
          detalles += `- ${reserva.fecha_inicio} a ${reserva.fecha_fin} (${reserva.estado})\n`;
        });
      }
      // Send first photo as image with caption
      if (cabaña.fotos && cabaña.fotos.length > 0) {
        await bot.sendMessage(remitente, {
          image: { url: cabaña.fotos[0] },
          caption: detalles
        });
        // Send remaining photos as separate image messages
        for (let i = 1; i < cabaña.fotos.length; i++) {
          await bot.sendMessage(remitente, {
            image: { url: cabaña.fotos[i] }
          });
        }
      } else {
        // If no photos, send text only
        await bot.sendMessage(remitente, { text: detalles });
      }
    } catch (error) {
      console.error('Error enviando detalles de cabaña:', error);
    }
    break;
  case 'actividades':
    try {
      const { sendActividadDetails } = require('../controllers/actividadesController');
      const seleccion = parseInt(mensaje.trim());
      await sendActividadDetails(bot, remitente, seleccion);
    } catch (error) {
      console.error('Error enviando detalles de actividad:', error);
    }
    break;

  case 'reservar':
    if (!estado.tempReserva) estado.tempReserva = {};

    if (!estado.tempReserva.tipo) {
      estado.tempReserva.tipo = mensaje;
      try {
        await bot.sendMessage(remitente, {
          text: '📅 Ingresa fechas (Formato: DD/MM - DD/MM)\nEj: 25/12 - 30/12'
        });
        await establecerEstado(remitente, 'reserva_paso2', estado.tempReserva);
      } catch (error) {
        console.error('Error enviando solicitud de fechas:', error);
      }
    }
    break;

  case 'reserva_paso2':
    if (isValidDate(mensaje)) {
      if (!estado.tempReserva) estado.tempReserva = {};
      estado.tempReserva.fechaInicio = mensaje.split('-')[0].trim();
      estado.tempReserva.fechaFin = mensaje.split('-')[1].trim();
      try {
        await bot.sendMessage(remitente, {
          text: '👥 ¿Cuántas personas serán?'
        });
        await establecerEstado(remitente, 'reserva_paso3', estado.tempReserva);
      } catch (error) {
        console.error('Error enviando solicitud de número de personas:', error);
      }
    } else {
      try {
        await bot.sendMessage(remitente, { text: 'Formato de fecha no válido. Por favor, intente de nuevo.' });
      } catch (error) {
        console.error('Error enviando mensaje de formato de fecha inválido:', error);
      }
    }
    break;

  case 'reserva_paso3':
    if (!isNaN(Number(mensaje))) {
      estado.tempReserva.personas = Number(mensaje);
      try {
        await confirmarReserva(remitente, estado.tempReserva);
        await establecerEstado(remitente, 'main');
      } catch (error) {
        console.error('Error confirmando reserva:', error);
      }
    } else {
      try {
        await bot.sendMessage(remitente, { text: 'Número no válido. Por favor, ingrese un número.' });
      } catch (error) {
        console.error('Error enviando mensaje de número inválido:', error);
      }
    }
    break;

  case 'MENU_PRINCIPAL':
    switch (mensaje) {
      case '1':
        try {
          await bot.sendMessage(remitente, { text: 'Por favor, envíe su información para validar.' });
          await establecerEstado(remitente, 'VALIDACION_USUARIO');
        } catch (error) {
          console.error('Error enviando solicitud de validación de usuario:', error);
        }
        break;
      case '2':
        try {
          await bot.sendMessage(remitente, { text: 'Opción de validación alternativa seleccionada.' });
          await establecerEstado(remitente, 'VALIDACION_ALTERNATIVA');
        } catch (error) {
          console.error('Error enviando opción de validación alternativa:', error);
        }
        break;
      case '3':
        try {
          await bot.sendMessage(remitente, { text: '🌴 ¡Bienvenido(a) a Villas Yulie! 🏖️ .Tu rincón ideal frente al mar te espera.' });
          await establecerEstado(remitente, 'FIN');
        } catch (error) {
          console.error('Error enviando mensaje de despedida:', error);
        }
        break;
      default:
        if (!esPrimerMensajeDelDia) {
          try {
            await bot.sendMessage(remitente, { text: 'Opción no válida. Por favor seleccione una opción del menú.' });
          } catch (error) {
            console.error('Error enviando opción no válida en menú principal:', error);
          }
        }
        try {
          await enviarMenuPrincipal(bot, remitente);
        } catch (error) {
          console.error('Error enviando menú principal:', error);
        }
        break;
    }
    break;
  // Additional states for validation can be added here
  default:
    try {
      await enviarMenuPrincipal(bot, remitente);
    } catch (error) {
      console.error('Error enviando menú principal en estado por defecto:', error);
    }
    break;
}
}

module.exports = {
  enviarMenuPrincipal,
  procesarMensaje
};
