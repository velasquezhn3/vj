const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer for file uploads to public/comprobantes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../public/comprobantes');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Use timestamp + original name to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// GET /admin/reservations
router.get('/admin/reservations', async (req, res) => {
  try {
    const sql = `
      SELECT r.reservation_id, r.cabin_id, r.user_id, r.start_date, r.end_date, r.status, r.total_price, r.comprobante_nombre_archivo,
             r.personas,
             u.name AS user_name,
             u.phone_number AS phone_number,
             c.name AS cabin_name,
             c.capacity AS cabin_capacity
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

// POST /admin/reservations - create new reservation with optional comprobante upload
router.post('/admin/reservations', upload.single('comprobante'), async (req, res) => {
  try {
    const { cabin_id, user_id, start_date, end_date, status, total_price, number_of_people } = req.body;
    let comprobante_nombre_archivo = null;
    if (req.file) {
      comprobante_nombre_archivo = req.file.filename;
    }
    const sql = `
      INSERT INTO Reservations (cabin_id, user_id, start_date, end_date, status, total_price, comprobante_nombre_archivo, personas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.runExecute(sql, [cabin_id, user_id, start_date, end_date, status, total_price, comprobante_nombre_archivo, number_of_people]);
    res.json({ success: true, reservation_id: result.lastID });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ success: false, message: 'Error creating reservation' });
  }
});

// PUT /admin/reservations/:id - update reservation with optional comprobante upload
router.put('/admin/reservations/:id', upload.single('comprobante'), async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { cabin_id, user_id, start_date, end_date, status, total_price, number_of_people } = req.body;
    let comprobante_nombre_archivo = null;
    if (req.file) {
      comprobante_nombre_archivo = req.file.filename;
    }

    // Build SQL dynamically to update comprobante_nombre_archivo only if file uploaded
    let sql = `
      UPDATE Reservations
      SET cabin_id = ?, user_id = ?, start_date = ?, end_date = ?, status = ?, total_price = ?, personas = ?
    `;
    const params = [cabin_id, user_id, start_date, end_date, status, total_price, number_of_people];

    if (comprobante_nombre_archivo) {
      sql += `, comprobante_nombre_archivo = ?`;
      params.push(comprobante_nombre_archivo);
    }

    sql += ` WHERE reservation_id = ?`;
    params.push(reservationId);

    await db.runExecute(sql, params);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ success: false, message: 'Error updating reservation' });
  }
});

// DELETE /admin/reservations/:id - delete reservation
router.delete('/admin/reservations/:id', async (req, res) => {
  try {
    const reservationId = req.params.id;
    const sql = `DELETE FROM Reservations WHERE reservation_id = ?`;
    await db.runExecute(sql, [reservationId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ success: false, message: 'Error deleting reservation' });
  }
});

// GET /admin/reservations/upcoming - get upcoming reservations (check-ins and check-outs in next 24-72h)
router.get('/admin/reservations/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const next72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    
    // Format dates for SQLite (YYYY-MM-DD format)
    const today = now.toISOString().split('T')[0];
    const tomorrow = next24h.toISOString().split('T')[0];
    const dayAfterTomorrow = next72h.toISOString().split('T')[0];
    
    const sql = `
      SELECT 
        r.reservation_id, 
        r.cabin_id, 
        r.user_id, 
        r.start_date, 
        r.end_date, 
        r.status, 
        r.total_price,
        r.personas,
        u.name AS user_name,
        u.phone_number AS phone_number,
        c.name AS cabin_name,
        c.capacity AS cabin_capacity,
        CASE 
          WHEN r.start_date BETWEEN ? AND ? THEN 'check_in'
          WHEN r.end_date BETWEEN ? AND ? THEN 'check_out'
          ELSE 'other'
        END as event_type,
        CASE 
          WHEN r.start_date = ? OR r.end_date = ? THEN 'today'
          WHEN r.start_date = ? OR r.end_date = ? THEN 'tomorrow'
          ELSE 'later'
        END as urgency
      FROM Reservations r
      LEFT JOIN Users u ON r.user_id = u.user_id
      LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
      WHERE 
        (r.start_date BETWEEN ? AND ? OR r.end_date BETWEEN ? AND ?)
        AND r.status IN ('confirmado', 'pendiente', 'confirmada')
      ORDER BY 
        CASE 
          WHEN r.start_date = ? OR r.end_date = ? THEN 1
          WHEN r.start_date = ? OR r.end_date = ? THEN 2
          ELSE 3
        END,
        r.start_date ASC,
        r.end_date ASC
    `;
    
    const reservations = await db.runQuery(sql, [
      today, dayAfterTomorrow, // check-in range
      today, dayAfterTomorrow, // check-out range
      today, today, // today comparisons
      tomorrow, tomorrow, // tomorrow comparisons
      today, dayAfterTomorrow, // main where clause check-in
      today, dayAfterTomorrow, // main where clause check-out
      today, today, // final ordering today
      tomorrow, tomorrow // final ordering tomorrow
    ]);
    
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching upcoming reservations:', error);
    res.status(500).json({ success: false, message: 'Error fetching upcoming reservations' });
  }
});

module.exports = router;
