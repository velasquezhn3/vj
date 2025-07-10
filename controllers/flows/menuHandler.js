const { enviarMenuPrincipal, enviarMenuCabanas, enviarDetalleCabaña } = require('../../services/messagingService');
const { handleMainMenuOptions } = require('../mainMenuHandler');
const { exportarReservasAExcel } = require('../../services/reservaExportService');
const logger = require('../../config/logger');

async function handleMenuState(bot, remitente, mensajeTexto, estado, establecerEstado) {
    switch (estado) {
        case 'MENU_PRINCIPAL': {
            if (mensajeTexto.trim() === '1') {
                // Mostrar menú de alojamientos directamente
                await enviarMenuCabanas(bot, remitente);
            } else if (mensajeTexto.trim().toLowerCase() === 'exportar reservas') {
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
        }

        case 'LISTA_CABAÑAS': {
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
        }

        case 'DETALLE_CABAÑA': {
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
                    await bot.sendMessage(bot, {
                        text: '⚠️ Opción no reconocida. Por favor selecciona una opción válida.'
                    });
                    if (datos && datos.seleccion) {
                        await enviarDetalleCabaña(bot, remitente, datos.seleccion);
                    } else {
                        await enviarMenuCabanas(bot, remitente);
                    }
                    break;
            }
            break;
        }

        default:
            // Not handled here
            break;
    }
}

module.exports = {
    handleMenuState
};
