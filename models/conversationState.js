/**
 * 💬 MODELO DE ESTADO DE CONVERSACIÓN
 * Gestiona los estados persistentes de las conversaciones de WhatsApp
 */

const path = require('path');
const fs = require('fs');

// Archivo para persistir estados
const STATES_FILE = path.join(__dirname, '..', 'data', 'conversation_states.json');

// Cache en memoria para mejor rendimiento
let statesCache = new Map();
let lastSavedTime = Date.now();
const SAVE_INTERVAL = 30000; // Guardar cada 30 segundos

/**
 * Inicializar el sistema de estados
 */
function initialize() {
  try {
    // Crear directorio data si no existe
    const dataDir = path.dirname(STATES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Cargar estados existentes
    if (fs.existsSync(STATES_FILE)) {
      const data = fs.readFileSync(STATES_FILE, 'utf8');
      const states = JSON.parse(data);
      
      // Cargar en cache
      Object.entries(states).forEach(([key, value]) => {
        statesCache.set(key, value);
      });
      
      console.log(`✅ Estados cargados: ${statesCache.size} conversaciones`);
    }
    
    // Iniciar auto-guardado
    setInterval(saveToFile, SAVE_INTERVAL);
    
  } catch (error) {
    console.error('❌ Error inicializando estados de conversación:', error);
  }
}

/**
 * Establecer estado de conversación
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} state - Estado de la conversación
 * @param {Object} data - Datos adicionales
 * @param {Date} timestamp - Timestamp opcional
 */
async function setState(phoneNumber, state, data = {}, timestamp = new Date()) {
  try {
    const key = `state_${phoneNumber}`;
    const stateData = {
      state,
      data,
      timestamp: timestamp.toISOString(),
      phone_number: phoneNumber,
      last_updated: new Date().toISOString()
    };
    
    statesCache.set(key, stateData);
    
    // Guardar automáticamente si han pasado más de 5 minutos
    if (Date.now() - lastSavedTime > 300000) {
      await saveToFile();
    }
    
    return stateData;
  } catch (error) {
    console.error('❌ Error estableciendo estado:', error);
    throw error;
  }
}

/**
 * Obtener estado de conversación
 * @param {string} phoneNumber - Número de teléfono
 * @returns {Object|null} Estado de la conversación
 */
function getState(phoneNumber) {
  try {
    const key = `state_${phoneNumber}`;
    const state = statesCache.get(key);
    
    if (state) {
      // Verificar si el estado no ha expirado (24 horas)
      const stateTime = new Date(state.timestamp);
      const now = new Date();
      const hoursDiff = (now - stateTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Estado expirado, eliminarlo
        statesCache.delete(key);
        return null;
      }
    }
    
    return state || null;
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
    return null;
  }
}

/**
 * Limpiar estado de conversación
 * @param {string} phoneNumber - Número de teléfono
 */
function clearState(phoneNumber) {
  try {
    const key = `state_${phoneNumber}`;
    return statesCache.delete(key);
  } catch (error) {
    console.error('❌ Error limpiando estado:', error);
    return false;
  }
}

/**
 * Limpiar estados expirados
 * @param {number} maxAgeHours - Edad máxima en horas (default: 24)
 * @returns {number} Cantidad de estados eliminados
 */
function clearExpired(maxAgeHours = 24) {
  try {
    let cleared = 0;
    const now = new Date();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    for (const [key, state] of statesCache.entries()) {
      const stateTime = new Date(state.timestamp);
      if (now - stateTime > maxAgeMs) {
        statesCache.delete(key);
        cleared++;
      }
    }
    
    console.log(`🧹 Estados expirados limpiados: ${cleared}`);
    return cleared;
  } catch (error) {
    console.error('❌ Error limpiando estados expirados:', error);
    return 0;
  }
}

/**
 * Obtener todos los estados activos
 * @returns {Array} Array de estados
 */
function getAllStates() {
  try {
    return Array.from(statesCache.values());
  } catch (error) {
    console.error('❌ Error obteniendo todos los estados:', error);
    return [];
  }
}

/**
 * Guardar estados en archivo
 */
async function saveToFile() {
  try {
    const states = {};
    statesCache.forEach((value, key) => {
      states[key] = value;
    });
    
    await fs.promises.writeFile(STATES_FILE, JSON.stringify(states, null, 2));
    lastSavedTime = Date.now();
    
    console.log(`💾 Estados guardados: ${Object.keys(states).length} conversaciones`);
  } catch (error) {
    console.error('❌ Error guardando estados:', error);
  }
}

/**
 * Obtener estadísticas de estados
 * @returns {Object} Estadísticas
 */
function getStats() {
  try {
    const states = Array.from(statesCache.values());
    const now = new Date();
    
    const stats = {
      total: states.length,
      active_last_hour: 0,
      active_last_day: 0,
      by_state: {}
    };
    
    states.forEach(state => {
      const stateTime = new Date(state.timestamp);
      const hoursDiff = (now - stateTime) / (1000 * 60 * 60);
      
      if (hoursDiff <= 1) stats.active_last_hour++;
      if (hoursDiff <= 24) stats.active_last_day++;
      
      stats.by_state[state.state] = (stats.by_state[state.state] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return { total: 0, active_last_hour: 0, active_last_day: 0, by_state: {} };
  }
}

// Inicializar al cargar el módulo
initialize();

// Limpiar estados expirados cada hora
setInterval(clearExpired, 60 * 60 * 1000);

module.exports = {
  setState,
  getState,
  clearState,
  clearExpired,
  getAllStates,
  getStats,
  saveToFile
};
