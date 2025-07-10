const { obtenerUltimoSaludo, establecerUltimoSaludo } = require('../../services/stateService');
const { enviarMenuPrincipal } = require('../../services/messagingService');
const logger = require('../../config/logger');

async function handleGreeting(bot, remitente, mensajeTexto) {
    const hoy = new Date().toISOString().slice(0, 10);
    const ultimoSaludo = obtenerUltimoSaludo(remitente) || '';

    if (ultimoSaludo !== hoy) {
        await establecerUltimoSaludo(remitente, hoy);
        const saludo = `🌴 ¡Bienvenido(a) a Villas Julie! 🏖️ Tu rincón ideal frente al mar te espera.`;

        try {
            await bot.sendMessage(remitente, { text: saludo });
        } catch (saludoError) {
        logger.warn(`Error enviando saludo a ${remitente}: ${saludoError.message}`, {
            userId: remitente
        });
        }

        await enviarMenuPrincipal(bot, remitente);
        return true; // greeting handled
    }

    if (mensajeTexto === 'menu' || mensajeTexto === 'menú') {
        await enviarMenuPrincipal(bot, remitente);
        return true; // greeting handled
    }

    return false; // greeting not handled
}

module.exports = {
    handleGreeting
};
