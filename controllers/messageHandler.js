/**
 * Módulo profesional con logger para producción
 */

const { procesarMensaje } = require('./flows/messageProcessor');
const { enviarMenuPrincipal } = require('../services/messagingService');

module.exports = {
    enviarMenuPrincipal,
    procesarMensaje
};
