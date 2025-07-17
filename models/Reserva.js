// @ts-nocheck
const { db, runQuery, runExecute } = require('../db');

const TABLE_NAME = 'Reservations';

async function findById(id) {
  const rows = await runQuery(`SELECT * FROM ${TABLE_NAME} WHERE reservation_id = ?`, [id]);
  return rows[0];
}

async function findByPhoneAndStatus(phone, status) {
  const sql = `
    SELECT r.*
    FROM ${TABLE_NAME} r
    JOIN Users u ON r.user_id = u.user_id
    WHERE u.phone_number = ? AND r.status = ?
  `;
  const rows = await runQuery(sql, [phone, status]);
  console.log('[DEBUG] findByPhoneAndStatus rows:', rows);
  return rows[0];
}

async function updateComprobante(id, buffer, contentType, nombreArchivo) {
  // Now nombreArchivo is the relative file path string, buffer and contentType are null
  const sql = `UPDATE ${TABLE_NAME} SET status = ?, comprobante_nombre_archivo = ? WHERE reservation_id = ?`;
  const params = ['comprobante_recibido', nombreArchivo, id];
  await runExecute(sql, params);
  return findById(id);
}

async function updateEstado(id, nuevoEstado) {
  const sql = `UPDATE ${TABLE_NAME} SET status = ? WHERE reservation_id = ?`;
  await runExecute(sql, [nuevoEstado, id]);
  return findById(id);
}

async function eliminarComprobante(id) {
  const sql = `UPDATE ${TABLE_NAME} SET status = ?, comprobante_nombre_archivo = NULL WHERE reservation_id = ?`;
  await runExecute(sql, ['cancelada', id]);
  return findById(id);
}

module.exports = {
  findById,
  findByPhoneAndStatus,
  updateComprobante,
  updateEstado,
  eliminarComprobante
};
