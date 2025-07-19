const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /admin/dashboard/metrics
router.get('/admin/dashboard/metrics', async (req, res) => {
  try {
    const totalUsersSql = 'SELECT COUNT(*) AS totalUsers FROM Users';
    const totalReservationsSql = 'SELECT COUNT(*) AS totalReservations FROM Reservations';
    const activeReservationsSql = "SELECT COUNT(*) AS activeReservations FROM Reservations WHERE status = 'active'";
    const totalRevenueSql = 'SELECT SUM(total_price) AS totalRevenue FROM Reservations';

    const [totalUsers] = await db.runQuery(totalUsersSql);
    const [totalReservations] = await db.runQuery(totalReservationsSql);
    const [activeReservations] = await db.runQuery(activeReservationsSql);
    const [totalRevenue] = await db.runQuery(totalRevenueSql);

    res.json({
      totalUsers: totalUsers.totalUsers || 0,
      totalReservations: totalReservations.totalReservations || 0,
      activeReservations: activeReservations.activeReservations || 0,
      totalRevenue: totalRevenue.totalRevenue || 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard metrics' });
  }
});

module.exports = router;
