const path = require('path');
const db = require(path.resolve(__dirname, '../db'));

async function listCabinsSchema() {
  try {
    const schema = await db.runQuery('PRAGMA table_info(Cabins)');
    console.log('Cabins table schema:');
    console.table(schema);
  } catch (error) {
    console.error('Error fetching Cabins table schema:', error);
  } finally {
    process.exit();
  }
}

listCabinsSchema();
