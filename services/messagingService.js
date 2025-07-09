const logger = require('../config/logger');
const constants = require('../controllers/constants');
const { establecerEstado } = require('./stateService');
const { cargarCabanas } = require('./cabanasService');
const { isValidUrl } = require('../utils/utils');

async function enviarMenuPrincipal(bot, remitente) {
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
        const cabanas = await cargarCabanas();
        
        if (cabanas.length === 0) {
            await bot.sendMessage(remitente, { text: constants.ERROR_NO_CABANAS });
            await enviarMenuPrincipal(bot, remitente);
            return;
        }
        
        await establecerEstado(remitente, 'LISTA_CABAÑAS');
        
        const menuCabanas = `🌴 Cabañas Disponibles:\n` +
            cabanas.map((cabaña, index) => `${index + 1}. ${cabaña.nombre || 'Cabaña sin nombre'}`).join('\n') +
            `\n0. Volver ↩️\nPor favor, selecciona el número de la cabaña para ver más detalles.`;
        
        await bot.sendMessage(remitente, { text: menuCabanas });
        logger.info(`Menú cabañas enviado a ${remitente}`);
        
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
        const cabanas = await cargarCabanas();
        
        const seleccionNum = parseInt(seleccion);
        if (isNaN(seleccionNum) || seleccionNum < 1 || seleccionNum > cabanas.length) {
            await bot.sendMessage(remitente, { text: constants.ERROR_SELECCION_INVALIDA });
            await enviarMenuCabanas(bot, remitente);
            return;
        }
        
        const cabaña = cabanas[seleccionNum - 1];
        if (!cabaña || typeof cabaña !== 'object') {
            throw new Error('Cabaña seleccionada no válida');
        }
        
        await establecerEstado(remitente, 'DETALLE_CABAÑA', { seleccion: seleccionNum });
        
        const nombre = cabaña.nombre || 'Cabaña sin nombre';
        const tipo = cabaña.tipo || 'Tipo no especificado';
        const descripcion = cabaña.descripcion || 'Descripción no disponible';
        
        let detalles = `🏖️ *${nombre}* (${tipo})\n\n${descripcion}\n\n` +
            `🔄 ¿Siguiente paso?\n1. ← Ver todas las cabañas\n2. Reservar esta cabaña\n0. Menú principal 🏠`;
        
        try {
            const medios = cabaña.fotos || [];
            const urlsValidas = medios.filter(url => isValidUrl(url));

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
