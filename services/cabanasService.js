const path = require('path');
const logger = require('../config/logger');

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

module.exports = {
    cargarCabanas
};
