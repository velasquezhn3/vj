const path = require('path');
const db = require(path.resolve(__dirname, '../db'));

async function listReservations() {
  try {
    const reservations = await db.runQuery('SELECT * FROM Reservations');
    console.log('Reservas en la base de datos:');
    console.table(reservations);
  } catch (error) {
    console.error('Error al cargar las reservas:', error);
  } finally {
    process.exit();
  }
}

listReservations();
