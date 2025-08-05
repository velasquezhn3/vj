/**
 * 📅 SERVICIO DE RESERVACIONES
 * Gestiona la lógica de negocio relacionada con reservaciones
 */

const db = require('../db');
const cabinService = require('./cabinService');

/**
 * Calcular precio total de una reservación
 * @param {number} cabinId - ID de la cabaña
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @param {number} guests - Número de huéspedes
 * @returns {Promise<Object>} Detalles del precio calculado
 */
async function calculatePrice(cabinId, startDate, endDate, guests = 1) {
  try {
    // Obtener detalles de la cabaña
    const cabin = await cabinService.getCabinDetails(cabinId);
    if (!cabin) {
      throw new Error('Cabaña no encontrada');
    }

    // Calcular número de noches
    const nights = cabinService.calculateNights(startDate, endDate);
    if (nights <= 0) {
      throw new Error('El rango de fechas debe ser al menos 1 noche');
    }

    // Precio base por noche
    const pricePerNight = cabin.price_per_night || cabin.type_base_price || 0;
    const basePrice = pricePerNight * nights;

    // Calcular recargos
    const surcharges = {
      extra_guests: 0,
      weekend: 0,
      season: 0,
      cleaning: 0
    };

    // Recargo por huéspedes adicionales (si excede la capacidad base)
    const baseCapacity = Math.floor(cabin.capacity * 0.8); // 80% como capacidad base
    if (guests > baseCapacity) {
      const extraGuests = guests - baseCapacity;
      surcharges.extra_guests = extraGuests * 500 * nights; // ₡500 por huésped adicional por noche
    }

    // Recargo de fin de semana (viernes y sábado)
    surcharges.weekend = calculateWeekendSurcharge(startDate, endDate, pricePerNight);

    // Recargo de temporada alta
    surcharges.season = calculateSeasonSurcharge(startDate, endDate, basePrice);

    // Tarifa de limpieza (fija)
    surcharges.cleaning = 2500; // ₡2,500 fijos

    // Calcular totales
    const totalSurcharges = Object.values(surcharges).reduce((sum, charge) => sum + charge, 0);
    const subtotal = basePrice + totalSurcharges;
    
    // Impuestos (13% IVA en Costa Rica)
    const taxes = Math.round(subtotal * 0.13);
    const total = subtotal + taxes;

    return {
      cabin_id: cabinId,
      cabin_name: cabin.name,
      dates: {
        start_date: startDate,
        end_date: endDate,
        nights: nights
      },
      guests: guests,
      pricing: {
        price_per_night: pricePerNight,
        base_price: basePrice,
        surcharges: surcharges,
        subtotal: subtotal,
        taxes: taxes,
        total: total
      },
      breakdown: {
        'Precio base': `₡${basePrice.toLocaleString()} (${nights} noches × ₡${pricePerNight.toLocaleString()})`,
        'Huéspedes adicionales': surcharges.extra_guests > 0 ? `₡${surcharges.extra_guests.toLocaleString()}` : 'Incluido',
        'Recargo fin de semana': surcharges.weekend > 0 ? `₡${surcharges.weekend.toLocaleString()}` : 'No aplica',
        'Recargo temporada': surcharges.season > 0 ? `₡${surcharges.season.toLocaleString()}` : 'No aplica',
        'Limpieza': `₡${surcharges.cleaning.toLocaleString()}`,
        'Impuestos (13%)': `₡${taxes.toLocaleString()}`,
        'Total': `₡${total.toLocaleString()}`
      }
    };

  } catch (error) {
    console.error('❌ Error calculando precio:', error);
    throw new Error('Error al calcular el precio de la reservación');
  }
}

/**
 * Crear una reservación pendiente
 * @param {Object} reservationData - Datos de la reservación
 * @returns {Promise<Object>} Reservación creada
 */
async function createPending(reservationData) {
  try {
    const {
      phone_number,
      cabin_id,
      start_date,
      end_date,
      guests,
      guest_name,
      guest_email,
      special_requests
    } = reservationData;

    // Verificar disponibilidad
    const isAvailable = await cabinService.checkAvailability(cabin_id, start_date, end_date);
    if (!isAvailable) {
      throw new Error('La cabaña no está disponible para las fechas seleccionadas');
    }

    // Calcular precio
    const priceCalculation = await calculatePrice(cabin_id, start_date, end_date, guests);

    // Generar código de reservación
    const reservationCode = generateReservationCode();

    // Crear reservación en base de datos
    const query = `
      INSERT INTO Reservations (
        phone_number, cabin_id, start_date, end_date, guests,
        guest_name, guest_email, total_price, status,
        reservation_code, special_requests, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'))
    `;

    const reservationId = await new Promise((resolve, reject) => {
      db.run(query, [
        phone_number,
        cabin_id,
        start_date,
        end_date,
        guests,
        guest_name || null,
        guest_email || null,
        priceCalculation.pricing.total,
        reservationCode,
        special_requests || null
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Retornar reservación completa
    return {
      reservation_id: reservationId,
      reservation_code: reservationCode,
      status: 'pending',
      phone_number,
      cabin_id,
      cabin_name: priceCalculation.cabin_name,
      dates: priceCalculation.dates,
      guests,
      guest_name,
      guest_email,
      pricing: priceCalculation.pricing,
      special_requests,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
    };

  } catch (error) {
    console.error('❌ Error creando reservación:', error);
    throw new Error('Error al crear la reservación pendiente');
  }
}

/**
 * Confirmar una reservación
 * @param {number} reservationId - ID de la reservación
 * @param {Object} confirmationData - Datos de confirmación
 * @returns {Promise<Object>} Reservación confirmada
 */
async function confirmReservation(reservationId, confirmationData = {}) {
  try {
    const { payment_method, payment_reference, confirmed_by } = confirmationData;

    const updateQuery = `
      UPDATE Reservations 
      SET status = 'confirmed',
          payment_method = ?,
          payment_reference = ?,
          confirmed_by = ?,
          confirmed_at = datetime('now')
      WHERE reservation_id = ? AND status = 'pending'
    `;

    const result = await new Promise((resolve, reject) => {
      db.run(updateQuery, [
        payment_method || null,
        payment_reference || null,
        confirmed_by || 'system',
        reservationId
      ], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (result === 0) {
      throw new Error('Reservación no encontrada o no está pendiente');
    }

    // Obtener reservación actualizada
    return await getReservationById(reservationId);

  } catch (error) {
    console.error('❌ Error confirmando reservación:', error);
    throw new Error('Error al confirmar la reservación');
  }
}

/**
 * Obtener reservación por ID
 * @param {number} reservationId - ID de la reservación
 * @returns {Promise<Object|null>} Reservación
 */
async function getReservationById(reservationId) {
  try {
    const query = `
      SELECT 
        r.*,
        c.name as cabin_name,
        c.capacity as cabin_capacity,
        ct.type_name
      FROM Reservations r
      LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
      LEFT JOIN CabinTypes ct ON c.cabin_type_id = ct.cabin_type_id
      WHERE r.reservation_id = ?
    `;

    const reservation = await new Promise((resolve, reject) => {
      db.get(query, [reservationId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    return reservation;

  } catch (error) {
    console.error('❌ Error obteniendo reservación:', error);
    return null;
  }
}

/**
 * Generar código único de reservación
 * @returns {string} Código de reservación
 */
function generateReservationCode() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `VJ${timestamp}${random}`;
}

/**
 * Calcular recargo de fin de semana
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @param {number} pricePerNight - Precio por noche
 * @returns {number} Recargo de fin de semana
 */
function calculateWeekendSurcharge(startDate, endDate, pricePerNight) {
  let weekendNights = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) { // Viernes o Sábado
      weekendNights++;
    }
  }
  
  return weekendNights * pricePerNight * 0.2; // 20% recargo fin de semana
}

/**
 * Calcular recargo de temporada alta
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @param {number} basePrice - Precio base
 * @returns {number} Recargo de temporada
 */
function calculateSeasonSurcharge(startDate, endDate, basePrice) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Temporadas altas en Costa Rica
  const highSeasons = [
    { start: '12-15', end: '01-15' }, // Navidad/Año Nuevo
    { start: '03-15', end: '04-15' }, // Semana Santa
    { start: '07-01', end: '08-31' }  // Vacaciones de medio año
  ];
  
  // Por simplicidad, aplicar 15% si cualquier parte de la estadía está en temporada alta
  const isHighSeason = highSeasons.some(season => {
    const seasonStart = new Date(start.getFullYear(), parseInt(season.start.split('-')[0]) - 1, parseInt(season.start.split('-')[1]));
    const seasonEnd = new Date(start.getFullYear(), parseInt(season.end.split('-')[0]) - 1, parseInt(season.end.split('-')[1]));
    
    return (start <= seasonEnd && end >= seasonStart);
  });
  
  return isHighSeason ? basePrice * 0.15 : 0; // 15% recargo temporada alta
}

/**
 * Obtener reservaciones por número de teléfono
 * @param {string} phoneNumber - Número de teléfono
 * @returns {Promise<Array>} Array de reservaciones
 */
async function getReservationsByPhone(phoneNumber) {
  try {
    const query = `
      SELECT 
        r.*,
        c.name as cabin_name,
        ct.type_name
      FROM Reservations r
      LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
      LEFT JOIN CabinTypes ct ON c.cabin_type_id = ct.cabin_type_id
      WHERE r.phone_number = ?
      ORDER BY r.created_at DESC
    `;

    const reservations = await new Promise((resolve, reject) => {
      db.all(query, [phoneNumber], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    return reservations;

  } catch (error) {
    console.error('❌ Error obteniendo reservaciones por teléfono:', error);
    return [];
  }
}

module.exports = {
  calculatePrice,
  createPending,
  confirmReservation,
  getReservationById,
  getReservationsByPhone,
  generateReservationCode
};
