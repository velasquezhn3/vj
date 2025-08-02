const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'bot_database.sqlite');

// Datos de prueba
const testData = {
  cabins: [
    { name: 'Cabaña Tortuga', capacity: 3, description: 'Cabaña para 3 personas', price: 1500 },
    { name: 'Cabaña Iguana', capacity: 4, description: 'Cabaña para 4 personas', price: 2000 },
    { name: 'Cabaña Quetzal', capacity: 6, description: 'Cabaña para 6 personas', price: 2500 }
  ],
  users: [
    { phone_number: '+50412345678', name: 'Usuario Prueba', role: 'guest' },
    { phone_number: '+50487654321', name: 'Admin Prueba', role: 'admin' }
  ],
  reservations: [
    { 
      cabin_id: 1, 
      user_id: 1, 
      start_date: '2025-08-05', 
      end_date: '2025-08-07', 
      status: 'confirmed',
      total_price: 3000,
      personas: 3
    },
    { 
      cabin_id: 2, 
      user_id: 1, 
      start_date: '2025-08-10', 
      end_date: '2025-08-12', 
      status: 'pending',
      total_price: 4000,
      personas: 4
    },
    { 
      cabin_id: 1, 
      user_id: 2, 
      start_date: '2025-08-15', 
      end_date: '2025-08-17', 
      status: 'confirmed',
      total_price: 3000,
      personas: 2
    }
  ]
};

function insertTestData() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      return;
    }
    console.log('Connected to SQLite database for test data insertion.');
  });

  db.serialize(() => {
    // Insertar cabañas
    const insertCabin = db.prepare(`
      INSERT OR IGNORE INTO Cabins (name, capacity, description, price)
      VALUES (?, ?, ?, ?)
    `);

    testData.cabins.forEach(cabin => {
      insertCabin.run(cabin.name, cabin.capacity, cabin.description, cabin.price);
    });
    insertCabin.finalize();

    // Insertar usuarios
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO Users (phone_number, name, role)
      VALUES (?, ?, ?)
    `);

    testData.users.forEach(user => {
      insertUser.run(user.phone_number, user.name, user.role);
    });
    insertUser.finalize();

    // Insertar reservaciones
    const insertReservation = db.prepare(`
      INSERT OR IGNORE INTO Reservations (cabin_id, user_id, start_date, end_date, status, total_price, personas)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    testData.reservations.forEach(reservation => {
      insertReservation.run(
        reservation.cabin_id, 
        reservation.user_id, 
        reservation.start_date, 
        reservation.end_date, 
        reservation.status,
        reservation.total_price,
        reservation.personas
      );
    });
    insertReservation.finalize();

    console.log('Test data inserted successfully.');
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
}

insertTestData();
