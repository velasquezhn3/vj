/**
 * Servicio de Cache Mejorado con TTL y gestión automática
 * Bot VJ - Sistema de Reservas Villas Julie
 * 
 * Características:
 * - TTL (Time To Live) configurable
 * - Limpieza automática de entradas expiradas
 * - Métricas de hit/miss ratio
 * - Soporte para diferentes tipos de datos
 */

const logger = require('../config/logger');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // TTL por defecto: 10 minutos
    this.defaultTTL = 10 * 60 * 1000;
    
    // Configuraciones específicas por tipo
    this.ttlConfig = {
      'cabins': 30 * 60 * 1000,      // 30 minutos - datos semi-estáticos
      'reservations': 5 * 60 * 1000,  // 5 minutos - datos dinámicos
      'users': 15 * 60 * 1000,       // 15 minutos - datos de usuario
      'states': 2 * 60 * 1000,       // 2 minutos - estados de conversación
      'dashboard': 1 * 60 * 1000      // 1 minuto - métricas dashboard
    };
    
    // Iniciar limpieza automática cada 5 minutos
    this.startPeriodicCleanup();
    
    logger.info('CacheService iniciado con TTL automático');
  }
  
  /**
   * Establecer valor en cache con TTL
   */
  set(key, value, customTTL = null) {
    try {
      const ttl = customTTL || this.getTTLForKey(key) || this.defaultTTL;
      const expiresAt = Date.now() + ttl;
      
      this.cache.set(key, {
        value: this.serializeValue(value),
        expiresAt,
        createdAt: Date.now(),
        accessCount: 0
      });
      
      this.stats.sets++;
      
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms)`);
      return true;
    } catch (error) {
      logger.error('Error setting cache:', { key, error: error.message });
      return false;
    }
  }
  
  /**
   * Obtener valor del cache
   */
  get(key) {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        logger.debug(`Cache MISS: ${key}`);
        return null;
      }
      
      // Verificar expiración
      if (item.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.deletes++;
        logger.debug(`Cache EXPIRED: ${key}`);
        return null;
      }
      
      // Incrementar contador de acceso
      item.accessCount++;
      this.stats.hits++;
      
      logger.debug(`Cache HIT: ${key} (accesos: ${item.accessCount})`);
      return this.deserializeValue(item.value);
      
    } catch (error) {
      logger.error('Error getting cache:', { key, error: error.message });
      this.stats.misses++;
      return null;
    }
  }
  
  /**
   * Verificar si existe en cache
   */
  has(key) {
    const item = this.cache.get(key);
    return item && item.expiresAt > Date.now();
  }
  
  /**
   * Eliminar entrada específica
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      logger.debug(`Cache DELETE: ${key}`);
    }
    return deleted;
  }
  
  /**
   * Limpiar cache por patrón
   */
  deletePattern(pattern) {
    let deleted = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    logger.info(`Cache pattern delete: ${pattern} (${deleted} entradas)`);
    return deleted;
  }
  
  /**
   * Limpiar cache completo
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    logger.info(`Cache cleared: ${size} entradas eliminadas`);
  }
  
  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    const { hits, misses, sets, deletes } = this.stats;
    const total = hits + misses;
    const hitRatio = total > 0 ? (hits / total * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      hits,
      misses,
      sets,
      deletes,
      hitRatio: `${hitRatio}%`,
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  /**
   * Obtener TTL específico para una clave
   */
  getTTLForKey(key) {
    for (const [type, ttl] of Object.entries(this.ttlConfig)) {
      if (key.includes(type)) {
        return ttl;
      }
    }
    return this.defaultTTL;
  }
  
  /**
   * Serializar valor para almacenamiento
   */
  serializeValue(value) {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }
  
  /**
   * Deserializar valor del almacenamiento
   */
  deserializeValue(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
  
  /**
   * Estimar uso de memoria
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      totalSize += key.length;
      totalSize += JSON.stringify(item).length;
    }
    
    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
  
  /**
   * Limpieza automática de entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.stats.deletes += cleaned;
      logger.info(`Cache cleanup: ${cleaned} entradas expiradas eliminadas`);
    }
    
    return cleaned;
  }
  
  /**
   * Iniciar limpieza periódica
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cada 5 minutos
    
    logger.info('Cache periodic cleanup iniciado');
  }
  
  /**
   * Wrapper para funciones con cache automático
   */
  async wrap(key, asyncFunction, customTTL = null) {
    // Intentar obtener del cache primero
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    try {
      // Ejecutar función y guardar resultado
      const result = await asyncFunction();
      this.set(key, result, customTTL);
      return result;
    } catch (error) {
      logger.error('Error in cache wrap:', { key, error: error.message });
      throw error;
    }
  }
}

// Instancia singleton
const cacheService = new CacheService();

module.exports = cacheService;
