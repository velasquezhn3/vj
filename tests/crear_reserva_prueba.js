/**
 * Script para crear una reserva de prueba en estado pendiente
 */

const { runExecute, runQuery } = require('../db');

async function crearReservaPrueba() {
  try {
    console.log('🏗️ Creando reserva de prueba...');

    // Primero crear o verificar que existe el usuario
    const telefono = '50499222188';
    const nombre = 'Usuario Prueba';

    // Verificar si el usuario existe
    let userRows = await runQuery('SELECT * FROM Users WHERE phone_number = ?', [telefono]);
    let userId;

    if (userRows.length === 0) {
      // Crear usuario
      console.log('👤 Creando usuario de prueba...');
      await runExecute(
        'INSERT INTO Users (phone_number, name, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))',
        [telefono, nombre]
      );
      
      userRows = await runQuery('SELECT * FROM Users WHERE phone_number = ?', [telefono]);
    }

    userId = userRows[0].user_id;
    console.log(`✅ Usuario encontrado/creado con ID: ${userId}`);

    // Crear reserva en estado pendiente
    const fechaEntrada = '2025-08-15';
    const fechaSalida = '2025-08-17';
    const personas = 2;
    const cabinId = 1; // Asumiendo que existe

    console.log('📅 Creando reserva pendiente...');
    await runExecute(`
      INSERT INTO Reservations (
        user_id, cabin_id, start_date, end_date, status, 
        total_price, personas, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pendiente', 1500, ?, datetime("now"), datetime("now"))
    `, [userId, cabinId, fechaEntrada, fechaSalida, personas]);

    // Obtener la reserva creada
    const reservaRows = await runQuery(`
      SELECT r.*, u.name as guest_name, u.phone_number
      FROM Reservations r
      JOIN Users u ON r.user_id = u.user_id
      WHERE u.phone_number = ? AND r.status = 'pendiente'
      ORDER BY r.created_at DESC LIMIT 1
    `, [telefono]);

    if (reservaRows.length > 0) {
      const reserva = reservaRows[0];
      console.log('✅ Reserva de prueba creada exitosamente:');
      console.log(`   - ID: ${reserva.reservation_id}`);
      console.log(`   - Huésped: ${reserva.guest_name}`);
      console.log(`   - Teléfono: ${reserva.phone_number}`);
      console.log(`   - Estado: ${reserva.status}`);
      console.log(`   - Fechas: ${reserva.start_date} a ${reserva.end_date}`);
      console.log(`   - Personas: ${reserva.personas}`);
    }

    // Crear también una reserva confirmada para pruebas
    console.log('📅 Creando reserva confirmada...');
    await runExecute(`
      INSERT INTO Reservations (
        user_id, cabin_id, start_date, end_date, status, 
        total_price, personas, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'confirmada', 1800, ?, datetime("now"), datetime("now"))
    `, [userId, cabinId, '2025-08-20', '2025-08-22', 3]);

    console.log('✅ Reservas de prueba creadas correctamente');

  } catch (error) {
    console.error('❌ Error creando reserva de prueba:', error);
  }
}

// Función para limpiar reservas de prueba
async function limpiarReservasPrueba() {
  try {
    console.log('🧹 Limpiando reservas de prueba...');
    
    const telefono = '50499222188';
    
    // Obtener user_id
    const userRows = await runQuery('SELECT user_id FROM Users WHERE phone_number = ?', [telefono]);
    
    if (userRows.length > 0) {
      const userId = userRows[0].user_id;
      
      // Eliminar reservas
      await runExecute('DELETE FROM Reservations WHERE user_id = ?', [userId]);
      console.log('🗑️ Reservas eliminadas');
      
      // Opcional: eliminar usuario (comentado por seguridad)
      // await runExecute('DELETE FROM Users WHERE user_id = ?', [userId]);
      // console.log('🗑️ Usuario eliminado');
    }
    
    console.log('✅ Limpieza completada');
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
}

// Función para mostrar reservas existentes
async function mostrarReservas() {
  try {
    console.log('📋 Reservas existentes:');
    
    const rows = await runQuery(`
      SELECT r.reservation_id, r.status, u.name, u.phone_number, 
             r.start_date, r.end_date, r.created_at
      FROM Reservations r
      JOIN Users u ON r.user_id = u.user_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);
    
    if (rows.length === 0) {
      console.log('   (No hay reservas)');
    } else {
      rows.forEach(reserva => {
        console.log(`   - ID: ${reserva.reservation_id} | ${reserva.status} | ${reserva.name} (${reserva.phone_number}) | ${reserva.start_date}-${reserva.end_date}`);
      });
    }
  } catch (error) {
    console.error('❌ Error mostrando reservas:', error);
  }
}

// Ejecutar basado en argumento de línea de comandos
async function main() {
  const accion = process.argv[2];
  
  switch (accion) {
    case 'crear':
      await crearReservaPrueba();
      break;
    case 'limpiar':
      await limpiarReservasPrueba();
      break;
    case 'mostrar':
      await mostrarReservas();
      break;
    default:
      console.log('Uso: node crear_reserva_prueba.js [crear|limpiar|mostrar]');
      console.log('  crear  - Crea reservas de prueba');
      console.log('  limpiar - Elimina reservas de prueba');
      console.log('  mostrar - Muestra reservas existentes');
      break;
  }
}

main().catch(console.error);
