const { obtenerEstado } = require('../../services/stateService');
const { handleGreeting } = require('./greetingHandler');
const { handleMenuState } = require('./menuHandler');
const { handleActividadesState } = require('./actividadesHandler');
const { handleReservaState } = require('./reservaFlowHandler');
const { ESTADOS_RESERVA } = require('../reservaConstants');
const { enviarMenuPrincipal } = require('../../services/messagingService');
const logger = require('../../config/logger');

async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
    if (!remitente || typeof remitente !== 'string' || remitente.trim() === '') {
        logger.error('Remitente inválido en procesarMensaje', {
            mensaje,
            mensajeObj
        });
        return;
    }

    const mensajeTexto = (mensaje || '').toLowerCase().trim();

    try {
        const { estado, datos } = obtenerEstado(remitente);

        // Handle greeting and menu command
        const greetingHandled = await handleGreeting(bot, remitente, mensajeTexto);
        if (greetingHandled) {
            return;
        }

        logger.debug(`Procesando mensaje de ${remitente}: ${mensajeTexto}`, {
            estado
        });

        switch (estado) {
            case 'MENU_PRINCIPAL':
            case 'LISTA_CABAÑAS':
            case 'DETALLE_CABAÑA':
                await handleMenuState(bot, remitente, mensajeTexto, estado, require('../../services/stateService').establecerEstado);
                break;

            case 'actividades':
                await handleActividadesState(bot, remitente, mensajeTexto);
                break;

            // Reservation flow states
            case ESTADOS_RESERVA.FECHAS:
            case ESTADOS_RESERVA.NOMBRE:
            case ESTADOS_RESERVA.TELEFONO:
            case ESTADOS_RESERVA.PERSONAS:
            case ESTADOS_RESERVA.ALOJAMIENTO:
            case ESTADOS_RESERVA.CONDICIONES:
            case ESTADOS_RESERVA.ESPERANDO_PAGO:
            case ESTADOS_RESERVA.ESPERANDO_CONFIRMACION:
                await handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje);
                break;

            default:
                logger.warn(`Estado no manejado: ${estado}`, {
                    userId: remitente
                });
                await bot.sendMessage(remitente, {
                    text: '⚠️ Ocurrió un error inesperado. Reiniciando tu sesión...'
                });
                await enviarMenuPrincipal(bot, remitente);
                break;
        }
    } catch (error) {
        logger.error(`Error crítico en procesarMensaje para ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente,
            mensaje
        });

        try {
            await bot.sendMessage(remitente, {
                text: '⚠️ Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo más tarde.'
            });
            await require('../../services/stateService').establecerEstado(remitente, 'MENU_PRINCIPAL');
            await bot.sendMessage(remitente, { text: require('../../controllers/constants').MENU_PRINCIPAL });
        } catch (fallbackError) {
            if (typeof logger.critical === 'function') {
                logger.critical(`Error de comunicación crítico con ${remitente}: ${fallbackError.message}`, {
                    stack: fallbackError.stack,
                    userId: remitente
                });
            } else {
                logger.error(`Error de comunicación crítico con ${remitente}: ${fallbackError.message}`, {
                    stack: fallbackError.stack,
                    userId: remitente
                });
            }
        }
    }
}

module.exports = {
    procesarMensaje
};
