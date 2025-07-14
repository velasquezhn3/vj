const cabañas = require('../data/cabañas.json');
const actividadesData = require('../data/actividades.json');
const WeatherModule = require('../services/weatherService');
const { sendShareExperienceInstructions } = require('../routes/shareExperience');
const { manejarPostReserva } = require('../routes/postReservaHandler');

const weatherModule = new WeatherModule('5a9417f67be807a6e981ec69173924ac');

// Estados constantes
const STATES = {
  LODGING: 'alojamientos',
  DATES: 'reservar_fechas',
  ACTIVITIES: 'actividades',
  SHARE_EXPERIENCE: 'compartir_experiencia',
  POST_RESERVA: 'post_reserva'
};

// Helper para enviar mensajes con manejo de errores
async function safeSend(bot, recipient, text) {
  try {
    await bot.sendMessage(recipient, { text });
    return true;
  } catch (error) {
    console.error(`Error al enviar mensaje a ${recipient}:`, error);
    return false;
  }
}

// Helper para generar menús dinámicos
function generateDynamicMenu(items, itemType) {
  if (items.length === 0) {
    return `⚠️ No hay ${itemType} disponibles en este momento.`;
  }

  const title = `Tenemos estas ${itemType} disponibles:\n`;
  const list = items.map((item, index) => `${index + 1}. ${item.nombre}`).join('\n');
  const instructions = '\nPor favor, selecciona el número para ver más detalles.';
  
  return title + list + instructions;
}

// Contenido de FAQs
const FAQ_CONTENT = `🏝️ *Preguntas Frecuentes – Villas frente al mar*\n\n` +
  `1. 🏡 ¿Qué tipos de alojamientos ofrecen?\n` +
  `Ofrecemos cabañas y apartamentos equipados, con vista al mar y acceso directo a la playa.\n\n` +
  `2. 🕒 ¿A qué hora es el check-in y check-out?\n` +
  `Check-in: 2:00 PM | Check-out: 11:00 AM\n\n` +
  `3. 💵 ¿Cuáles son las tarifas?\n` +
  `Varían según temporada y tipo de alojamiento. Contáctanos para cotización.\n\n` +
  `4. 👨‍👩‍👧 ¿Se permiten niños y mascotas?\n` +
  `Niños: ¡Sí! | Mascotas: Consulta condiciones.\n\n` +
  `5. 🍳 ¿Las cabañas tienen cocina?\n` +
  `Sí, todas incluyen cocina equipada.\n\n` +
  `6. 🏖️ ¿Qué servicios están incluidos?\n` +
  `Aire acondicionado, Wi-Fi, Parqueo, Acceso a playa\n\n` +
  `7. 📍 ¿Dónde están ubicados?\n` +
  `Tela, Atlántida, frente al mar.\n\n` +
  `8. 📅 ¿Cómo reservar?\n` +
  `Escríbenos con tus fechas y número de personas.\n\n` +
  `9. 💳 ¿Formas de pago?\n` +
  `Efectivo, Transferencias, Tarjetas\n\n` +
  `10. 🔒 ¿Depósito para reservar?\n` +
  `Sí, 50% de adelanto.\n\n` +
  `Escribe "menu" para volver al menú principal.`;

async function handleMainMenuOptions(bot, remitente, mensaje, establecerEstado) {
  switch (mensaje) {
    case '1': // Alojamientos
      await safeSend(bot, remitente, generateDynamicMenu(cabañas, 'cabañas'));
      await establecerEstado(remitente, STATES.LODGING);
      break;

    case '2': // Reservar
      await safeSend(bot, remitente, 
        '📅 *Reservar Ahora*:\nIndica fechas (DD/MM/AAAA - DD/MM/AAAA)\nEj: 20/08/2025 - 25/08/2025'
      );
      await establecerEstado(remitente, STATES.DATES);
      break;

    case '3': // Actividades
      await safeSend(bot, remitente, generateDynamicMenu(actividadesData, 'actividades'));
      await establecerEstado(remitente, STATES.ACTIVITIES);
      break;

    case '4': // Contacto
      await safeSend(bot, remitente, 
        `📞 *Atención 24/7:*\n` +
        `WhatsApp: http://wa.me/50499222188\n` +
        `Llamadas: 50499222188\n\n` +
        `📞 *Atención 24/7:*\n` +
        `WhatsApp: http://wa.me/50499905880\n` +
        `Llamadas: 50499905880\n\n` +
        `Escribe "menu" para volver al menú principal.`
      );
      break;

    case '5': // Clima
      try {
        const climaResponse = await weatherModule.getWeatherForecast();
        await safeSend(bot, remitente, climaResponse.message);
      } catch (error) {
        console.error('Error obteniendo clima:', error);
        await safeSend(bot, remitente, '⚠️ Error obteniendo pronóstico. Intenta más tarde.');
      }
      break;

    case '6': // Preguntas Frecuentes
      await safeSend(bot, remitente, FAQ_CONTENT);
      break;

    case '7': // Compartir experiencia
      try {
        await sendShareExperienceInstructions(bot, remitente, establecerEstado);
      } catch (error) {
        console.error('Error al enviar instrucciones:', error);
        await safeSend(bot, remitente, '⚠️ Error al procesar tu solicitud');
      }
      break;

    case '8': // Soporte post-reserva
      try {
        await manejarPostReserva(bot, remitente, mensaje, establecerEstado);
      } catch (error) {
        console.error('Error en soporte post-reserva:', error);
        await safeSend(bot, remitente, '⚠️ Error en soporte post-reserva');
      }
      break;

    case '9': // Programa fidelidad
      await safeSend(bot, remitente, '💎 *Programa Fidelidad*:\nAcumula puntos y obtén descuentos exclusivos.');
      break;

    default: // Opción inválida
      await safeSend(bot, remitente, '❌ Opción inválida. Usa el menú numérico.');
      break;
  }
}

module.exports = {
  handleMainMenuOptions,
  STATES // Exportamos estados si se necesitan en otros módulos
};