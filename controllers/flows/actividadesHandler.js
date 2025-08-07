const { sendActividadDetails } = require('../../controllers/actividadesController');
const { handleMainMenu } = require('../mainMenuHandler');

async function handleActividadesState(bot, remitente, mensajeTexto, establecerEstado) {
    if (mensajeTexto.trim() === '0') {
        await handleMainMenu(bot, remitente, 'menu');
    } else {
        const seleccion = parseInt(mensajeTexto.trim());
        if (isNaN(seleccion)) {
            await bot.sendMessage(remitente, {
                text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.'
            });
        } else {
            await sendActividadDetails(bot, remitente, seleccion, establecerEstado);
        }
    }
}

module.exports = {
    handleActividadesState
};
