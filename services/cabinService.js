/**
 * 🏠 SERVICIO DE CABAÑAS
 * Gestiona la lógica de negocio relacionada con cabañas y disponibilidad
 */

const db = require('../db');
const path = require('path');
const fs = require('fs');

/**
 * Buscar cabañas disponibles
 * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
 * @param {number} guests - Número de huéspedes
 * @param {string} cabinType - Tipo de cabaña (opcional)
 * @returns {Promise<Array>} Array de cabañas disponibles
 */
async function findAvailable(startDate, endDate, guests = 1, cabinType = null) {
  try {
    let query = `
      SELECT DISTINCT 
        c.cabin_id,
        c.name,
        c.description,
        c.capacity,
        c.price_per_night,
        c.cabin_type_id,
        ct.type_name,
        ct.base_price,
        c.amenities,
        c.images
      FROM Cabins c
      LEFT JOIN CabinTypes ct ON c.cabin_type_id = ct.cabin_type_id
      WHERE c.capacity >= ?
        AND c.cabin_id NOT IN (
          SELECT DISTINCT r.cabin_id 
          FROM Reservations r 
          WHERE r.status IN ('confirmed', 'pending')
            AND (
              (r.start_date <= ? AND r.end_date > ?) OR
              (r.start_date < ? AND r.end_date >= ?) OR
              (r.start_date >= ? AND r.end_date <= ?)
            )
        )
    `;
    
    const params = [guests, startDate, startDate, endDate, endDate, startDate, endDate];
    
    // Agregar filtro por tipo si se especifica
    if (cabinType) {
      query += ` AND ct.type_name = ?`;
      params.push(cabinType);
    }
    
    query += ` ORDER BY c.price_per_night ASC`;
    
    const cabins = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // Procesar datos adicionales
    return cabins.map(cabin => ({
      ...cabin,
      amenities: cabin.amenities ? JSON.parse(cabin.amenities) : [],
      images: cabin.images ? JSON.parse(cabin.images) : [],
      availability: {
        start_date: startDate,
        end_date: endDate,
        nights: calculateNights(startDate, endDate)
      }
    }));
    
  } catch (error) {
    console.error('❌ Error buscando cabañas disponibles:', error);
    throw new Error('Error al buscar cabañas disponibles');
  }
}

/**
 * Obtener detalles de una cabaña específica
 * @param {number} cabinId - ID de la cabaña
 * @returns {Promise<Object|null>} Detalles de la cabaña
 */
async function getCabinDetails(cabinId) {
  try {
    const query = `
      SELECT 
        c.*,
        ct.type_name,
        ct.base_price as type_base_price,
        ct.description as type_description
      FROM Cabins c
      LEFT JOIN CabinTypes ct ON c.cabin_type_id = ct.cabin_type_id
      WHERE c.cabin_id = ?
    `;
    
    const cabin = await new Promise((resolve, reject) => {
      db.get(query, [cabinId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!cabin) return null;
    
    return {
      ...cabin,
      amenities: cabin.amenities ? JSON.parse(cabin.amenities) : [],
      images: cabin.images ? JSON.parse(cabin.images) : []
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo detalles de cabaña:', error);
    throw new Error('Error al obtener detalles de la cabaña');
  }
}

/**
 * Obtener todas las cabañas
 * @returns {Promise<Array>} Array de todas las cabañas
 */
async function getAllCabins() {
  try {
    const query = `
      SELECT 
        c.*,
        ct.type_name,
        ct.base_price as type_base_price
      FROM Cabins c
      LEFT JOIN CabinTypes ct ON c.cabin_type_id = ct.cabin_type_id
      ORDER BY c.name ASC
    `;
    
    const cabins = await new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    return cabins.map(cabin => ({
      ...cabin,
      amenities: cabin.amenities ? JSON.parse(cabin.amenities) : [],
      images: cabin.images ? JSON.parse(cabin.images) : []
    }));
    
  } catch (error) {
    console.error('❌ Error obteniendo todas las cabañas:', error);
    throw new Error('Error al obtener lista de cabañas');
  }
}

/**
 * Verificar disponibilidad de una cabaña específica
 * @param {number} cabinId - ID de la cabaña
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {Promise<boolean>} true si está disponible
 */
async function checkAvailability(cabinId, startDate, endDate) {
  try {
    const query = `
      SELECT COUNT(*) as conflicts
      FROM Reservations 
      WHERE cabin_id = ? 
        AND status IN ('confirmed', 'pending')
        AND (
          (start_date <= ? AND end_date > ?) OR
          (start_date < ? AND end_date >= ?) OR
          (start_date >= ? AND end_date <= ?)
        )
    `;
    
    const result = await new Promise((resolve, reject) => {
      db.get(query, [cabinId, startDate, startDate, endDate, endDate, startDate, endDate], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    return result.conflicts === 0;
    
  } catch (error) {
    console.error('❌ Error verificando disponibilidad:', error);
    return false;
  }
}

/**
 * Obtener tipos de cabañas
 * @returns {Promise<Array>} Array de tipos de cabañas
 */
async function getCabinTypes() {
  try {
    const query = `
      SELECT 
        ct.*,
        COUNT(c.cabin_id) as cabin_count
      FROM CabinTypes ct
      LEFT JOIN Cabins c ON ct.cabin_type_id = c.cabin_type_id
      GROUP BY ct.cabin_type_id
      ORDER BY ct.type_name ASC
    `;
    
    const types = await new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    return types;
    
  } catch (error) {
    console.error('❌ Error obteniendo tipos de cabañas:', error);
    throw new Error('Error al obtener tipos de cabañas');
  }
}

/**
 * Calcular número de noches entre dos fechas
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {number} Número de noches
 */
function calculateNights(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Buscar cabañas por capacidad
 * @param {number} minCapacity - Capacidad mínima
 * @returns {Promise<Array>} Array de cabañas que cumplen la capacidad
 */
async function findByCapacity(minCapacity) {
  try {
    const query = `
      SELECT 
        c.*,
        ct.type_name
      FROM Cabins c
      LEFT JOIN CabinTypes ct ON c.cabin_type_id = ct.cabin_type_id
      WHERE c.capacity >= ?
      ORDER BY c.capacity ASC, c.price_per_night ASC
    `;
    
    const cabins = await new Promise((resolve, reject) => {
      db.all(query, [minCapacity], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    return cabins.map(cabin => ({
      ...cabin,
      amenities: cabin.amenities ? JSON.parse(cabin.amenities) : [],
      images: cabin.images ? JSON.parse(cabin.images) : []
    }));
    
  } catch (error) {
    console.error('❌ Error buscando cabañas por capacidad:', error);
    throw new Error('Error al buscar cabañas por capacidad');
  }
}

/**
 * Obtener estadísticas de ocupación
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {Promise<Object>} Estadísticas de ocupación
 */
async function getOccupancyStats(startDate, endDate) {
  try {
    const totalCabinsQuery = `SELECT COUNT(*) as total FROM Cabins`;
    const occupiedQuery = `
      SELECT COUNT(DISTINCT cabin_id) as occupied
      FROM Reservations 
      WHERE status IN ('confirmed', 'pending')
        AND start_date <= ? AND end_date >= ?
    `;
    
    const [totalResult, occupiedResult] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get(totalCabinsQuery, [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(occupiedQuery, [endDate, startDate], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);
    
    const total = totalResult.total || 0;
    const occupied = occupiedResult.occupied || 0;
    const available = total - occupied;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;
    
    return {
      total_cabins: total,
      occupied_cabins: occupied,
      available_cabins: available,
      occupancy_rate: Math.round(occupancyRate * 100) / 100,
      period: { start_date: startDate, end_date: endDate }
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de ocupación:', error);
    throw new Error('Error al obtener estadísticas de ocupación');
  }
}

module.exports = {
  findAvailable,
  getCabinDetails,
  getAllCabins,
  checkAvailability,
  getCabinTypes,
  calculateNights,
  findByCapacity,
  getOccupancyStats
};
