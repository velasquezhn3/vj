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
             u.name AS user_name,
             u.phone_number AS phone_number,
             c.name AS cabin_name,
             c.capacity AS personas
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
    const { cabin_id, user_id, start_date, end_date, status, total_price } = req.body;
    let comprobante_nombre_archivo = null;
    if (req.file) {
      comprobante_nombre_archivo = req.file.filename;
    }
    const sql = `
      INSERT INTO Reservations (cabin_id, user_id, start_date, end_date, status, total_price, comprobante_nombre_archivo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.runExecute(sql, [cabin_id, user_id, start_date, end_date, status, total_price, comprobante_nombre_archivo]);
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
    const { cabin_id, user_id, start_date, end_date, status, total_price } = req.body;
    let comprobante_nombre_archivo = null;
    if (req.file) {
      comprobante_nombre_archivo = req.file.filename;
    }

    // Build SQL dynamically to update comprobante_nombre_archivo only if file uploaded
    let sql = `
      UPDATE Reservations
      SET cabin_id = ?, user_id = ?, start_date = ?, end_date = ?, status = ?, total_price = ?
    `;
    const params = [cabin_id, user_id, start_date, end_date, status, total_price];

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

module.exports = router;
