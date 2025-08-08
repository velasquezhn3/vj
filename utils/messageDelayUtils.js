/**
 * Utilidad para delays aleatorios en mensajes de WhatsApp
 * Evita bloqueos y simula comportamiento humano
 */

const logger = require('../config/logger');
const DELAY_CONFIG = require('../config/delayConfig');

/**
 * Genera un delay aleatorio personalizable
 * @param {Object} config - Configuración de delay {MIN_DELAY, MAX_DELAY}
 * @returns {Promise} Promise que se resuelve después del delay
 */
async function randomDelay(config = DELAY_CONFIG) {
    const minDelay = config.MIN_DELAY || DELAY_CONFIG.MIN_DELAY;
    const maxDelay = config.MAX_DELAY || DELAY_CONFIG.MAX_DELAY;
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    
    if (DELAY_CONFIG.LOG_DELAYS) {
        logger.info(`⏳ Delay aleatorio: ${(delay/1000).toFixed(1)}s para evitar bloqueos`);
    }
    
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Envía un mensaje con delay aleatorio personalizado
 * @param {Object} bot - Instancia del bot
 * @param {string} recipient - Número del destinatario  
 * @param {Object} message - Objeto del mensaje a enviar
 * @param {string} messageType - Tipo de mensaje (menu, confirmation, error, etc.)
 * @returns {Promise} Promise del envío del mensaje
 */
async function sendMessageWithDelay(bot, recipient, message, messageType = 'default') {
    let delayConfig = DELAY_CONFIG;
    
    // Seleccionar configuración de delay según el tipo de mensaje
    switch (messageType) {
        case 'menu':
            delayConfig = DELAY_CONFIG.MENU_MESSAGES;
            break;
        case 'confirmation':
            delayConfig = DELAY_CONFIG.CONFIRMATION_MESSAGES;
            break;
        case 'error':
            delayConfig = DELAY_CONFIG.ERROR_MESSAGES;
            break;
        case 'activity':
            delayConfig = DELAY_CONFIG.ACTIVITY_MESSAGES;
            break;
        case 'reservation':
            delayConfig = DELAY_CONFIG.RESERVATION_MESSAGES;
            break;
        default:
            delayConfig = DELAY_CONFIG;
    }
    
    await randomDelay(delayConfig);
    return bot.sendMessage(recipient, message);
}

/**
 * Envía múltiples mensajes con delays aleatorios entre cada uno
 * @param {Object} bot - Instancia del bot
 * @param {string} recipient - Número del destinatario
 * @param {Array} messages - Array de objetos de mensajes a enviar
 * @returns {Promise} Promise de envío de todos los mensajes
 */
async function sendMultipleMessagesWithDelay(bot, recipient, messages) {
    const results = [];
    
    for (let i = 0; i < messages.length; i++) {
        const result = await sendMessageWithDelay(bot, recipient, messages[i]);
        results.push(result);
        
        // Delay adicional entre mensajes múltiples (para evitar flood)
        if (i < messages.length - 1) {
            const extraDelay = Math.floor(Math.random() * 3000) + 2000; // 2-5 segundos extra
            await new Promise(resolve => setTimeout(resolve, extraDelay));
        }
    }
    
    return results;
}

module.exports = {
    randomDelay,
    sendMessageWithDelay,
    sendMultipleMessagesWithDelay
};
