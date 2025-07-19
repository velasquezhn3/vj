const path = require('path');
const logger = require('../config/logger');
const { runQuery } = require('../db');

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

async function getCabinIdByName(name) {
    try {
        const sql = 'SELECT cabin_id FROM Cabins WHERE name LIKE ? LIMIT 1';
        const rows = await runQuery(sql, [name + '%']);
        if (rows.length === 0) {
            return null;
        }
        return rows[0].cabin_id;
    } catch (error) {
        logger.error(`Error buscando cabin_id por nombre: ${error.message}`, {
            stack: error.stack,
            module: 'getCabinIdByName'
        });
        throw new Error('Error al buscar ID de cabaña');
    }
}

module.exports = {
    cargarCabanas,
    getCabinIdByName
};
