/**
 * Servicio centralizado para datos de cabañas
 * 
 * Reemplaza el uso directo de archivos JSON por acceso a base de datos
 * Proporciona una API unificada para todas las operaciones con cabañas
 */

const path = require('path');
const { runQuery, runExecute } = require('../db');
const logger = require('../config/logger');
const cacheService = require('./cacheService');

class CabinsDataService {
  constructor() {
    this.cache = new Map();
    this.lastCacheUpdate = 0;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Inicializa las tablas de cabañas si no existen
   */
  async initializeTables() {
    try {
      // Las tablas ya existen con este esquema:
      // Cabins: cabin_id, name, capacity, description, price, photos, created_at, updated_at
      // CabinPhotos: photo_id, cabin_id, url, created_at
      
      logger.info('Usando esquema existente de tablas de cabañas');
      
      // Verificar si necesitamos agregar columnas faltantes
      try {
        await runQuery('SELECT base_price FROM Cabins LIMIT 1');
      } catch (error) {
        // La columna base_price no existe, agregarla
        logger.info('Agregando columnas faltantes a tabla Cabins...');
        await runExecute('ALTER TABLE Cabins ADD COLUMN base_price REAL DEFAULT 0');
        await runExecute('ALTER TABLE Cabins ADD COLUMN price_per_additional_person REAL DEFAULT 0');
        await runExecute('ALTER TABLE Cabins ADD COLUMN is_active BOOLEAN DEFAULT true');
        
        // Migrar datos existentes
        await runExecute('UPDATE Cabins SET base_price = price WHERE base_price = 0');
      }
      
      logger.info('Tablas de cabañas verificadas correctamente');
      
    } catch (error) {
      logger.error('Error inicializando tablas de cabañas:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las cabañas activas con cache mejorado
   */
  async getAllCabins() {
    const cacheKey = 'cabins:all';
    
    try {
      // Intentar obtener del cache mejorado primero
      return await cacheService.wrap(cacheKey, async () => {
        const cabins = await runQuery(`
          SELECT 
            c.*,
            GROUP_CONCAT(cp.url) as photos_urls
          FROM Cabins c
          LEFT JOIN CabinPhotos cp ON c.cabin_id = cp.cabin_id
          WHERE (c.is_active IS NULL OR c.is_active = 1)
          GROUP BY c.cabin_id
          ORDER BY c.name
        `);

        // Procesar datos para formato compatible
        const processedCabins = cabins.map(cabin => ({
          id: cabin.cabin_id,
          cabinId: cabin.cabin_id,
          name: cabin.name,
          capacity: cabin.capacity,
          description: cabin.description || '',
          amenities: [], // No hay amenities en el esquema actual
          basePrice: cabin.base_price || cabin.price || 0,
          pricePerAdditionalPerson: cabin.price_per_additional_person || 0,
          photos: cabin.photos ? cabin.photos.split(',') : (cabin.photos_urls ? cabin.photos_urls.split(',') : []),
          isActive: cabin.is_active !== 0,
          createdAt: cabin.created_at,
          updatedAt: cabin.updated_at
        }));

        logger.debug(`Obtenidas ${processedCabins.length} cabañas desde BD`);
        return processedCabins;
      });

    } catch (error) {
      logger.error('Error obteniendo cabañas:', error);
      
      // Fallback: intentar leer desde JSON como backup
      try {
        const jsonPath = path.join(__dirname, '../data/cabañas.json');
        const fs = require('fs');
        if (fs.existsSync(jsonPath)) {
          logger.warn('Usando fallback de archivo JSON para cabañas');
          const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          return Object.values(jsonData);
        }
      } catch (fallbackError) {
        logger.error('Error en fallback JSON:', fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Obtiene una cabaña por nombre
   */
  async getCabinByName(name) {
    try {
      const allCabins = await this.getAllCabins();
      return allCabins.find(cabin => 
        cabin.name.toLowerCase() === name.toLowerCase()
      );
    } catch (error) {
      logger.error(`Error obteniendo cabaña ${name}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene una cabaña por ID
   */
  async getCabinById(id) {
    try {
      const cabin = await runQuery(`
        SELECT 
          c.*,
          GROUP_CONCAT(cp.url) as photos_urls
        FROM Cabins c
        LEFT JOIN CabinPhotos cp ON c.cabin_id = cp.cabin_id
        WHERE c.cabin_id = ? AND (c.is_active IS NULL OR c.is_active = 1)
        GROUP BY c.cabin_id
      `, [id]);

      if (cabin.length === 0) {
        return null;
      }

      const cabinData = cabin[0];
      return {
        id: cabinData.cabin_id,
        cabinId: cabinData.cabin_id,
        name: cabinData.name,
        capacity: cabinData.capacity,
        description: cabinData.description || '',
        amenities: [],
        basePrice: cabinData.base_price || cabinData.price || 0,
        pricePerAdditionalPerson: cabinData.price_per_additional_person || 0,
        photos: cabinData.photos ? cabinData.photos.split(',') : (cabinData.photos_urls ? cabinData.photos_urls.split(',') : []),
        isActive: cabinData.is_active !== 0
      };

    } catch (error) {
      logger.error(`Error obteniendo cabaña ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Migra datos desde JSON a base de datos
   */
  async migrateFromJSON() {
    try {
      logger.info('Iniciando migración de datos JSON a BD...');
      
      const jsonPath = path.join(__dirname, '../data/cabañas.json');
      const fs = require('fs');
      
      if (!fs.existsSync(jsonPath)) {
        logger.warn('No se encontró archivo JSON de cabañas para migrar');
        return;
      }

      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      let migratedCount = 0;

      for (const [key, cabinData] of Object.entries(jsonData)) {
        try {
          // Verificar si ya existe
          const existing = await runQuery(
            'SELECT cabin_id FROM Cabins WHERE name = ?', 
            [cabinData.name || key]
          );

          if (existing.length > 0) {
            logger.debug(`Cabaña ${cabinData.name || key} ya existe, saltando...`);
            continue;
          }

          // Insertar cabaña usando el esquema existente
          const result = await runExecute(`
            INSERT INTO Cabins 
            (name, capacity, description, price, base_price, price_per_additional_person, is_active, photos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            cabinData.name || key,
            cabinData.capacidad || cabinData.capacity || 2,
            cabinData.descripcion || cabinData.description || '',
            cabinData.precio || cabinData.basePrice || 0,
            cabinData.precio || cabinData.basePrice || 0,
            cabinData.precioPersonaAdicional || cabinData.pricePerAdditionalPerson || 0,
            cabinData.activa !== false ? 1 : 0,
            Array.isArray(cabinData.fotos) ? cabinData.fotos.join(',') : ''
          ]);

          const cabinId = result.lastID;

          // Insertar fotos adicionales si existen (además de las ya incluidas en la columna photos)
          if (cabinData.fotos && Array.isArray(cabinData.fotos)) {
            for (let i = 0; i < cabinData.fotos.length; i++) {
              await runExecute(`
                INSERT INTO CabinPhotos (cabin_id, url)
                VALUES (?, ?)
              `, [cabinId, cabinData.fotos[i]]);
            }
          }

          migratedCount++;
          logger.debug(`Migrada cabaña: ${cabinData.name || key}`);

        } catch (cabinError) {
          logger.error(`Error migrando cabaña ${key}:`, cabinError);
        }
      }

      // Limpiar cache
      this.cache.clear();
      this.lastCacheUpdate = 0;

      logger.info(`Migración completada. ${migratedCount} cabañas migradas.`);
      return migratedCount;

    } catch (error) {
      logger.error('Error en migración JSON a BD:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de cabañas
   */
  async getStatistics() {
    try {
      const stats = await runQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN (is_active IS NULL OR is_active = 1) THEN 1 END) as active,
          COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive,
          AVG(capacity) as avgCapacity,
          MIN(COALESCE(base_price, price)) as minPrice,
          MAX(COALESCE(base_price, price)) as maxPrice
        FROM Cabins
      `);

      const photosCount = await runQuery(`
        SELECT COUNT(*) as total FROM CabinPhotos
      `);

      return {
        totalCabins: stats[0]?.total || 0,
        activeCabins: stats[0]?.active || 0,
        inactiveCabins: stats[0]?.inactive || 0,
        averageCapacity: Math.round(stats[0]?.avgCapacity || 0),
        priceRange: {
          min: stats[0]?.minPrice || 0,
          max: stats[0]?.maxPrice || 0
        },
        totalPhotos: photosCount[0]?.total || 0,
        cacheSize: this.cache.size,
        lastCacheUpdate: this.lastCacheUpdate
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas de cabañas:', error);
      return {
        totalCabins: 0,
        activeCabins: 0,
        inactiveCabins: 0,
        averageCapacity: 0,
        priceRange: { min: 0, max: 0 },
        totalPhotos: 0,
        cacheSize: this.cache.size,
        lastCacheUpdate: this.lastCacheUpdate
      };
    }
  }

  /**
   * Limpia el cache mejorado y legacy
   */
  clearCache() {
    // Limpiar cache legacy
    this.cache.clear();
    this.lastCacheUpdate = 0;
    
    // Limpiar cache mejorado por patrón
    cacheService.deletePattern('cabins:');
    
    logger.debug('Cache de cabañas limpiado (legacy + mejorado)');
  }
}

// Crear instancia singleton
const cabinsDataService = new CabinsDataService();

module.exports = cabinsDataService;
