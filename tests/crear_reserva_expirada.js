/**
 * Script para crear una reserva de prueba expirada (más de 24 horas)
 */

const { runExecute, runQuery } = require('../db');

async function crearReservaExpirada() {
  try {
    console.log('⏰ Creando reserva de prueba expirada...');

    // Crear usuario de prueba si no existe
    const telefonoPrueba = '50400000001';
    const nombrePrueba = 'Usuario Expirado Test';

    let userRows = await runQuery('SELECT * FROM Users WHERE phone_number = ?', [telefonoPrueba]);
    let userId;

    if (userRows.length === 0) {
      console.log('👤 Creando usuario de prueba expirado...');
      await runExecute(
        'INSERT INTO Users (phone_number, name, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))',
        [telefonoPrueba, nombrePrueba]
      );
      
      userRows = await runQuery('SELECT * FROM Users WHERE phone_number = ?', [telefonoPrueba]);
    }

    userId = userRows[0].user_id;

    // Crear reserva con fecha de creación de hace 25 horas (expirada)
    const fechaCreacionExpirada = "datetime('now', '-25 hours')";
    
    console.log('📅 Creando reserva expirada (hace 25 horas)...');
    await runExecute(`
      INSERT INTO Reservations (
        user_id, cabin_id, start_date, end_date, status, 
        total_price, personas, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pendiente', 2000, ?, ${fechaCreacionExpirada}, datetime("now"))
    `, [userId, 1, '2025-08-10', '2025-08-12', 2]);

    // Crear otra reserva expirada hace 26 horas
    console.log('📅 Creando segunda reserva expirada (hace 26 horas)...');
    await runExecute(`
      INSERT INTO Reservations (
        user_id, cabin_id, start_date, end_date, status, 
        total_price, personas, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pendiente', 1800, ?, datetime('now', '-26 hours'), datetime("now"))
    `, [userId, 2, '2025-08-05', '2025-08-07', 3]);

    console.log('✅ Reservas de prueba expiradas creadas exitosamente');

    // Mostrar lo que se creó
    const reservasCreadas = await runQuery(`
      SELECT r.reservation_id, r.created_at, r.start_date, r.end_date,
             u.name, u.phone_number,
             julianday('now') - julianday(r.created_at) as dias_transcurridos
      FROM Reservations r
      JOIN Users u ON r.user_id = u.user_id
      WHERE u.phone_number = ? AND r.status = 'pendiente'
      ORDER BY r.created_at ASC
    `, [telefonoPrueba]);

    if (reservasCreadas.length > 0) {
      console.log('\n📋 Reservas expiradas creadas:');
      reservasCreadas.forEach(reserva => {
        const horasExpiradas = (reserva.dias_transcurridos || 0) * 24;
        console.log(`   - ID: ${reserva.reservation_id} | Expirada hace: ${horasExpiradas.toFixed(1)} horas`);
        console.log(`     Creada: ${reserva.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creando reservas expiradas:', error);
  }
}

async function limpiarReservasTest() {
  try {
    console.log('🧹 Limpiando reservas de prueba expiradas...');
    
    const telefonoPrueba = '50400000001';
    
    // Obtener user_id
    const userRows = await runQuery('SELECT user_id FROM Users WHERE phone_number = ?', [telefonoPrueba]);
    
    if (userRows.length > 0) {
      const userId = userRows[0].user_id;
      
      // Eliminar reservas
      await runExecute('DELETE FROM Reservations WHERE user_id = ?', [userId]);
      console.log('🗑️ Reservas de prueba eliminadas');
      
      // Eliminar usuario
      await runExecute('DELETE FROM Users WHERE user_id = ?', [userId]);
      console.log('🗑️ Usuario de prueba eliminado');
    }
    
    console.log('✅ Limpieza de pruebas completada');
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
}

async function main() {
  const accion = process.argv[2];
  
  switch (accion) {
    case 'crear':
      await crearReservaExpirada();
      break;
    case 'limpiar':
      await limpiarReservasTest();
      break;
    default:
      console.log('Uso: node crear_reserva_expirada.js [crear|limpiar]');
      console.log('  crear  - Crea reservas de prueba expiradas');
      console.log('  limpiar - Elimina reservas de prueba');
      break;
  }
}

main().catch(console.error);
