const path = require('path');
const db = require(path.resolve(__dirname, '../db'));

async function listUsersSchema() {
  try {
    const schema = await db.runQuery('PRAGMA table_info(Users)');
    console.log('Users table schema:');
    console.table(schema);
  } catch (error) {
    console.error('Error fetching Users table schema:', error);
  } finally {
    process.exit();
  }
}

listUsersSchema();
