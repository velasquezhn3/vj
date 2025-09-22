// Script para crear la tabla Admins y un usuario admin en la base de datos
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = path.join(__dirname, '..', 'bot_database.sqlite');
const db = new sqlite3.Database(DB_PATH);

const username = process.env.ADMIN_DEFAULT_USERNAME || 'Admin';
const password = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123';
const email = `${username.toLowerCase()}@villasjulie.com`;
const fullName = username;
const role = 'superadmin';

async function run() {
  // 1. Crear tabla Admins si no existe
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS Admins (
      admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      full_name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.run(createTableSQL, async (err) => {
    if (err) {
      console.error('Error creando tabla Admins:', err.message);
      process.exit(1);
    }
    // 2. Hashear password
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    // 3. Insertar usuario admin
    db.run(
      `INSERT OR IGNORE INTO Admins (username, email, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [username, email, fullName, hash, role],
      function (err) {
        if (err) {
          console.error('Error insertando admin:', err.message);
        } else {
          if (this.changes > 0) {
            console.log('✅ Usuario admin creado:', username);
          } else {
            console.log('ℹ️ El usuario admin ya existe:', username);
          }
        }
        db.close();
      }
    );
  });
}

run();
