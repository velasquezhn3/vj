const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../bot_database.sqlite');
const OUTPUT_PATH = path.join(__dirname, 'db_schema_and_triggers.txt');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.all("SELECT name, sql FROM sqlite_master WHERE type='trigger' OR type='table';", [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err.message);
    process.exit(1);
  }
  const output = rows.map(row => `Name: ${row.name}\nSQL: ${row.sql}\n`).join('\n');
  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');
  console.log(`Database schema and triggers exported to ${OUTPUT_PATH}`);
  db.close();
});
