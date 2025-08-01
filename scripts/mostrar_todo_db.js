// Script para mostrar todas las cabañas y todas las reservas en la base de datos
// Útil para revisar la integridad y consistencia de los datos

const db = require('../db');

async function mostrarTodo() {
  console.log('--- CABANAS ---');
  const cabanas = await db.runQuery('SELECT * FROM Cabins');
  cabanas.forEach(c => {
    console.log(c);
  });

  console.log('\n--- RESERVAS ---');
  const reservas = await db.runQuery('SELECT * FROM Reservations');
  reservas.forEach(r => {
    console.log(r);
  });
}

mostrarTodo()
  .catch(err => console.error('Error al consultar la base:', err));
