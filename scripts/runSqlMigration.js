const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function runMigration() {
  // Use absolute path to database file
  const dbPath = 'c:/Users/Admin/Documents/Bot Vj/vj/bot_database.sqlite';
  const migrationPath = path.resolve(__dirname, 'migration_change_cabin_id_type_v2.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
  });

  db.serialize(() => {
    // Removed explicit transaction commands to avoid nested transaction error
    db.exec(migrationSql, (err) => {
      if (err) {
        console.error('Error running migration:', err.message);
        db.close();
        process.exit(1);
      } else {
        console.log('Migration applied successfully.');
        db.close();
      }
    });
  });
}

runMigration();
