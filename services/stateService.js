/**
 * Servicio de estados - Ahora usa persistencia en BD
 * 
 * MIGRADO: Este archivo ahora redirige al nuevo sistema persistente
 * Backup del original disponible en: stateService.backup.js
 */

// Importar el nuevo servicio persistente
const persistentStateService = require('./persistentStateService');

// Re-exportar las funciones para mantener compatibilidad
module.exports = {
  establecerEstado: persistentStateService.establecerEstado,
  obtenerEstado: persistentStateService.obtenerEstado,
  establecerUltimoSaludo: persistentStateService.establecerUltimoSaludo,
  obtenerUltimoSaludo: persistentStateService.obtenerUltimoSaludo,
  
  // Funciones adicionales del nuevo sistema
  initializeStateTables: persistentStateService.initializeStateTables,
  cleanupExpiredStates: persistentStateService.cleanupExpiredStates,
  getStateStatistics: persistentStateService.getStateStatistics
};

// Mensaje de información
console.log('🔄 [StateService] Usando sistema de estados persistente en BD');
