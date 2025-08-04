// Test simple para verificar las reservas
const db = require('./db');

async function testReservations() {
  try {
    console.log('Testing reservations query...');
    
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
    console.log('Reservations found:', reservations.length);
    console.log('Reservations data:', JSON.stringify(reservations, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testReservations();
