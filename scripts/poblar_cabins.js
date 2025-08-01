// Script para poblar la tabla Cabins con los tipos y capacidades correctos
const db = require('../db');

async function poblarCabins() {
  const cabins = [
    { name: 'Cabaña Tortuga 1', type: 'tortuga', capacity: 3 },
    { name: 'Cabaña Tortuga 2', type: 'tortuga', capacity: 3 },
    { name: 'Cabaña Tortuga 3', type: 'tortuga', capacity: 3 },
    { name: 'Cabaña Delfín 1', type: 'delfin', capacity: 6 },
    { name: 'Cabaña Delfín 2', type: 'delfin', capacity: 6 },
    { name: 'Cabaña Delfín 3', type: 'delfin', capacity: 6 },
    { name: 'Cabaña Tiburón 1', type: 'tiburon', capacity: 9 },
    { name: 'Cabaña Tiburón 2', type: 'tiburon', capacity: 9 },
    { name: 'Cabaña Tiburón 3', type: 'tiburon', capacity: 9 },
    { name: 'Cabaña Tiburón 4', type: 'tiburon', capacity: 9 },
    { name: 'Cabaña Tiburón 5', type: 'tiburon', capacity: 9 },
    { name: 'Cabaña Tiburón 6', type: 'tiburon', capacity: 9 },
    { name: 'Cabaña Tiburón 7', type: 'tiburon', capacity: 9 }
  ];
  try {
    for (const cabin of cabins) {
      await db.runExecute(
        'INSERT INTO Cabins (name, type, capacity) VALUES (?, ?, ?)',
        [cabin.name, cabin.type, cabin.capacity]
      );
      console.log(`Insertada: ${cabin.name}`);
    }
    console.log('Cabins pobladas correctamente.');
  } catch (error) {
    console.error('Error al poblar Cabins:', error);
  } finally {
    process.exit();
  }
}

poblarCabins();
