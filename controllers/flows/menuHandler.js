const { enviarMenuPrincipal, enviarMenuCabanas, enviarDetalleCabaña } = require('../../services/messagingService');
const { handleMainMenuOptions } = require('../mainMenuHandler');
const { exportarReservasAExcel } = require('../../services/reservaExportService');
const logger = require('../../config/logger');

// Handlers específicos para cada estado
async function handleMenuPrincipal(bot, remitente, mensajeTexto, establecerEstado) {
    if (mensajeTexto.trim() === '1') {
        await enviarMenuCabanas(bot, remitente);
        establecerEstado('LISTA_CABAÑAS');
    } else if (mensajeTexto.trim().toLowerCase() === 'exportar reservas') {
        try {
            const rutaArchivo = await exportarReservasAExcel();
            await bot.sendMessage(remitente, { 
                text: `✅ Reservas exportadas exitosamente.\n📁 Ruta: ${rutaArchivo}` 
            });
        } catch (error) {
            logger.error(`Error exportando reservas: ${error}`, error);
            await bot.sendMessage(remitente, { 
                text: '❌ Error al exportar reservas. Por favor intenta más tarde.' 
            });
        }
    } else {
        await handleMainMenuOptions(bot, remitente, mensajeTexto.trim(), establecerEstado);
    }
}

async function handleListaCabanas(bot, remitente, mensajeTexto, establecerEstado) {
    if (mensajeTexto.trim() === '0') {
        await enviarMenuPrincipal(bot, remitente);
        establecerEstado('MENU_PRINCIPAL');
        return;
    }

    const seleccion = parseInt(mensajeTexto.trim());
    if (isNaN(seleccion)) {
        await bot.sendMessage(remitente, {
            text: '⚠️ Por favor ingresa solo el número de la cabaña.'
        });
        await enviarMenuCabanas(bot, remitente);
    } else {
        await enviarDetalleCabaña(bot, remitente, seleccion);
        establecerEstado('DETALLE_CABAÑA');
    }
}

async function handleDetalleCabana(bot, remitente, mensajeTexto, establecerEstado) {
    const OPCIONES = {
        VOLVER: '1',
        RESERVAR: '2',
        MENU_PRINCIPAL: '0'
    };

    switch (mensajeTexto.trim()) {
        case OPCIONES.VOLVER:
            await enviarMenuCabanas(bot, remitente);
            establecerEstado('LISTA_CABAÑAS');
            break;
            
        case OPCIONES.RESERVAR:
            // Redirect to reservation flow by setting user state to initial reservation state
            {
                const { establecerEstado } = require('../../services/stateService');
                const { ESTADOS_RESERVA } = require('../reservaConstants');
                await establecerEstado(remitente, ESTADOS_RESERVA.FECHAS);
                await bot.sendMessage(remitente, {
                    text: 'Has seleccionado reservar una cabaña. Por favor ingresa las fechas de tu estadía (ej: "20/08/2025 - 25/08/2025"):'
                });
            }
            break;
            
        case OPCIONES.MENU_PRINCIPAL:
            await enviarMenuPrincipal(bot, remitente);
            establecerEstado('MENU_PRINCIPAL');
            break;
            
        default:
            await bot.sendMessage(remitente, {
                text: '⚠️ Opción no válida. Por favor selecciona una opción del menú.'
            });
            // Reenviar menú actual manteniendo el estado
            break;
    }
}

// Handler principal mejorado
async function handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado) {
    try {
        const handlers = {
            'MENU_PRINCIPAL': handleMenuPrincipal,
            'LISTA_CABAÑAS': handleListaCabanas,
            'DETALLE_CABAÑA': handleDetalleCabana
        };

        if (handlers[estado]) {
            await handlers[estado](bot, remitente, mensajeTexto, establecerEstado);
        } else {
            logger.warn(`Estado no manejado: ${estado}`);
        }
    } catch (error) {
        logger.error(`Error en handleMenuState: ${error.message}`, error);
        await bot.sendMessage(remitente, {
            text: '⚠️ Ocurrió un error inesperado. Reiniciando menú...'
        });
        await enviarMenuPrincipal(bot, remitente);
        establecerEstado('MENU_PRINCIPAL');
    }
}

module.exports = {
    handleMenuState
};