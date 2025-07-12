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
    RESERVADO: '/reservado',
    CANCELAR: '/cancelar'
};

// Manejadores específicos para comandos de grupo
const groupCommandHandlers = {
    [GROUP_COMMANDS.CONFIRMAR]: handleConfirmarCommand,
    [GROUP_COMMANDS.RESERVADO]: handleReservadoCommand,
    [GROUP_COMMANDS.CANCELAR]: handleCancelarCommand
};

async function handleGroupCommand(bot, remitente, mensajeTexto) {
    const [command, param] = mensajeTexto.split(' ');

    if (!(command in groupCommandHandlers)) {
        logger.warn(`Comando no válido en grupo: ${mensajeTexto}`);
        await bot.sendMessage(remitente, { 
            text: '❌ Comando no válido. Usa /confirmar, /confirmado, /reservado, /reservar o /cancelar.' 
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

const fs = require('fs');
const path = require('path');

async function handleConfirmarCommand(bot, remitente, param) {
    logger.info(`Comando /confirmar recibido con parámetro: ${param || 'ninguno'}`);

    // Cargar cabañas
    const cabinsDataPath = path.join(__dirname, '../../data/cabañas.json');
    const cabinsJson = fs.readFileSync(cabinsDataPath, 'utf-8');
    const cabins = JSON.parse(cabinsJson);

    // Asignar cabaña según lógica de personas (ejemplo: 1-3 pers: cab1, 4-6 pers: cab2, 7-9 pers: cab3)
    // Aquí asumimos que el número de personas se pasa como segundo parámetro (param2)
    // Si no se tiene, asignamos la primera cabaña por defecto
    let cabinId = cabins[0].id;

    // Para obtener número de personas, se podría pasar como parte del parámetro o buscar en DB (no implementado)
    // Por simplicidad, asignamos la primera cabaña

    // Usar teléfono como user_id
    const userId = param;

    // Crear reserva con datos mínimos
    const reservaData = {
        start_date: new Date().toISOString().split('T')[0], // fecha actual como ejemplo
        end_date: new Date().toISOString().split('T')[0],   // fecha actual como ejemplo
        status: 'pendiente',
        total_price: 0
    };

    const success = await alojamientosService.addReserva(cabinId, userId, reservaData);

    if (success) {
        await bot.sendMessage(remitente, { 
            text: `✅ Reserva guardada exitosamente con estado pendiente para el teléfono ${param}` 
        });

        // Aquí se podrían enviar instrucciones de depósito si se dispone de más datos
    } else {
        throw new Error('Error al guardar la reserva en la base de datos');
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

async function handleConfirmadoCommand(bot, remitente, telefono) {
    if (!telefono) {
        await bot.sendMessage(remitente, { text: '❌ Por favor proporciona un número de teléfono. Uso: /confirmado [telefono]' });
        return;
    }

    // Buscar reserva pendiente por teléfono
    const reservation = await alojamientosService.getReservationByPhoneAndStatus(telefono, 'pendiente');
    if (!reservation) {
        await bot.sendMessage(remitente, { text: `❌ No se encontró reserva pendiente para el teléfono ${telefono}` });
        return;
    }

    // Confirmar reserva (guardar con estado pendiente si no existe)
    const success = await alojamientosService.updateReservationStatus(reservation.reservation_id, 'pendiente');
    if (!success) {
        await bot.sendMessage(remitente, { text: '⚠️ Error al guardar la reserva. Intenta nuevamente.' });
        return;
    }

    await bot.sendMessage(remitente, { text: `✅ Reserva #${reservation.reservation_id} guardada exitosamente con estado pendiente.` });

    // Enviar instrucciones de depósito al usuario
    const depositAmount = Math.ceil(reservation.total * 0.5);
    const depositMessage = 
`Hola ${reservation.nombre}, tu reserva #${reservation.reservation_id} ha sido guardada con estado pendiente.\n
⚠️ Tienes 24 horas para depositar el 50% ($ ${depositAmount}).\n
Por favor realiza el depósito a la siguiente cuenta:\n
Banco: Banco Ejemplo\n
Número de cuenta: 123456789\n
Titular: Empresa Ejemplo\n
Una vez realizado el depósito, envía el comprobante aquí.`;

    await bot.sendMessage(reservation.telefono, { text: depositMessage });
}

async function handleReservadoCommand(bot, remitente, telefono) {
    if (!telefono) {
        await bot.sendMessage(remitente, { text: '❌ Por favor proporciona un número de teléfono. Uso: /reservado [telefono]' });
        return;
    }

    // Buscar reserva pendiente por teléfono
    const reservation = await alojamientosService.getReservationByPhoneAndStatus(telefono, 'pendiente');
    if (!reservation) {
        await bot.sendMessage(remitente, { text: `❌ No se encontró reserva pendiente para el teléfono ${telefono}` });
        return;
    }

    // Actualizar estado a confirmada
    const success = await alojamientosService.updateReservationStatus(reservation.reservation_id, 'confirmada');
    if (!success) {
        await bot.sendMessage(remitente, { text: '⚠️ Error al actualizar el estado de la reserva. Intenta nuevamente.' });
        return;
    }

    await bot.sendMessage(remitente, { text: `✅ Reserva #${reservation.reservation_id} confirmada exitosamente.` });
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
