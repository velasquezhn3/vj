/**
 * Módulo profesional con logger para producción
 */

const { establecerEstado, obtenerEstado, establecerUltimoSaludo, obtenerUltimoSaludo } = require('../services/stateService');
const constants = require('./constants');
const { handleMainMenuOptions } = require('../controllers/mainMenuHandler');
const { exportarReservasAExcel } = require('../services/reservaExportService');
const logger = require('../config/logger'); // Logger profesional
const { enviarMenuPrincipal, enviarMenuCabanas, enviarDetalleCabaña } = require('../services/messagingService');
const { sendActividadDetails } = require('./actividadesController');

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

            case 'actividades':
                if (mensajeTexto.trim() === '0') {
                    await enviarMenuPrincipal(bot, remitente);
                } else {
                    const seleccion = parseInt(mensajeTexto.trim());
                    if (isNaN(seleccion)) {
                        await bot.sendMessage(remitente, { 
                            text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' 
                        });
                    } else {
                        await sendActividadDetails(bot, remitente, seleccion);
                    }
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
