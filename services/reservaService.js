const { runQuery, runExecute } = require('../db');
const logger = require('../config/logger');

/**
 * Normalize phone number by removing non-digit characters and leading zeros.
 * Supports formats like +50488776655, 50488776655, 8888-7766, etc.
 * @param {string} phone 
 * @returns {string} normalized phone number
 */
function normalizePhoneNumber(phone) {
    if (!phone) return '';
    // Remove all non-digit characters
    let normalized = phone.replace(/[^\d]/g, '');
    // Remove leading zeros
    normalized = normalized.replace(/^0+/, '');
    return normalized;
}

/**
 * Insert user if not exists and insert reservation.
 * @param {string} phoneNumber - raw phone number input
 * @param {object} reservaData - reservation data: {start_date, end_date, status, total_price}
 * @returns {Promise<{success: boolean, reservationId?: number, error?: string}>}
 */
async function createReservationWithUser(phoneNumber, reservaData, cabinId) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
        return { success: false, error: 'Número de teléfono inválido' };
    }

    if (!cabinId) {
        return { success: false, error: 'ID de cabaña es requerido' };
    }

    try {
        // Insert user if not exists (SQLite does not support INSERT IGNORE, use INSERT OR IGNORE)
        const insertUserSql = `INSERT OR IGNORE INTO Users (phone_number) VALUES (?)`;
        await runExecute(insertUserSql, [normalizedPhone]);

        // Get user_id
        const selectUserSql = `SELECT user_id FROM Users WHERE phone_number = ?`;
        const userRows = await runQuery(selectUserSql, [normalizedPhone]);
        if (userRows.length === 0) {
            return { success: false, error: 'No se pudo obtener ID de usuario' };
        }
        const user_id = userRows[0].user_id;

        // Insert reservation with cabinId
        const insertReservaSql = `
            INSERT INTO Reservations (user_id, cabin_id, start_date, end_date, status, total_price, personas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const insertResult = await runExecute(insertReservaSql, [
            user_id,
            cabinId,
            reservaData.start_date,
            reservaData.end_date,
            reservaData.status,
            reservaData.total_price,
            reservaData.personas || null
        ]);

        const reservationId = insertResult.lastID;
        if (!reservationId) {
            return { success: false, error: 'No se pudo obtener ID de reserva' };
        }

        return { success: true, reservationId };
    } catch (error) {
        logger.error('Error in createReservationWithUser:', error);
        return { success: false, error: error.message || 'Error desconocido' };
    }
}

async function updateUserNameByPhone(phoneNumber, name) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
        return { success: false, error: 'Número de teléfono inválido' };
    }
    try {
        const updateSql = `UPDATE Users SET name = ? WHERE phone_number = ?`;
        await runExecute(updateSql, [name, normalizedPhone]);
        return { success: true };
    } catch (error) {
        logger.error('Error updating user name:', error);
        return { success: false, error: error.message || 'Error desconocido' };
    }
}

/**
 * Insert or update user with phone number and name.
 * If user exists, update the name.
 * If user does not exist, insert new user with phone and name.
 * @param {string} phoneNumber 
 * @param {string} name 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function upsertUser(phoneNumber, name) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
        return { success: false, error: 'Número de teléfono inválido' };
    }
    try {
        // Try to update first
        const updateSql = `UPDATE Users SET name = ? WHERE phone_number = ?`;
        const updateResult = await runExecute(updateSql, [name, normalizedPhone]);
        console.log(`[DEBUG] upsertUser updateResult:`, updateResult);
        if (updateResult.changes === 0) {
            // No rows updated, insert new user
            const insertSql = `INSERT INTO Users (phone_number, name) VALUES (?, ?)`;
            const insertResult = await runExecute(insertSql, [normalizedPhone, name]);
            console.log(`[DEBUG] upsertUser insertResult:`, insertResult);
        }
        return { success: true };
    } catch (error) {
        logger.error('Error in upsertUser:', error);
        return { success: false, error: error.message || 'Error desconocido' };
    }
}

/**
 * Get reservation details by reservation ID, including user and cabin info.
 * @param {number} reservationId 
 * @returns {Promise<object|null>} reservation details or null if not found
 */
async function getReservationDetailsById(reservationId) {
    const sql = `
        SELECT 
            r.reservation_id,
            u.name AS nombre,
            u.phone_number AS telefono,
            r.total_price AS precioTotal,
            r.start_date AS fechaEntrada,
            r.end_date AS fechaSalida,
            r.cabin_id AS alojamiento,
            c.capacity AS personas,
            r.status AS status
        FROM Reservations r
        JOIN Users u ON r.user_id = u.user_id
        LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
        WHERE r.reservation_id = ?
    `;
    try {
        logger.info('getReservationDetailsById called with reservationId:', reservationId);
        const rows = await runQuery(sql, [reservationId]);
        logger.info('getReservationDetailsById query result rows:', rows);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    } catch (error) {
        logger.error('Error fetching reservation details:', error);
        return null;
    }
}

async function updateComprobante(reservationId, comprobanteData, comprobanteContentType, comprobanteNombreArchivo) {
    try {
        const sql = `
            UPDATE Reservations
            SET comprobante_nombre_archivo = ?
            WHERE reservation_id = ?
        `;
        await runExecute(sql, [comprobanteNombreArchivo, reservationId]);
        return { success: true };
    } catch (error) {
        logger.error('Error updating comprobante:', error);
        return { success: false, error: error.message || 'Error desconocido' };
    }
}

async function updateReservationPrice(reservationId, totalPrice) {
    try {
        const sql = `
            UPDATE Reservations
            SET total_price = ?, updated_at = datetime('now')
            WHERE reservation_id = ?
        `;
        await runExecute(sql, [totalPrice, reservationId]);
        return { success: true };
    } catch (error) {
        logger.error('Error updating reservation price:', error);
        return { success: false, error: error.message || 'Error desconocido' };
    }
}

async function getUserByPhone(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
        return null;
    }
    try {
        const sql = `SELECT * FROM Users WHERE phone_number = ?`;
        const rows = await runQuery(sql, [normalizedPhone]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        logger.error('Error fetching user by phone:', error);
        return null;
    }
}

async function getReservationById(reservationId) {
    try {
        const sql = `SELECT * FROM Reservations WHERE reservation_id = ?`;
        const rows = await runQuery(sql, [reservationId]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        logger.error('Error fetching reservation by ID:', error);
        return null;
    }
}

module.exports = {
    createReservationWithUser,
    normalizePhoneNumber,
    updateUserNameByPhone,
    getReservationDetailsById,
    updateComprobante,
    upsertUser,
    updateReservationPrice,
    getUserByPhone,
    getReservationById
};
