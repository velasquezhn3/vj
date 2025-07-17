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
            INSERT INTO Reservations (user_id, cabin_id, start_date, end_date, status, total_price)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const insertResult = await runExecute(insertReservaSql, [
            user_id,
            cabinId,
            reservaData.start_date,
            reservaData.end_date,
            reservaData.status,
            reservaData.total_price
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

module.exports = {
    createReservationWithUser,
    normalizePhoneNumber,
    updateUserNameByPhone
};
