const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'bot_database.sqlite');

// Datos de cabañas individuales según lo que mencionó el usuario
const individualCabins = [
  // 3 Cabañas Tortuga (3 personas)
  { name: 'Cabaña Tortuga 1', type: 'tortuga', capacity: 3, description: 'Apartamento de 1 cuarto y 1 baño para máximo 3 personas', price: 1500 },
  { name: 'Cabaña Tortuga 2', type: 'tortuga', capacity: 3, description: 'Apartamento de 1 cuarto y 1 baño para máximo 3 personas', price: 1500 },
  { name: 'Cabaña Tortuga 3', type: 'tortuga', capacity: 3, description: 'Apartamento de 1 cuarto y 1 baño para máximo 3 personas', price: 1500 },
  
  // 2 Cabañas Delfín (6 personas)
  { name: 'Cabaña Delfín 1', type: 'delfin', capacity: 6, description: 'Cabaña amplia de 2 cuartos y 2 baños para máximo 6 personas', price: 4500 },
  { name: 'Cabaña Delfín 2', type: 'delfin', capacity: 6, description: 'Cabaña amplia de 2 cuartos y 2 baños para máximo 6 personas', price: 4500 },
  
  // 8 Cabañas Tiburón (9 personas)
  { name: 'Cabaña Tiburón 1', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 },
  { name: 'Cabaña Tiburón 2', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 },
  { name: 'Cabaña Tiburón 3', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 },
  { name: 'Cabaña Tiburón 4', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 },
  { name: 'Cabaña Tiburón 5', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 },
  { name: 'Cabaña Tiburón 6', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 },
  { name: 'Cabaña Tiburón 7', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 },
  { name: 'Cabaña Tiburón 8', type: 'tiburon', capacity: 9, description: 'Cabaña grande de 3 cuartos y 3 baños para máximo 9 personas', price: 6000 }
];

function populateIndividualCabins() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      return;
    }
    console.log('Connected to SQLite database for individual cabins insertion.');
  });

  db.serialize(() => {
    // Limpiar cabañas existentes
    db.run('DELETE FROM Cabins', (err) => {
      if (err) {
        console.error('Error clearing cabins:', err.message);
      } else {
        console.log('Existing cabins cleared.');
      }
    });

    // Insertar cabañas individuales
    const insertCabin = db.prepare(`
      INSERT INTO Cabins (name, capacity, description, price, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    individualCabins.forEach((cabin, index) => {
      insertCabin.run(cabin.name, cabin.capacity, cabin.description, cabin.price, (err) => {
        if (err) {
          console.error(`Error inserting cabin ${cabin.name}:`, err.message);
        } else {
          console.log(`✓ Inserted: ${cabin.name}`);
        }
      });
    });

    insertCabin.finalize((err) => {
      if (err) {
        console.error('Error finalizing cabin insertion:', err.message);
      } else {
        console.log(`\n🏠 Successfully inserted ${individualCabins.length} individual cabins!`);
        console.log('\nSummary:');
        console.log('- 3 Cabañas Tortuga (3 personas)');
        console.log('- 2 Cabañas Delfín (6 personas)');
        console.log('- 8 Cabañas Tiburón (9 personas)');
        console.log('\nTotal: 13 cabañas individuales');
      }
    });
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\nDatabase connection closed.');
    }
  });
}

populateIndividualCabins();
