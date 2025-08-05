/**
 * 📊 ESTADÍSTICAS DEL BOT
 * Sistema de métricas y estadísticas de uso del bot de WhatsApp
 */

const db = require('../db');
const path = require('path');
const fs = require('fs');

// Archivo para estadísticas diarias
const STATS_FILE = path.join(__dirname, '..', 'data', 'bot_stats.json');

/**
 * Obtener estadísticas diarias
 * @param {string} date - Fecha en formato YYYY-MM-DD (opcional, default: hoy)
 * @returns {Promise<Object>} Estadísticas del día
 */
async function getDailyStats(date = null) {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Estadísticas de mensajes (simuladas por ahora)
    const messageStats = await getMessageStats(targetDate);
    
    // Estadísticas de reservas
    const reservationStats = await getReservationStats(targetDate);
    
    // Estadísticas de usuarios
    const userStats = await getUserStats(targetDate);
    
    // Estadísticas de uso por hora
    const hourlyStats = await getHourlyStats(targetDate);
    
    return {
      date: targetDate,
      timestamp: new Date().toISOString(),
      messages: messageStats,
      reservations: reservationStats,
      users: userStats,
      hourly: hourlyStats,
      summary: {
        total_interactions: messageStats.total + reservationStats.total,
        conversion_rate: calculateConversionRate(messageStats.total, reservationStats.total),
        peak_hour: getPeakHour(hourlyStats),
        active_users: userStats.unique_users
      }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas diarias:', error);
    return getEmptyStats(date);
  }
}

/**
 * Obtener estadísticas de mensajes
 * @param {string} date - Fecha
 * @returns {Promise<Object>} Stats de mensajes
 */
async function getMessageStats(date) {
  try {
    // Por ahora simulamos datos, en producción se conectaría a logs reales
    const baseMessages = Math.floor(Math.random() * 200) + 50;
    
    return {
      total: baseMessages,
      by_type: {
        text: Math.floor(baseMessages * 0.7),
        commands: Math.floor(baseMessages * 0.2),
        media: Math.floor(baseMessages * 0.1)
      },
      by_intent: {
        reservation_inquiry: Math.floor(baseMessages * 0.4),
        cabin_info: Math.floor(baseMessages * 0.3),
        support: Math.floor(baseMessages * 0.2),
        other: Math.floor(baseMessages * 0.1)
      },
      response_time_avg: Math.random() * 3 + 1, // 1-4 segundos
      success_rate: 0.95 + Math.random() * 0.05 // 95-100%
    };
    
  } catch (error) {
    console.error('❌ Error en estadísticas de mensajes:', error);
    return { total: 0, by_type: {}, by_intent: {}, response_time_avg: 0, success_rate: 0 };
  }
}

/**
 * Obtener estadísticas de reservas
 * @param {string} date - Fecha
 * @returns {Promise<Object>} Stats de reservas
 */
async function getReservationStats(date) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        AVG(total_price) as avg_price,
        SUM(total_price) as total_revenue
      FROM Reservations 
      WHERE DATE(created_at) = ?
    `;
    
    const stats = await new Promise((resolve, reject) => {
      db.get(query, [date], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
    
    return {
      total: stats.total || 0,
      by_status: {
        pending: stats.pending || 0,
        confirmed: stats.confirmed || 0,
        cancelled: stats.cancelled || 0
      },
      revenue: {
        total: stats.total_revenue || 0,
        average: stats.avg_price || 0
      },
      conversion_rate: calculateReservationConversion(stats.confirmed, stats.total)
    };
    
  } catch (error) {
    console.error('❌ Error en estadísticas de reservas:', error);
    return { total: 0, by_status: {}, revenue: {}, conversion_rate: 0 };
  }
}

/**
 * Obtener estadísticas de usuarios
 * @param {string} date - Fecha
 * @returns {Promise<Object>} Stats de usuarios
 */
async function getUserStats(date) {
  try {
    const query = `
      SELECT 
        COUNT(DISTINCT phone_number) as unique_users,
        COUNT(*) as total_interactions
      FROM Reservations 
      WHERE DATE(created_at) = ?
    `;
    
    const stats = await new Promise((resolve, reject) => {
      db.get(query, [date], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
    
    // Simular usuarios adicionales que solo enviaron mensajes pero no reservaron
    const messageOnlyUsers = Math.floor(Math.random() * 20) + 5;
    
    return {
      unique_users: (stats.unique_users || 0) + messageOnlyUsers,
      reservation_users: stats.unique_users || 0,
      inquiry_only_users: messageOnlyUsers,
      returning_users: Math.floor((stats.unique_users || 0) * 0.3), // 30% usuarios recurrentes estimado
      new_users: Math.floor((stats.unique_users || 0) * 0.7) + messageOnlyUsers // 70% nuevos
    };
    
  } catch (error) {
    console.error('❌ Error en estadísticas de usuarios:', error);
    return { unique_users: 0, reservation_users: 0, inquiry_only_users: 0, returning_users: 0, new_users: 0 };
  }
}

/**
 * Obtener estadísticas por hora
 * @param {string} date - Fecha
 * @returns {Promise<Array>} Stats por hora
 */
async function getHourlyStats(date) {
  try {
    const hourlyData = [];
    
    for (let hour = 0; hour < 24; hour++) {
      // Simular patrones realistas de uso
      let activity = 0;
      
      if (hour >= 6 && hour <= 22) { // Horario activo 6 AM - 10 PM
        activity = Math.floor(Math.random() * 15) + 5;
        
        // Picos de actividad
        if (hour >= 9 && hour <= 11) activity *= 1.5; // Mañana
        if (hour >= 14 && hour <= 16) activity *= 1.3; // Tarde
        if (hour >= 19 && hour <= 21) activity *= 1.8; // Noche
      } else {
        activity = Math.floor(Math.random() * 3); // Actividad nocturna mínima
      }
      
      hourlyData.push({
        hour: hour,
        messages: Math.floor(activity),
        reservations: Math.floor(activity * 0.2), // 20% de mensajes resultan en reserva
        unique_users: Math.floor(activity * 0.6) // Múltiples mensajes por usuario
      });
    }
    
    return hourlyData;
    
  } catch (error) {
    console.error('❌ Error en estadísticas por hora:', error);
    return [];
  }
}

/**
 * Obtener estadísticas semanales
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @returns {Promise<Object>} Stats de la semana
 */
async function getWeeklyStats(startDate) {
  try {
    const weekStats = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayStats = await getDailyStats(dateStr);
      weekStats.push({
        date: dateStr,
        day_name: currentDate.toLocaleDateString('es-CR', { weekday: 'long' }),
        ...dayStats.summary
      });
    }
    
    return {
      week_start: startDate,
      week_end: weekStats[6]?.date,
      days: weekStats,
      totals: {
        total_interactions: weekStats.reduce((sum, day) => sum + day.total_interactions, 0),
        total_users: Math.max(...weekStats.map(day => day.active_users)), // Usuarios únicos máximos
        avg_conversion_rate: weekStats.reduce((sum, day) => sum + day.conversion_rate, 0) / 7
      }
    };
    
  } catch (error) {
    console.error('❌ Error en estadísticas semanales:', error);
    return { days: [], totals: {} };
  }
}

/**
 * Guardar estadísticas del día
 * @param {Object} stats - Estadísticas a guardar
 * @returns {Promise<boolean>} Éxito de la operación
 */
async function saveDailyStats(stats) {
  try {
    // Crear directorio si no existe
    const dataDir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Cargar estadísticas existentes
    let allStats = {};
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf8');
      allStats = JSON.parse(data);
    }
    
    // Agregar estadísticas del día
    allStats[stats.date] = stats;
    
    // Mantener solo últimos 30 días
    const dates = Object.keys(allStats).sort();
    if (dates.length > 30) {
      const toRemove = dates.slice(0, dates.length - 30);
      toRemove.forEach(date => delete allStats[date]);
    }
    
    // Guardar archivo
    fs.writeFileSync(STATS_FILE, JSON.stringify(allStats, null, 2));
    
    console.log(`📊 Estadísticas guardadas para ${stats.date}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error guardando estadísticas:', error);
    return false;
  }
}

/**
 * Calcular tasa de conversión
 * @param {number} messages - Número de mensajes
 * @param {number} reservations - Número de reservas
 * @returns {number} Tasa de conversión (0-100)
 */
function calculateConversionRate(messages, reservations) {
  if (messages === 0) return 0;
  return Math.round((reservations / messages) * 100 * 100) / 100; // 2 decimales
}

/**
 * Calcular conversión de reservas
 * @param {number} confirmed - Reservas confirmadas
 * @param {number} total - Total de reservas
 * @returns {number} Tasa de conversión
 */
function calculateReservationConversion(confirmed, total) {
  if (total === 0) return 0;
  return Math.round((confirmed / total) * 100 * 100) / 100;
}

/**
 * Obtener hora pico
 * @param {Array} hourlyStats - Estadísticas por hora
 * @returns {number} Hora con más actividad
 */
function getPeakHour(hourlyStats) {
  if (!hourlyStats || hourlyStats.length === 0) return 12;
  
  let maxActivity = 0;
  let peakHour = 12;
  
  hourlyStats.forEach(stat => {
    const totalActivity = stat.messages + stat.reservations;
    if (totalActivity > maxActivity) {
      maxActivity = totalActivity;
      peakHour = stat.hour;
    }
  });
  
  return peakHour;
}

/**
 * Obtener estadísticas vacías (fallback)
 * @param {string} date - Fecha
 * @returns {Object} Estadísticas vacías
 */
function getEmptyStats(date) {
  return {
    date: date || new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    messages: { total: 0, by_type: {}, by_intent: {}, response_time_avg: 0, success_rate: 0 },
    reservations: { total: 0, by_status: {}, revenue: {}, conversion_rate: 0 },
    users: { unique_users: 0, reservation_users: 0, inquiry_only_users: 0, returning_users: 0, new_users: 0 },
    hourly: [],
    summary: { total_interactions: 0, conversion_rate: 0, peak_hour: 12, active_users: 0 }
  };
}

module.exports = {
  getDailyStats,
  getWeeklyStats,
  saveDailyStats,
  getMessageStats,
  getReservationStats,
  getUserStats,
  getHourlyStats
};
