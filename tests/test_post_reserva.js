/**
 * Script de prueba para la funcionalidad de Ayuda Post Reserva
 */

const { findByPhoneAndStatus } = require('../models/Reserva');
const { buscarReservaActivaOPendiente } = require('../routes/postReservaHandler');

async function testBuscarReserva() {
  console.log('🧪 Iniciando pruebas de Ayuda Post Reserva...\n');

  try {
    // Buscar por un teléfono que debería tener reservas
    const telefono = '50499222188'; // Cambiar por un teléfono de prueba
    
    console.log(`📱 Buscando reservas para teléfono: ${telefono}`);
    
    // Probar búsqueda de reserva pendiente
    console.log('\n🔍 Buscando reserva pendiente...');
    const reservaPendiente = await findByPhoneAndStatus(telefono, 'pendiente');
    console.log('Reserva pendiente:', reservaPendiente ? `✅ Encontrada - ID: ${reservaPendiente.reservation_id}` : '❌ No encontrada');

    // Probar búsqueda de reserva confirmada
    console.log('\n🔍 Buscando reserva confirmada...');
    const reservaConfirmada = await findByPhoneAndStatus(telefono, 'confirmada');
    console.log('Reserva confirmada:', reservaConfirmada ? `✅ Encontrada - ID: ${reservaConfirmada.reservation_id}` : '❌ No encontrada');

    // Probar la función principal
    console.log('\n🔍 Probando función principal buscarReservaActivaOPendiente...');
    const reservaEncontrada = await buscarReservaActivaOPendiente(telefono);
    
    if (reservaEncontrada) {
      console.log(`✅ Reserva encontrada:`);
      console.log(`   - ID: ${reservaEncontrada.reservation_id}`);
      console.log(`   - Tipo: ${reservaEncontrada.tipo}`);
      console.log(`   - Huésped: ${reservaEncontrada.guest_name}`);
      console.log(`   - Estado: ${reservaEncontrada.status}`);
    } else {
      console.log('❌ No se encontró ninguna reserva activa o pendiente');
    }

    console.log('\n✅ Pruebas completadas');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Función para probar diferentes escenarios
async function testEscenarios() {
  console.log('\n🎭 Probando diferentes escenarios...\n');

  const escenarios = [
    { telefono: '50499222188', descripcion: 'Teléfono principal' },
    { telefono: '50412345678', descripcion: 'Teléfono de prueba' },
    { telefono: '50400000000', descripcion: 'Teléfono inexistente' }
  ];

  for (const escenario of escenarios) {
    console.log(`📱 Escenario: ${escenario.descripcion} (${escenario.telefono})`);
    
    try {
      const resultado = await buscarReservaActivaOPendiente(escenario.telefono);
      
      if (resultado) {
        console.log(`   ✅ Resultado: ${resultado.tipo} - ID: ${resultado.reservation_id}`);
      } else {
        console.log(`   ❌ Sin reservas`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Línea en blanco
  }
}

// Ejecutar pruebas
async function main() {
  console.log('🚀 PRUEBAS DE AYUDA POST RESERVA\n');
  console.log('===============================\n');
  
  await testBuscarReserva();
  await testEscenarios();
  
  console.log('🏁 Todas las pruebas completadas');
}

main().catch(console.error);
