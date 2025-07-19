const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /admin/reservations
router.get('/admin/reservations', async (req, res) => {
  try {
    const sql = `
      SELECT r.reservation_id, r.cabin_id, r.user_id, r.start_date, r.end_date, r.status, r.total_price, r.comprobante_nombre_archivo,
             u.name AS user_name,
             c.name AS cabin_name
      FROM Reservations r
      LEFT JOIN Users u ON r.user_id = u.user_id
      LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
      ORDER BY r.created_at DESC
    `;
    const reservations = await db.runQuery(sql);
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ success: false, message: 'Error fetching reservations' });
  }
});

module.exports = router;
