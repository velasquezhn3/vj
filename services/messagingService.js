const logger = require('../config/logger');
const constants = require('../controllers/constants');
const { establecerEstado } = require('./stateService');
const { loadMenuCabinTypes } = require('./menuCabinTypesService');
const { isValidUrl } = require('../utils/utils');

async function enviarMenuPrincipal(bot, remitente) {
    const GRUPO_JID = '120363420483868468@g.us'; // Ensure this matches your group JID
    if (remitente === GRUPO_JID) {
        // Prevent sending menu to group
        logger.warn(`Intento de enviar menú principal al grupo ${remitente} bloqueado.`);
        return;
    }
    try {
        await establecerEstado(remitente, 'MENU_PRINCIPAL');
        await bot.sendMessage(remitente, { text: constants.MENU_PRINCIPAL });
        logger.info(`Menú principal enviado a ${remitente}`);
    } catch (error) {
        logger.error(`Error enviando menú principal a ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente
        });
        try {
            await bot.sendMessage(remitente, { 
                text: constants.ERROR_MENU_PRINCIPAL 
            });
        } catch (fallbackError) {
            logger.critical(`Error crítico de comunicación con ${remitente}: ${fallbackError.message}`, {
                stack: fallbackError.stack,
                userId: remitente
            });
        }
    }
}

async function enviarMenuCabanas(bot, remitente) {
    try {
        const tipos = await loadMenuCabinTypes();
        
        if (tipos.length === 0) {
            await bot.sendMessage(remitente, { text: constants.ERROR_NO_CABANAS });
            await enviarMenuPrincipal(bot, remitente);
            return;
        }
        
        await establecerEstado(remitente, 'LISTA_CABAÑAS');
        
        const menuCabanas = `�️ Villas Julie - Opciones de Alojamiento\n\n` +
            tipos.map((tipo, index) => `${index + 1}. ${tipo.nombre}`).join('\n') +
            `\n\n0. Volver ↩️\nPor favor selecciona el número de la opción que te interesa:`;
        
        await bot.sendMessage(remitente, { text: menuCabanas });
        logger.info(`Menú tipos de cabañas enviado a ${remitente} - ${tipos.length} opciones`);
        
    } catch (error) {
        logger.error(`Error enviando menú de cabañas a ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente
        });
        try {
            await bot.sendMessage(remitente, { 
                text: constants.ERROR_CARGAR_CABANAS 
            });
            await enviarMenuPrincipal(bot, remitente);
        } catch (fallbackError) {
            logger.critical(`Error de comunicación con ${remitente}: ${fallbackError.message}`, {
                stack: fallbackError.stack,
                userId: remitente
            });
        }
    }
}

async function enviarDetalleCabaña(bot, remitente, seleccion) {
    try {
        const tipos = await loadMenuCabinTypes();
        
        const seleccionNum = parseInt(seleccion);
        if (isNaN(seleccionNum) || seleccionNum < 1 || seleccionNum > tipos.length) {
            await bot.sendMessage(remitente, { text: constants.ERROR_SELECCION_INVALIDA });
            await enviarMenuCabanas(bot, remitente);
            return;
        }
        
        const tipo = tipos[seleccionNum - 1];
        if (!tipo || typeof tipo !== 'object') {
            throw new Error('Tipo de cabaña seleccionado no válido');
        }
        
        await establecerEstado(remitente, 'DETALLE_CABAÑA', { seleccion: seleccionNum });
        
        const nombre = tipo.nombre || 'Cabaña sin nombre';
        const tipoDesc = tipo.tipo || 'Tipo no especificado';
        const descripcion = tipo.descripcion || 'Descripción no disponible';
        const precio = tipo.precio_noche ? `HNL ${tipo.precio_noche.toLocaleString()}` : 'Precio no disponible';
        
        let detalles = `🏖️ *${nombre}*\n\n` +
            `👥 Capacidad: ${tipo.capacidad} personas\n` +
            `🛏️ Habitaciones: ${tipo.habitaciones} | 🚿 Baños: ${tipo.baños}\n` +
            `💰 Precio por noche: ${precio}\n\n` +
            `${descripcion}\n\n` +
            `🔄 ¿Siguiente paso?\n1. ← Ver todas las cabañas\n2. Reservar esta cabaña\n0. Menú principal 🏠`;
        
        try {
            const fotos = Array.isArray(tipo.fotos) ? tipo.fotos : (tipo.fotos ? JSON.parse(tipo.fotos) : []);
            const urlsValidas = fotos.filter(url => isValidUrl(url));

            const imageUrls = urlsValidas.filter(url => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
            const videoUrls = urlsValidas.filter(url => /\.(mp4|mov|avi|mkv)$/i.test(url));

            if (imageUrls.length > 0) {
                await bot.sendMessage(remitente, {
                    image: { url: imageUrls[0] },
                    caption: detalles
                });
                
                for (let i = 1; i < imageUrls.length; i++) {
                    await bot.sendMessage(remitente, {
                        image: { url: imageUrls[i] }
                    });
                }
            } else {
                await bot.sendMessage(remitente, { text: detalles });
            }

            for (const videoUrl of videoUrls) {
                try {
                    await bot.sendMessage(remitente, {
                        video: { url: videoUrl }
                    });
                } catch (videoError) {
                    logger.warn(`Error enviando video a ${remitente}: ${videoError.message}`, {
                        url: videoUrl
                    });
                }
            }
            
            await bot.sendMessage(remitente, { 
                text: constants.SELECCION_DETALLE_OPCIONES
            });
            
            logger.info(`Detalles de cabaña enviados a ${remitente}: ${nombre}`);
            
        } catch (mediaError) {
            logger.error(`Error enviando medios a ${remitente}: ${mediaError.message}`, {
                stack: mediaError.stack,
                userId: remitente
            });
            
            await bot.sendMessage(remitente, { text: detalles });
            await bot.sendMessage(remitente, { 
                text: constants.SELECCION_DETALLE_OPCIONES
            });
        }
        
    } catch (error) {
        logger.error(`Error enviando detalles de cabaña a ${remitente}: ${error.message}`, {
            stack: error.stack,
            userId: remitente,
            seleccion
        });
        try {
            await bot.sendMessage(remitente, { 
                text: constants.ERROR_CARGAR_DETALLE_CABANA 
            });
            await enviarMenuCabanas(bot, remitente);
        } catch (fallbackError) {
            logger.critical(`Error de comunicación con ${remitente}: ${fallbackError.message}`, {
                stack: fallbackError.stack,
                userId: remitente
            });
        }
    }
}

module.exports = {
    enviarMenuPrincipal,
    enviarMenuCabanas,
    enviarDetalleCabaña
};
