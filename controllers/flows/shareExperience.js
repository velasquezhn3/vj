const { establecerEstado } = require('../../services/stateService');

/**
 * Sends the instructions message for sharing Instagram photo and sets the user state.
 * @param {Object} bot - Bot instance
 * @param {string} remitente - User ID
 * @param {Function} establecerEstadoFunc - Function to set user state
 */
async function sendShareExperienceInstructions(bot, remitente, establecerEstadoFunc) {
  try {
    await bot.sendMessage(remitente, {
      text: `📸 ¡Gana $20 de descuento en tu próxima reserva!\n\n` +
            `1. Sube una foto a *Instagram* o *Facebook*\n` +
            `2. Etiqueta 👉 @villasjulie\n` +
            `3. Envíanos el enlace aquí ⬇️\n\n` +
            `Participa para ganarte $20 de descuento, 4 ganadores al año.\n\n` +
            `Por favor, envía el enlace de tu publicación de Instagram (debe ser un enlace tipo instagram.com/p/...)` +
            `\n\nEscribe "menu" para ir al menú principal.`
    });
    await establecerEstadoFunc(remitente, 'share_experience');
  } catch (error) {
    console.error('Error enviando instrucciones para compartir experiencia:', error);
  }
}

/**
 * Handles the user's Instagram link submission, validates it, and sends appropriate response.
 * @param {Object} bot - Bot instance
 * @param {string} remitente - User ID
 * @param {string} mensaje - User message (Instagram link)
 * @param {Function} establecerEstadoFunc - Function to set user state
 */
async function handleShareExperienceResponse(bot, remitente, mensaje, establecerEstadoFunc) {
  const instagramLink = mensaje.trim();
  const instagramPostPattern = /^https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/i;
  if (instagramPostPattern.test(instagramLink)) {
    try {
      await bot.sendMessage(remitente, {
        text: '¡Gracias por compartir tu experiencia! 🎉 Estas Participando en un descuento de $20 en tu próxima reserva.' +
              `\n\nEscribe "menu" para ir al menú principal.`
      });
      await establecerEstadoFunc(remitente, 'main');
    } catch (error) {
      console.error('Error enviando confirmación de descuento:', error);
    }
  } else {
    try {
      await bot.sendMessage(remitente, {
        text: 'El enlace que enviaste no es válido. Por favor, asegúrate de enviar un enlace de publicación de Instagram válido (debe ser tipo instagram.com/p/...). Intenta de nuevo.' +
              `\n\nEscribe "menu" para ir al menú principal.`
      });
    } catch (error) {
      console.error('Error enviando mensaje de enlace inválido:', error);
    }
  }
}

module.exports = {
  sendShareExperienceInstructions,
  handleShareExperienceResponse
};
