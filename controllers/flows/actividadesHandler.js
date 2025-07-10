const { sendActividadDetails } = require('../../controllers/actividadesController');

async function handleActividadesState(bot, remitente, mensajeTexto) {
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
}

module.exports = {
    handleActividadesState
};
