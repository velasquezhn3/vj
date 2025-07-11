const path = require('path');
const db = require(path.resolve(__dirname, '../db'));

async function listReservationSchema() {
  try {
    const schema = await db.runQuery('PRAGMA table_info(Reservations)');
    console.log('Reservations table schema:');
    console.table(schema);
  } catch (error) {
    console.error('Error fetching Reservations table schema:', error);
  } finally {
    process.exit();
  }
}

listReservationSchema();
