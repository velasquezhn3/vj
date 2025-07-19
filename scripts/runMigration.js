const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function runMigration() {
  // Use absolute path to database file
  const dbPath = 'c:/Users/Admin/Documents/Bot Vj/vj/bot_database.sqlite';
  const migrationPath = path.resolve(__dirname, 'migration_add_personas_to_reservations.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
  });

  db.serialize(() => {
    db.exec('BEGIN TRANSACTION;');
    db.exec(migrationSql, (err) => {
      if (err) {
        console.error('Error running migration:', err.message);
        db.exec('ROLLBACK;');
        db.close();
        process.exit(1);
      } else {
        console.log('Migration applied successfully.');
        db.exec('COMMIT;');
        db.close();
      }
    });
  });
}

runMigration();
