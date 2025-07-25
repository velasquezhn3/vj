
// Full original content of vj/controllers/flows/messageProcessor.js with deposit receipt forwarding integrated

const { obtenerEstado, establecerEstado } = require('../../services/stateService');
const { handleGreeting } = require('./greetingHandler');
const { handleMenuState } = require('./menuHandler');
const { handleActividadesState } = require('./actividadesHandler');
const { handleReservaState } = require('./reservaFlowHandler');
const { ESTADOS_RESERVA } = require('../reservaConstants');
const { enviarMenuPrincipal } = require('../../services/messagingService');
const logger = require('../../config/logger');
const { reenviarComprobanteAlGrupo, GRUPO_JID } = require('../../utils/utils');
const alojamientosService = require('../../services/alojamientosService');

const { handleGroupCommand } = require('./groupCommandHandlers');
const { extractMessageText } = require('./messageProcessorUtils');

async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
    // Validación básica de remitente
    if (!remitente || remitente.trim() === '') {
        logger.error('Remitente inválido', { mensaje, mensajeObj });
        return;
    }

    // Manejo de mensajes en grupo
    if (remitente === GRUPO_JID) {
        const mensajeTexto = typeof mensaje === 'string' 
            ? mensaje 
            : extractMessageText(mensajeObj);
        
        await handleGroupCommand(bot, remitente, mensajeTexto, mensajeObj);
        return;
    }

    try {
        const mensajeTexto = typeof mensaje === 'string'
            ? mensaje.toLowerCase().trim()
            : extractMessageText(mensajeObj);

        // Manejar saludos primero
        if (await handleGreeting(bot, remitente, mensajeTexto)) {
            return;
        }

        const { estado, datos } = obtenerEstado(remitente);
        logger.debug(`Procesando estado [${estado}] para ${remitente}`, {
            message: mensajeTexto
        });

        // Log current user state for debugging
        logger.info(`Usuario ${remitente} está en estado: ${estado}`);

        // Log messageObj for debugging
        logger.debug('Mensaje recibido completo:', mensajeObj);

        // Check if message contains image or document to forward as deposit receipt
        const hasImage = mensajeObj?.message?.imageMessage || mensajeObj?.imageMessage;
        const hasDocument = mensajeObj?.message?.documentMessage || mensajeObj?.documentMessage;

        if ((estado === ESTADOS_RESERVA.ESPERANDO_CONFIRMACION || estado === ESTADOS_RESERVA.ESPERANDO_PAGO) && (hasImage || hasDocument)) {
            logger.info(`Estado ${estado} y mensaje con imagen o documento detectado, reenviando comprobante al grupo.`);
            // Forward deposit receipt to group
            await reenviarComprobanteAlGrupo(bot, mensajeObj, datos);

            // Enviar comando /reservado con id de reserva en mensaje aparte
            try {
                let idReserva = null;
                if (datos && (datos.reservation_id || datos._id)) {
                    idReserva = datos.reservation_id || datos._id;
                } else if (datos && datos.telefono) {
                    // Buscar reserva por teléfono
                    const reserva = await alojamientosService.getReservationByPhone(datos.telefono);
                    if (reserva && (reserva.reservation_id || reserva._id)) {
                        idReserva = reserva.reservation_id || reserva._id;
                    }
                }
                if (idReserva) {
                    console.log(`[DEBUG] Enviando comando /reservado ${idReserva}`);
                    await bot.sendMessage(GRUPO_JID, { text: `/reservado ${idReserva}` });
                    console.log(`[DEBUG] Comando /reservado enviado correctamente`);
                }
            } catch (error) {
                console.error(`[ERROR] Error enviando comando /reservado: ${error.message}`);
            }

            return;
        }

        // Router de estados
        const stateHandlers = {
            MENU_PRINCIPAL: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            LISTA_CABAÑAS: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            DETALLE_CABAÑA: () => handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado),
            actividades: () => handleActividadesState(bot, remitente, mensajeTexto),
            [ESTADOS_RESERVA.FECHAS]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.NOMBRE]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.TELEFONO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.PERSONAS]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ALOJAMIENTO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.CONDICIONES]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ESPERANDO_PAGO]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje),
            [ESTADOS_RESERVA.ESPERANDO_CONFIRMACION]: () => handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje)
        };

        const handler = stateHandlers[estado];
        if (handler) {
            await handler();
        } else {
            logger.warn(`Estado no manejado: ${estado}`, { userId: remitente });
            await bot.sendMessage(remitente, {
                text: '⚠️ Estado no reconocido. Reiniciando tu sesión...'
            });
            establecerEstado(remitente, 'MENU_PRINCIPAL');
            await enviarMenuPrincipal(bot, remitente);
        }
    } catch (error) {
        logger.error(`Error procesando mensaje de ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente,
            mensaje: mensaje || ''
        });

        try {
            await bot.sendMessage(remitente, {
                text: '⚠️ Error procesando tu solicitud. Intenta nuevamente.'
            });
            establecerEstado(remitente, 'MENU_PRINCIPAL');
            await enviarMenuPrincipal(bot, remitente);
        } catch (fallbackError) {
            logger.critical(`Error crítico de comunicación: ${fallbackError.message}`, {
                stack: fallbackError.stack,
                userId: remitente
            });
        }
    }
}

module.exports = { procesarMensaje };
