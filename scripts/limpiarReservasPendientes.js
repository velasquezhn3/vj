const { runExecute } = require('../db');

async function limpiarReservasPendientes() {
  // Eliminar reservas pendientes con más de 24 horas
  const sql = `DELETE FROM Reservations WHERE status = 'pendiente' AND julianday('now') - julianday(created_at) > 1`;
  try {
    const result = await runExecute(sql);
    console.log(`Reservas pendientes eliminadas: ${result.changes}`);
  } catch (err) {
    console.error('Error eliminando reservas pendientes:', err);
  }
}

limpiarReservasPendientes();
