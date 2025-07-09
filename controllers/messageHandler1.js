/**
 * Módulo para el procesamiento de mensajes y flujo de conversación del bot con manejo mejorado de errores.
 */

const { establecerEstado, obtenerEstado, establecerUltimoSaludo, obtenerUltimoSaludo } = require('../services/stateService');
const weatherService = require('../services/weatherService');
const { isValidDate, confirmarReserva } = require('../utils/utils');
const constants = require('./constants');
const { handleMainMenuOptions } = require('../controllers/mainMenuHandler');
const { manejarNoReserva } = require('../routes/postReservaHandler');

async function enviarMenuPrincipal(bot, remitente) {
  try {
    await establecerEstado(remitente, 'MENU_PRINCIPAL');
    await bot.sendMessage(remitente, { text: constants.MENU_PRINCIPAL });
  } catch (error) {
    console.error('Error enviando menú principal:', error);
  }
}

async function enviarMenuCabanas(bot, remitente) {
  try {
    await establecerEstado(remitente, 'LISTA_CABAÑAS');
    delete require.cache[require.resolve('../data/cabañas.json')];
    const cabañas = require('../data/cabañas.json');
    if (cabañas.length === 0) {
      await bot.sendMessage(remitente, { text: '⚠️ No hay cabañas disponibles en este momento.' });
      return;
    }
    const menuCabanas = `🌴 Cabañas Disponibles:\n` +
      cabañas.map((cabaña, index) => `${index + 1}. ${cabaña.nombre}`).join('\n') +
      `\n0. Volver ↩️\nPor favor, selecciona el número de la cabaña para ver más detalles.`;
    await bot.sendMessage(remitente, { text: menuCabanas });
  } catch (error) {
    console.error('Error enviando menú de cabañas:', error);
  }
}

async function enviarDetalleCabaña(bot, remitente, seleccion) {
  try {
    delete require.cache[require.resolve('../data/cabañas.json')];
    const cabañas = require('../data/cabañas.json');
    if (seleccion < 1 || seleccion > cabañas.length) {
      await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
      return;
    }
    const cabaña = cabañas[seleccion - 1];
    await establecerEstado(remitente, 'DETALLE_CABAÑA', { seleccion });
    let detalles = `🏖️ *${cabaña.nombre}* (${cabaña.tipo})\n\n${cabaña.descripcion}\n\n`;
    detalles += `🔄 ¿Siguiente paso?\n1. ← Ver todas las cabañas\n2. Reservar esta cabaña\n0. Menú principal 🏠`;
    if (cabaña.fotos && cabaña.fotos.length > 0) {
      // Separate image and video URLs
      const imageUrls = cabaña.fotos.filter(url => /\.(jpg|jpeg|png|gif)$/i.test(url));
      const videoUrls = cabaña.fotos.filter(url => /\.(mp4|mov|avi|mkv)$/i.test(url));
      if (imageUrls.length > 0) {
        await bot.sendMessage(remitente, {
          image: { url: imageUrls[0] },
          caption: detalles
        });
        for (let i = 1; i < imageUrls.length; i++) {
          await bot.sendMessage(remitente, {
            image: { url: imageUrls[i] }
          });
        }
      } else {
        await bot.sendMessage(remitente, { text: detalles });
      }
      // Send videos after images
      for (const videoUrl of videoUrls) {
        try {
          await bot.sendMessage(remitente, {
            video: { url: videoUrl }
          });
        } catch (error) {
          console.error('Error enviando video:', error, 'URL:', videoUrl);
          await bot.sendMessage(remitente, { text: '⚠️ No se pudo enviar un video adjunto.' });
        }
      }
      // Send additional instruction message after media
      await bot.sendMessage(remitente, { text: 'Escribe 1 para ver más alojamientos o escribe menu para volver al menú principal.' });
    } else {
      await bot.sendMessage(remitente, { text: detalles });
      // Send additional instruction message after text
      await bot.sendMessage(remitente, { text: 'Escribe 1 para ver más alojamientos o escribe menu para volver al menú principal.' });
    }
  } catch (error) {
    console.error('Error enviando detalles de cabaña:', error);
  }
}

async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
  const estado = obtenerEstado(remitente);
  const textoMinuscula = mensaje.toLowerCase();

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
    await enviarMenuPrincipal(bot, remitente);
    return;
  }

  if (textoMinuscula === 'menu' || textoMinuscula === 'menú') {
    if (estado && (estado.estado === 'LISTA_CABAÑAS' || estado.estado === 'DETALLE_CABAÑA')) {
      await enviarMenuPrincipal(bot, remitente);
    } else {
      await enviarMenuPrincipal(bot, remitente);
    }
    return;
  }

  switch (estado.estado) {
    case 'MENU_PRINCIPAL':
      if (mensaje.trim() === '1') {
        await enviarMenuCabanas(bot, remitente);
      } else {
        const { handleMainMenuOptions } = require('./mainMenuHandler');
        await handleMainMenuOptions(bot, remitente, mensaje.trim(), establecerEstado);
      }
      break;

    case 'LISTA_CABAÑAS':
      if (mensaje.trim() === '0') {
        await enviarMenuPrincipal(bot, remitente);
      } else {
        const seleccion = parseInt(mensaje.trim());
        if (isNaN(seleccion)) {
          await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
          await enviarMenuCabanas(bot, remitente);
        } else {
          await enviarDetalleCabaña(bot, remitente, seleccion);
        }
      }
      break;

    case 'actividades':
      if (mensaje.trim() === '0') {
        await enviarMenuPrincipal(bot, remitente);
      } else {
        const seleccion = parseInt(mensaje.trim());
        if (isNaN(seleccion)) {
          await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
          // Reenviar menú de actividades
          const { handleMainMenuOptions } = require('./mainMenuHandler');
          await handleMainMenuOptions(bot, remitente, '3', establecerEstado);
        } else {
          const { sendActividadDetails } = require('./actividadesController');
          await sendActividadDetails(bot, remitente, seleccion);
        }
      }
      break;

    case 'DETALLE_CABAÑA':
      switch (mensaje.trim().toLowerCase()) {
        case '1':
          await enviarMenuCabanas(bot, remitente);
          break;
        case 'menu':
        case 'menú':
          await enviarMenuPrincipal(bot, remitente);
          break;
        case '2':
          // iniciar flujo de reserva para la cabaña seleccionada
          await bot.sendMessage(remitente, { text: 'Funcionalidad de reserva aún no implementada.' });
          break;
        case '0':
          await enviarMenuPrincipal(bot, remitente);
          break;
        default:
          await bot.sendMessage(remitente, { text: 'Opción no válida. Por favor seleccione una opción del menú.' });
          // Reenviar detalles de la cabaña actual
          if (estado.seleccion) {
            await enviarDetalleCabaña(bot, remitente, estado.seleccion);
          } else {
            await enviarMenuCabanas(bot, remitente);
          }
          break;
      }
      break;

    default:
      await enviarMenuPrincipal(bot, remitente);
      break;
  }
}

module.exports = {
  enviarMenuPrincipal,
  procesarMensaje
};
