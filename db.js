const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'bot_database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function runExecute(sql, params = []) {
  console.log('[DB] Executing SQL:', sql, 'with params:', params);
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('[DB] Error executing SQL:', err);
        reject(err);
      } else {
        console.log('[DB] SQL executed successfully. lastID:', this.lastID, 'changes:', this.changes);
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

module.exports = {
  runQuery,
  runExecute,
  db
};
