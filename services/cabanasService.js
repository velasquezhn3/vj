const path = require('path');
const logger = require('../config/logger');
const { runQuery } = require('../db');
const cabinsDataService = require('./cabinsDataService');

async function cargarCabanas() {
    try {
        // Usar el nuevo servicio de datos de cabañas
        const cabanas = await cabinsDataService.getAllCabins();
        
        // Convertir al formato esperado por el código existente
        const cabanasFormateadas = cabanas.map(cabin => ({
            nombre: cabin.name,
            name: cabin.name,
            capacidad: cabin.capacity,
            capacity: cabin.capacity,
            descripcion: cabin.description,
            description: cabin.description,
            precio: cabin.basePrice,
            basePrice: cabin.basePrice,
            precioPersonaAdicional: cabin.pricePerAdditionalPerson,
            pricePerAdditionalPerson: cabin.pricePerAdditionalPerson,
            fotos: cabin.photos,
            photos: cabin.photos,
            activa: cabin.isActive,
            isActive: cabin.isActive,
            id: cabin.id,
            cabinId: cabin.cabinId || cabin.id
        }));
        
        logger.debug(`Cargadas ${cabanasFormateadas.length} cabañas desde BD`);
        return cabanasFormateadas;
        
    } catch (error) {
        logger.error(`Error cargando cabañas: ${error.message}`, {
            stack: error.stack,
            module: 'cargarCabanas'
        });
        
        // Fallback: intentar cargar desde JSON como último recurso
        try {
            logger.warn('Intentando fallback desde archivo JSON...');
            const cabanasPath = path.resolve(__dirname, '../data/cabañas.json');
            delete require.cache[require.resolve(cabanasPath)];
            const data = require(cabanasPath);
            
            if (!Array.isArray(data)) {
                return Object.values(data);
            }
            return data;
        } catch (fallbackError) {
            logger.error('Fallback JSON también falló:', fallbackError);
            throw new Error('Error al cargar información de cabañas');
        }
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
