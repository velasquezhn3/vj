// Script para validar la integridad de la base de datos de cabañas y reservas
// Muestra el número de unidades por tipo y las reservas activas por tipo

const db = require('../db');

async function resumenCabanasYReservas() {
  // Obtener todas las cabañas agrupadas por tipo
  const cabanasPorTipo = await db.runQuery(
    'SELECT name, COUNT(*) as cantidad FROM Cabins GROUP BY name'
  );
  console.log('Unidades por tipo:');
  cabanasPorTipo.forEach(row => {
    console.log(`Tipo: ${row.name} - Unidades: ${row.cantidad}`);
  });

  // Obtener reservas activas (confirmadas) agrupadas por tipo de cabaña
  const reservasPorTipo = await db.runQuery(
    `SELECT c.name, COUNT(r.reservation_id) as reservas_activas
     FROM Reservations r
     JOIN Cabins c ON r.cabin_id = c.cabin_id
     WHERE r.status = 'confirmada'
     GROUP BY c.name`
  );
  console.log('\nReservas activas por tipo:');
  reservasPorTipo.forEach(row => {
    console.log(`Tipo: ${row.name} - Reservas activas: ${row.reservas_activas}`);
  });
}

resumenCabanasYReservas()
  .catch(err => console.error('Error al consultar la base:', err));
