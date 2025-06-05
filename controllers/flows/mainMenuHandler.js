/**
 * Handles the 'main' state menu options.
 * @param {Object} bot - Bot instance.
 * @param {string} remitente - User number.
 * @param {string} mensaje - Received message text.
 * @param {Function} establecerEstado - Function to set user state.
 */
const cabañas = require('../cabañas.json');

async function handleMainMenuOptions(bot, remitente, mensaje, establecerEstado) {
  switch (mensaje) {
    case '1':
      try {
        if (cabañas.length === 0) {
          await bot.sendMessage(remitente, { text: '⚠️ No hay cabañas disponibles en este momento.' });
          break;
        }
        let menu = 'Tenemos estas cabañas disponibles:\n';
        cabañas.forEach((cabaña, index) => {
          menu += `${index + 1}. ${cabaña.nombre}\n`;
        });
        menu += 'Por favor, selecciona el número de la cabaña para ver más detalles.';
        await bot.sendMessage(remitente, { text: menu });
        await establecerEstado(remitente, 'alojamientos');
      } catch (error) {
        console.error('Error enviando menú dinámico de alojamientos:', error);
      }
      break;
    case '2':
      try {
        await bot.sendMessage(remitente, {
          text: `📅 *Reservar Ahora*:\nPor favor, indique el tipo de alojamiento que desea reservar.`
        });
        await establecerEstado(remitente, 'reservar');
      } catch (error) {
        console.error('Error enviando reservar ahora:', error);
      }
      break;
    case '3':
      try {
        const { handleExperienciasLocales } = require('./experienciasLocales');
        await handleExperienciasLocales(bot, remitente, mensaje, establecerEstado);
      } catch (error) {
        console.error('Error ejecutando Experiencias Locales:', error);
      }
      break;
    case '4':
      try {
        await bot.sendMessage(remitente, {
          text: `📞 *Atención 24/7:*  \n` +
                `WhatsApp: http://wa.me/50499222188  \n` +
                `Llamadas: 50499222188  \n\n` +
                `📞 *Atención 24/7:*  \n` +
                `WhatsApp: http://wa.me/50499905880  \n` +
                `Llamadas: 50499905880  \n\n` +
                `📍 *Ubicación:*  \n` +
                `Carretera Bosque 123, Valle Bravo (Maps: [bit.ly/UbicCabañas])`
        });
      } catch (error) {
        console.error('Error enviando contacto rápido actualizado:', error);
      }
      break;
    case '5':
      try {
        await bot.sendMessage(remitente, {
          text: `❓ *Preguntas Frecuentes – Villas frente al mar*\n\n` +
                `1. 🏡 ¿Qué tipos de alojamientos ofrecen?\n` +
                `Ofrecemos cabañas y apartamentos equipados, con vista al mar y acceso directo a la playa. Contamos con opciones para parejas, familias o grupos pequeños.\n\n` +
                `2. 🕒 ¿A qué hora es el check-in y check-out?\n` +
                `Check-in: A partir de las 2:00 PM\n` +
                `Check-out: Hasta las 11:00 AM\n\n` +
                `3. 💵 ¿Cuáles son las tarifas por noche?\n` +
                `Las tarifas varían según la temporada, tipo de alojamiento y número de personas. Contáctanos con las fechas exactas para enviarte una cotización personalizada.\n\n` +
                `4. 👨‍👩‍👧 ¿Se permiten niños y mascotas?\n` +
                `Niños: ¡Bienvenidos!\n` +
                `Mascotas: Permitidas en algunas cabañas bajo ciertas condiciones. Por favor consulta antes de reservar.\n\n` +
                `5. 🍳 ¿Las cabañas tienen cocina?\n` +
                `Sí, nuestras cabañas y apartamentos cuentan con cocina equipada (refrigeradora, estufa, utensilios básicos).\n\n` +
                `6. 🏖️ ¿Qué servicios están incluidos?\n` +
                `Aire acondicionado\n` +
                `Wi-Fi\n` +
                `Parqueo privado\n` +
                `Acceso directo a la playa\n` +
                `Áreas de descanso y hamacas\n` +
                `Piscina (si aplica)\n\n` +
                `7. 📍 ¿Dónde están ubicados?\n` +
                `Estamos en Tela, Atlántida, justo frente al mar, en una zona segura y tranquila, ideal para descansar.\n\n` +
                `8. 📅 ¿Cómo puedo reservar?\n` +
                `Puedes escribirnos directamente por WhatsApp, indicándonos:\n` +
                `Fechas de entrada y salida\n` +
                `Número de personas\n` +
                `Si viajas con niños o mascotas\n` +
                `Te confirmaremos disponibilidad y precio.\n\n` +
                `9. 💳 ¿Qué formas de pago aceptan?\n` +
                `Aceptamos:\n` +
                `Efectivo\n` +
                `Transferencias bancarias\n` +
                `Tarjeta de credito/debito\n\n` +
                `10. 🔒 ¿Se requiere depósito para reservar?\n` +
                `Sí, para garantizar tu reserva solicitamos un adelanto del 50% del total. El resto se paga al llegar.`
        });
      } catch (error) {
        console.error('Error enviando preguntas frecuentes:', error);
      }
      break;
    case '6':
      try {
        await bot.sendMessage(remitente, {
          text: `🏝️ *Preguntas Frecuentes – Villas frente al mar*\n\n` +
                `1. 🏡 ¿Qué tipos de alojamientos ofrecen?\n` +
                `Ofrecemos cabañas y apartamentos equipados, con vista al mar y acceso directo a la playa. Contamos con opciones para parejas, familias o grupos pequeños.\n\n` +
                `2. 🕒 ¿A qué hora es el check-in y check-out?\n` +
                `Check-in: A partir de las 2:00 PM\n` +
                `Check-out: Hasta las 11:00 AM\n\n` +
                `3. 💵 ¿Cuáles son las tarifas por noche?\n` +
                `Las tarifas varían según la temporada, tipo de alojamiento y número de personas. Contáctanos con las fechas exactas para enviarte una cotización personalizada.\n\n` +
                `4. 👨‍👩‍👧 ¿Se permiten niños y mascotas?\n` +
                `Niños: ¡Bienvenidos!\n` +
                `Mascotas: Permitidas en algunas cabañas bajo ciertas condiciones. Por favor consulta antes de reservar.\n\n` +
                `5. 🍳 ¿Las cabañas tienen cocina?\n` +
                `Sí, nuestras cabañas y apartamentos cuentan con cocina equipada (refrigeradora, estufa, utensilios básicos).\n\n` +
                `6. 🏖️ ¿Qué servicios están incluidos?\n` +
                `Aire acondicionado\n` +
                `Wi-Fi\n` +
                `Parqueo privado\n` +
                `Acceso directo a la playa\n` +
                `Áreas de descanso y hamacas\n` +
                `Piscina (si aplica)\n\n` +
                `7. 📍 ¿Dónde están ubicados?\n` +
                `Estamos en Tela, Atlántida, justo frente al mar, en una zona segura y tranquila, ideal para descansar.\n\n` +
                `8. 📅 ¿Cómo puedo reservar?\n` +
                `Puedes escribirnos directamente por WhatsApp, indicándonos:\n` +
                `Fechas de entrada y salida\n` +
                `Número de personas\n` +
                `Si viajas con niños o mascotas\n` +
                `Te confirmaremos disponibilidad y precio.\n\n` +
                `9. 💳 ¿Qué formas de pago aceptan?\n` +
                `Aceptamos:\n` +
                `Efectivo\n` +
                `Transferencias bancarias\n` +
                `Tarjeta de credito/debito\n\n` +
                `10. 🔒 ¿Se requiere depósito para reservar?\n` +
                `Sí, para garantizar tu reserva solicitamos un adelanto del 50% del total. El resto se paga al llegar.\n\n` +
                `Escribe "menu" para volver al menú principal.`
        });
      } catch (error) {
        console.error('Error enviando preguntas frecuentes mejoradas:', error);
      }
      break;
    case '7':
      try {
        await bot.sendMessage(remitente, {
          text: `🛎️ *Ayuda Post-Reserva*:\n¿En qué podemos ayudarte después de tu reserva?`
        });
      } catch (error) {
        console.error('Error enviando ayuda post-reserva:', error);
      }
      break;
    case '8':
      try {
        await bot.sendMessage(remitente, {
          text: `💎 *Programa Fidelidad*:\nAcumule puntos y obtenga descuentos exclusivos.`
        });
      } catch (error) {
        console.error('Error enviando programa fidelidad:', error);
      }
      break;
    default:
      try {
        await bot.sendMessage(remitente, { text: 'Opción no válida. Por favor seleccione una opción del menú.' });
      } catch (error) {
        console.error('Error enviando opción no válida:', error);
      }
      break;
  }
}

module.exports = {
  handleMainMenuOptions
};
