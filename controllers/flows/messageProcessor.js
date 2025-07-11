const { obtenerEstado, establecerEstado } = require('../../services/stateService');
const { handleGreeting } = require('./greetingHandler');
const { handleMenuState } = require('./menuHandler');
const { handleActividadesState } = require('./actividadesHandler');
const { handleReservaState } = require('./reservaFlowHandler');
const { ESTADOS_RESERVA } = require('../reservaConstants');
const { enviarMenuPrincipal } = require('../../services/messagingService');
const logger = require('../../config/logger');
const { GRUPO_JID } = require('../../utils/utils');
const alojamientosService = require('../../services/alojamientosService');

// Comandos válidos para grupos
const GROUP_COMMANDS = {
    CONFIRMAR: '/confirmar',
    RESERVAR: '/reservar',
    CANCELAR: '/cancelar'
};

// Manejadores específicos para comandos de grupo
const groupCommandHandlers = {
    [GROUP_COMMANDS.CONFIRMAR]: handleConfirmarCommand,
    [GROUP_COMMANDS.RESERVAR]: handleReservarCommand,
    [GROUP_COMMANDS.CANCELAR]: handleCancelarCommand
};

async function handleGroupCommand(bot, remitente, mensajeTexto) {
    const [command, param] = mensajeTexto.split(' ');

    if (!(command in groupCommandHandlers)) {
        logger.warn(`Comando no válido en grupo: ${mensajeTexto}`);
        await bot.sendMessage(remitente, { 
            text: '❌ Comando no válido. Usa /confirmar, /reservar o /cancelar.' 
        });
        return;
    }

    try {
        await groupCommandHandlers[command](bot, remitente, param);
    } catch (error) {
        logger.error(`Error procesando comando ${command}: ${error.message}`, { error });
        await bot.sendMessage(remitente, { 
            text: '⚠️ Error procesando el comando. Por favor intenta nuevamente.' 
        });
    }
}

async function handleConfirmarCommand(bot, remitente, param) {
    logger.info(`Comando /confirmar recibido con parámetro: ${param || 'ninguno'}`);

    let reservation;
    if (param) {
        reservation = await alojamientosService.getReservationById(param);
        if (!reservation) {
            await bot.sendMessage(remitente, { 
                text: `❌ No se encontró reserva con ID ${param}` 
            });
            return;
        }
    } else {
        reservation = await alojamientosService.getLatestPendingReservation();
        if (!reservation) {
            await bot.sendMessage(remitente, { 
                text: 'ℹ️ No hay reservas pendientes para confirmar' 
            });
            return;
        }
    }

    const success = await alojamientosService.updateReservationStatus(
        reservation.reservation_id, 
        'confirmada'
    );

    if (success) {
        await bot.sendMessage(remitente, { 
            text: `✅ Reserva ${reservation.reservation_id} confirmada y guardada` 
        });
    } else {
        throw new Error('Error al actualizar estado en base de datos');
    }
}

async function handleReservarCommand(bot, remitente) {
    // Implementación futura
    await bot.sendMessage(remitente, { 
        text: '⏳ Comando /reservar en desarrollo' 
    });
}

async function handleCancelarCommand(bot, remitente) {
    // Implementación futura
    await bot.sendMessage(remitente, { 
        text: '⏳ Comando /cancelar en desarrollo' 
    });
}

function extractMessageText(mensajeObj) {
    if (!mensajeObj?.message) return '';

    if (mensajeObj.message.conversation) {
        return mensajeObj.message.conversation.toLowerCase().trim();
    }
    
    if (mensajeObj.message.extendedTextMessage?.text) {
        return mensajeObj.message.extendedTextMessage.text.toLowerCase().trim();
    }
    
    return '';
}

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
        
        await handleGroupCommand(bot, remitente, mensajeTexto);
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
            mensaje: mensajeTexto || mensaje
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