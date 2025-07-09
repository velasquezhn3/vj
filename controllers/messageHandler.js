/**
 * Módulo profesional con logger para producción
 */

const { establecerEstado, obtenerEstado, establecerUltimoSaludo, obtenerUltimoSaludo } = require('../services/stateService');
const constants = require('./constants');
const { handleMainMenuOptions } = require('../controllers/mainMenuHandler');
const { exportarReservasAExcel } = require('../services/reservaExportService');
const path = require('path');
const logger = require('../config/logger'); // Logger profesional

// Función segura para cargar datos de cabañas
async function cargarCabanas() {
    try {
        const cabanasPath = path.resolve(__dirname, '../data/cabañas.json');
        delete require.cache[require.resolve(cabanasPath)];
        const data = require(cabanasPath);
        
        if (!Array.isArray(data)) {
            throw new Error('Formato inválido de cabañas: no es un array');
        }
        
        return data;
    } catch (error) {
        logger.error(`Error cargando cabañas: ${error.message}`, {
            stack: error.stack,
            module: 'cargarCabanas'
        });
        throw new Error('Error al cargar información de cabañas');
    }
}

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
                text: '⚠️ No pude cargar el menú principal. Por favor intenta más tarde.' 
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
        const cabañas = await cargarCabanas();
        
        if (cabañas.length === 0) {
            await bot.sendMessage(remitente, { text: '⚠️ No hay cabañas disponibles en este momento.' });
            await enviarMenuPrincipal(bot, remitente);
            return;
        }
        
        await establecerEstado(remitente, 'LISTA_CABAÑAS');
        
        const menuCabanas = `🌴 Cabañas Disponibles:\n` +
            cabañas.map((cabaña, index) => `${index + 1}. ${cabaña.nombre || 'Cabaña sin nombre'}`).join('\n') +
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
                text: '⚠️ No pude cargar la lista de cabañas. Por favor intenta más tarde.' 
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
        const cabañas = await cargarCabanas();
        
        const seleccionNum = parseInt(seleccion);
        if (isNaN(seleccionNum) || seleccionNum < 1 || seleccionNum > cabañas.length) {
            await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
            await enviarMenuCabanas(bot, remitente);
            return;
        }
        
        const cabaña = cabañas[seleccionNum - 1];
        if (!cabaña || typeof cabaña !== 'object') {
            throw new Error('Cabaña seleccionada no válida');
        }
        
        await establecerEstado(remitente, 'DETALLE_CABAÑA', { seleccion: seleccionNum });
        
        const nombre = cabaña.nombre || 'Cabaña sin nombre';
        const tipo = cabaña.tipo || 'Tipo no especificado';
        const descripcion = cabaña.descripcion || 'Descripción no disponible';
        
        let detalles = `🏖️ *${nombre}* (${tipo})\n\n${descripcion}\n\n`;
        detalles += `🔄 ¿Siguiente paso?\n1. ← Ver todas las cabañas\n2. Reservar esta cabaña\n0. Menú principal 🏠`;
        
        try {
            const medios = cabaña.fotos || [];
            const urlsValidas = medios.filter(url => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    logger.warn(`URL inválida en cabaña ${nombre}: ${url}`);
                    return false;
                }
            });

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
                text: 'Selecciona:\n1: Ver más alojamientos\n0: Menú principal\n2: Reservar esta cabaña'
            });
            
            logger.info(`Detalles de cabaña enviados a ${remitente}: ${nombre}`);
            
        } catch (mediaError) {
            logger.error(`Error enviando medios a ${remitente}: ${mediaError.message}`, {
                stack: mediaError.stack,
                userId: remitente
            });
            
            await bot.sendMessage(remitente, { text: detalles });
            await bot.sendMessage(remitente, { 
                text: 'Selecciona:\n1: Ver más alojamientos\n0: Menú principal\n2: Reservar esta cabaña'
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
                text: '⚠️ No pude cargar los detalles de la cabaña. Por favor intenta seleccionar otra.' 
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

async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
    if (!remitente || typeof remitente !== 'string' || remitente.trim() === '') {
        logger.error('Remitente inválido en procesarMensaje', {
            mensaje,
            mensajeObj
        });
        return;
    }

    const mensajeTexto = mensaje || '';
    const textoMinuscula = mensajeTexto.toLowerCase().trim();

    try {
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
            return;
        }

        if (textoMinuscula === 'menu' || textoMinuscula === 'menú') {
            await enviarMenuPrincipal(bot, remitente);
            return;
        }

        const estado = obtenerEstado(remitente) || { estado: 'MENU_PRINCIPAL' };
        logger.debug(`Procesando mensaje de ${remitente}: ${mensajeTexto}`, {
            estado: estado.estado
        });
        
switch (estado.estado) {
      case 'MENU_PRINCIPAL':
                if (mensajeTexto.trim() === '1') {
                    // Mostrar menú de alojamientos directamente
                    await enviarMenuCabanas(bot, remitente);
                } else if (mensajeTexto.trim() === 'exportar reservas') {
                    try {
                        const rutaArchivo = await exportarReservasAExcel();
                        await bot.sendMessage(remitente, { text: `Reservas exportadas exitosamente. Archivo guardado en: ${rutaArchivo}` });
                    } catch (error) {
                        await bot.sendMessage(remitente, { text: 'Error al exportar las reservas. Por favor intenta más tarde.' });
                    }
                } else {
                    await handleMainMenuOptions(bot, remitente, mensajeTexto.trim(), establecerEstado);
                }
                break;

            case 'LISTA_CABAÑAS':
                if (mensajeTexto.trim() === '0') {
                    await enviarMenuPrincipal(bot, remitente);
                } else {
                    const seleccion = parseInt(mensajeTexto.trim());
                    if (isNaN(seleccion)) {
                        await bot.sendMessage(remitente, { 
                            text: '⚠️ Por favor ingresa solo el número de la cabaña que deseas ver.' 
                        });
                        await enviarMenuCabanas(bot, remitente);
                    } else {
                        await enviarDetalleCabaña(bot, remitente, seleccion);
                    }
                }
                break;

            case 'DETALLE_CABAÑA':
                switch (mensajeTexto.trim().toLowerCase()) {
                    case '1':
                        await enviarMenuCabanas(bot, remitente);
                        break;
                    case '2':
                        await bot.sendMessage(remitente, { 
                            text: 'Funcionalidad de reserva aún no implementada. Serás redirigido al menú principal.' 
                        });
                        await enviarMenuPrincipal(bot, remitente);
                        break;
                    case '0':
                        await enviarMenuPrincipal(bot, remitente);
                        break;
                    default:
                        await bot.sendMessage(remitente, { 
                            text: '⚠️ Opción no reconocida. Por favor selecciona una opción válida.' 
                        });
                        if (estado.datos && estado.datos.seleccion) {
                            await enviarDetalleCabaña(bot, remitente, estado.datos.seleccion);
                        } else {
                            await enviarMenuCabanas(bot, remitente);
                        }
                        break;
                }
                break;

            default:
                logger.warn(`Estado no manejado: ${estado.estado}`, {
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
            await establecerEstado(remitente, 'MENU_PRINCIPAL');
            await bot.sendMessage(remitente, { text: constants.MENU_PRINCIPAL });
        } catch (fallbackError) {
            logger.critical(`Error de comunicación crítico con ${remitente}: ${fallbackError.message}`, {
                stack: fallbackError.stack,
                userId: remitente
            });
        }
    }
}

module.exports = {
    enviarMenuPrincipal,
    procesarMensaje
};
