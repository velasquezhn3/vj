// Script para agregar la columna last_login a la tabla Admins si no existe
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'bot_database.sqlite');
const db = new sqlite3.Database(DB_PATH);

const checkColumnSQL = "PRAGMA table_info(Admins);";
const alterTableSQL = "ALTER TABLE Admins ADD COLUMN last_login DATETIME;";

db.all(checkColumnSQL, (err, columns) => {
  if (err) {
    console.error('Error consultando columnas:', err.message);
    db.close();
    process.exit(1);
  }
  const exists = columns.some(col => col.name === 'last_login');
  if (exists) {
    console.log('La columna last_login ya existe.');
    db.close();
    return;
  }
  db.run(alterTableSQL, (err) => {
    if (err) {
      console.error('Error agregando columna last_login:', err.message);
    } else {
      console.log('✅ Columna last_login agregada correctamente.');
    }
    db.close();
  });
});
