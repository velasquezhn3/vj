
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

async function handleGroupCommand(bot, remitente, mensajeTexto, mensajeObj) {
    const [command, param] = mensajeTexto.split(' ');

    if (!(command in groupCommandHandlers)) {
        logger.warn(`Comando no válido en grupo: ${mensajeTexto}`);
        await bot.sendMessage(remitente, { 
            text: '❌ Comando no válido. Usa /confirmar, /confirmado, /reservado, /reservar o /cancelar.' 
        });
        return;
    }

    try {
        // Pass mensajeObj to handlers to allow extracting remoteJid
        await groupCommandHandlers[command](bot, remitente, param, mensajeObj);
    } catch (error) {
        logger.error(`Error procesando comando ${command}: ${error.message}`, { error });
        await bot.sendMessage(remitente, { 
            text: '⚠️ Error procesando el comando. Por favor intenta nuevamente.' 
        });
    }
}

const fs = require('fs');
const path = require('path');

async function handleConfirmarCommand(bot, remitente, param, mensajeObj) {
    try {
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

        // Determinar userId: si el comando viene de un grupo, extraer de param limpiando sufijo @s.whatsapp.net, si no usar param tal cual
        let userId;
        if (remitente.endsWith('@g.us')) {
            // En grupo, param puede venir con sufijo @s.whatsapp.net, quitarlo
            userId = param ? param.replace(/@s\.whatsapp\.net$/, '') : undefined;
        } else {
            // En privado, usar param tal cual
            userId = param;
        }

        if (!userId) {
            throw new Error('No se pudo determinar el número de teléfono del usuario');
        }

        // Crear reserva con datos mínimos
        const reservaData = {
            start_date: new Date().toISOString().split('T')[0], // fecha actual como ejemplo
            end_date: new Date().toISOString().split('T')[0],   // fecha actual como ejemplo
            status: 'pendiente',
            total_price: cabins[0].price || 0
        };

        const success = await alojamientosService.addReserva(cabinId, userId, reservaData);
        logger.info(`Resultado de addReserva: ${success}`);

        if (success) {
            // Construir JID del usuario a partir del número limpio
            const userJid = `${userId}@s.whatsapp.net`;

            // Enviar mensaje de confirmación al grupo
            try {
                await bot.sendMessage(GRUPO_JID, {
                    text: `✅ Reserva guardada exitosamente con estado pendiente para el teléfono ${userId}`
                });
                logger.info(`Mensaje de confirmación enviado al grupo ${GRUPO_JID}`);
            } catch (err) {
                logger.error(`Error enviando mensaje de confirmación al grupo ${GRUPO_JID}: ${err.message}`, { err });
            }

            // Enviar mensaje de confirmación al usuario
            try {
                await bot.sendMessage(userJid, { 
                    text: `✅ Reserva guardada exitosamente con estado pendiente para el teléfono ${userId}` 
                });
                logger.info(`Mensaje de confirmación enviado a ${userJid}`);
            } catch (err) {
                logger.error(`Error enviando mensaje de confirmación a ${userJid}: ${err.message}`, { err });
            }

            // Enviar instrucciones de depósito al usuario (independiente)
            const depositInstructions = `Su reserva fue aprobada. Tiene 24 horas para enviar el comprobante de transferencia a los siguientes bancos:
- Ficohsa
- BAC
- Occidente
- Atlántida
Puedes enviar la foto de la reserva en este chat o más adelante, seleccionando la opción 8: Ayuda post-reserva.`;

            try {
                logger.info(`Intentando enviar instrucciones de depósito a ${userJid}`);
                const sent = await bot.sendMessage(userJid, { text: depositInstructions });
                logger.info(`Instrucciones de depósito enviadas a ${userJid}`, { sent });
            } catch (err) {
                logger.error(`Error enviando instrucciones de depósito a ${userJid}: ${err.message}`, { err });
            }

            // Enviar mensaje de prueba al remitente original para verificar conectividad
            try {
                await bot.sendMessage(remitente, { text: 'Mensaje de prueba para verificar conectividad.' });
                logger.info(`Mensaje de prueba enviado a remitente ${remitente}`);
            } catch (err) {
                logger.error(`Error enviando mensaje de prueba a remitente ${remitente}: ${err.message}`, { err });
            }
        } else {
            throw new Error('Error al guardar la reserva en la base de datos');
        }
    } catch (error) {
        logger.error(`Error en handleConfirmarCommand: ${error.message}`, { error });
        await bot.sendMessage(remitente, { text: '⚠️ Error procesando la reserva. Por favor intenta nuevamente.' });
    }
}

async function handleReservarCommand(bot, remitente) {
    // Implementación futura
    await bot.sendMessage(remitente, { 
        text: '⏳ Comando /reservar en desarrollo' 
    });
}

const { eliminarComprobante, actualizarEstado } = require('../../services/comprobanteService');

async function handleCancelarCommand(bot, remitente, telefono) {
    if (!telefono) {
        await bot.sendMessage(remitente, { text: '❌ Por favor proporciona un número de teléfono. Uso: /cancelar [telefono]' });
        return;
    }

    // Buscar reserva pendiente o con comprobante por teléfono
    const reservation = await alojamientosService.getReservationByPhoneAndStatus(telefono, 'comprobante_recibido');
    if (!reservation) {
        await bot.sendMessage(remitente, { text: `❌ No se encontró reserva con comprobante para el teléfono ${telefono}` });
        return;
    }

    try {
        // Eliminar comprobante y actualizar estado a cancelada
        await eliminarComprobante(reservation.reservation_id);

        // Notificar al usuario para enviar comprobante válido
        const userJid = `${telefono}@s.whatsapp.net`;
        await bot.sendMessage(userJid, { 
            text: '❌ Tu comprobante fue rechazado. Por favor envía un comprobante válido para continuar con la reserva.' 
        });

        // Notificar al grupo
        await bot.sendMessage(GRUPO_JID, { 
            text: `❌ Comprobante rechazado para la reserva #${reservation.reservation_id} del teléfono ${telefono}. Se solicitó comprobante válido.` 
        });

        // Confirmar al remitente que la acción fue realizada
        await bot.sendMessage(remitente, { 
            text: `✅ Comprobante eliminado y estado actualizado a cancelada para la reserva #${reservation.reservation_id}.` 
        });
    } catch (error) {
        logger.error(`Error en handleCancelarCommand: ${error.message}`, { error });
        await bot.sendMessage(remitente, { text: '⚠️ Error al procesar la cancelación. Intenta nuevamente.' });
    }
}

async function handleConfirmadoCommand(bot, remitente, telefono, mensajeObj) {
    // Ignore telefono param, use remoteJid from mensajeObj to get full phone number with country code
    const userId = mensajeObj?.key?.remoteJid?.split('@')[0];

    if (!userId) {
        await bot.sendMessage(remitente, { text: '❌ No se pudo obtener el número de teléfono del usuario.' });
        return;
    }

    // Buscar reserva pendiente por teléfono usando userId con código de país
    const reservation = await alojamientosService.getReservationByPhoneAndStatus(userId, 'pendiente');
    if (!reservation) {
        await bot.sendMessage(remitente, { text: `❌ No se encontró reserva pendiente para el teléfono ${userId}` });
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

    const userJid = `${userId}@s.whatsapp.net`;

    try {
        const sent = await bot.sendMessage(userJid, { text: depositMessage });
        logger.info(`Mensaje de instrucciones de depósito enviado a ${userJid}`, { sent });
    } catch (err) {
        logger.error(`Error enviando instrucciones de depósito a ${userJid}: ${err.message}`, { err });
    }
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

    // Actualizar estado a completada
    const success = await alojamientosService.updateReservationStatus(reservation.reservation_id, 'completada');
    if (!success) {
        await bot.sendMessage(remitente, { text: '⚠️ Error al actualizar el estado de la reserva. Intenta nuevamente.' });
        return;
    }

    await bot.sendMessage(remitente, { text: `✅ Reserva #${reservation.reservation_id} completada exitosamente.` });
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
