const path = require('path');
const db = require(path.resolve(__dirname, '../db'));

async function listAllTablesSchema() {
  try {
    const tables = await db.runQuery("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Database tables and their schema:');
    for (const table of tables) {
      console.log(`Table: ${table.name}`);
      const schema = await db.runQuery(`PRAGMA table_info(${table.name})`);
      console.table(schema);
    }
  } catch (error) {
    console.error('Error fetching database schema:', error);
  } finally {
    process.exit();
  }
}

listAllTablesSchema();
