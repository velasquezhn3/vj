const { obtenerUltimoSaludo, establecerUltimoSaludo } = require('../../services/stateService');
const { enviarMenuPrincipal } = require('../../services/messagingService');
const logger = require('../../config/logger');

async function handleGreeting(bot, remitente, mensajeTexto) {
    try {
        // Verificar comando de menú explícito
        const comandoMenu = mensajeTexto.trim().toLowerCase() === 'menu' || mensajeTexto.trim().toLowerCase() === 'menú';
        if (comandoMenu) {
            await enviarMenuPrincipal(bot, remitente);
            return true;
        }

        const hoy = new Date().toISOString().slice(0, 10);
        const ultimoSaludo = obtenerUltimoSaludo(remitente);

        // Si ya se saludó hoy, no hacer nada
        if (ultimoSaludo === hoy) {
            return false;
        }

        // Nuevo saludo diario
        await establecerUltimoSaludo(remitente, hoy);
        
        const saludo = `🌴 ¡Bienvenido(a) a Villas Julie! 🏖️ Tu rincón ideal frente al mar te espera.`;
        await bot.sendMessage(remitente, { text: saludo });
        
        // Enviar menú principal después del saludo
        await enviarMenuPrincipal(bot, remitente);
        
        return true;

    } catch (error) {
        logger.error(`Error en handleGreeting para ${remitente}: ${error.message}`, {
            userId: remitente,
            error
        });
        
        // Intento de recuperación: enviar menú principal si falla el saludo
        try {
            await bot.sendMessage(remitente, { 
                text: '¡Hola! Hubo un problema al cargar tu bienvenida, pero aquí tienes nuestro menú:' 
            });
            await enviarMenuPrincipal(bot, remitente);
        } catch (fallbackError) {
            logger.error(`Error de recuperación en handleGreeting: ${fallbackError.message}`, {
                userId: remitente
            });
        }
        
        return true; // Considerar como manejado para evitar loops
    }
}

module.exports = {
    handleGreeting
};