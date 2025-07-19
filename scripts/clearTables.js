const path = require('path');
const db = require(path.resolve(__dirname, '../db'));

async function clearTables() {
  try {
    console.log('Clearing Reservations table...');
    await db.runExecute('DELETE FROM Reservations');
    console.log('Reservations table cleared.');

    console.log('Clearing Sessions table...');
    await db.runExecute('DELETE FROM Sessions');
    console.log('Sessions table cleared.');

    console.log('Clearing Users table...');
    await db.runExecute('DELETE FROM Users');
    console.log('Users table cleared.');

    console.log('All specified tables have been cleared successfully.');
  } catch (error) {
    console.error('Error clearing tables:', error);
  } finally {
    process.exit();
  }
}

clearTables();
