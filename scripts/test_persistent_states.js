#!/usr/bin/env node
/**
 * Script para probar el sistema de estados persistente
 */

const { 
  establecerEstado, 
  obtenerEstado, 
  establecerUltimoSaludo, 
  obtenerUltimoSaludo,
  getStateStatistics,
  cleanupExpiredStates
} = require('../services/persistentStateService');

console.log('🧪 TESTING SISTEMA DE ESTADOS PERSISTENTE');
console.log('==========================================\n');

async function testPersistentStates() {
  const testUserId = '50412345678@s.whatsapp.net';
  const testUserId2 = '50487373838@s.whatsapp.net';
  
  try {
    console.log('1. Probando establecer estados...');
    
    // Test 1: Estado básico
    await establecerEstado(testUserId, 'ESPERANDO_DATOS_RESERVA', {
      nombre: 'Juan Pérez',
      telefono: '50412345678',
      fechaEntrada: '2025-08-15'
    });
    console.log('   ✅ Estado básico establecido');
    
    // Test 2: Estado con datos complejos
    await establecerEstado(testUserId2, 'ESPERANDO_PAGO', {
      reserva: {
        alojamiento: 'tortuga',
        fechaEntrada: '2025-08-20',
        fechaSalida: '2025-08-23',
        personas: 4,
        precioTotal: 6000
      },
      intentosPago: 1
    });
    console.log('   ✅ Estado complejo establecido');
    
    console.log('\n2. Probando obtener estados...');
    
    // Test 3: Obtener estado existente
    const estado1 = await obtenerEstado(testUserId);
    console.log(`   📋 Estado obtenido: ${estado1.estado}`);
    console.log(`   📋 Datos: ${JSON.stringify(estado1.datos, null, 2)}`);
    
    // Test 4: Obtener estado inexistente
    const estadoInexistente = await obtenerEstado('usuario_inexistente@s.whatsapp.net');
    console.log(`   📋 Estado inexistente: ${estadoInexistente.estado === 'MENU_PRINCIPAL' ? 'MENU_PRINCIPAL (correcto)' : 'ERROR'}`);
    console.log(`   📋 Es fallback correcto: ${estadoInexistente.estado === 'MENU_PRINCIPAL' ? 'SÍ' : 'NO'}`);
    
    console.log('\n3. Probando último saludo...');
    
    // Test 5: Último saludo
    await establecerUltimoSaludo(testUserId);
    const ultimoSaludo = await obtenerUltimoSaludo(testUserId);
    console.log(`   👋 Último saludo: ${ultimoSaludo ? 'registrado' : 'no encontrado'}`);
    
    console.log('\n4. Probando estadísticas...');
    
    // Test 6: Estadísticas
    const stats = await getStateStatistics();
    console.log('   📊 Estadísticas:');
    console.log(`      - Total activos: ${stats.totalActive}`);
    console.log(`      - En cache: ${stats.cacheSize}`);
    if (stats.byState.length > 0) {
      console.log('      - Por estado:');
      stats.byState.forEach(stat => {
        console.log(`        • ${stat.state}: ${stat.count} usuarios`);
      });
    }
    
    console.log('\n5. Probando actualización de estado...');
    
    // Test 7: Actualizar estado existente
    await establecerEstado(testUserId, 'CONFIRMANDO_RESERVA', {
      ...estado1.datos,
      fechaSalida: '2025-08-18'
    });
    console.log('   ✅ Estado actualizado');
    
    const estadoActualizado = await obtenerEstado(testUserId);
    console.log(`   📋 Nuevo estado: ${estadoActualizado.estado}`);
    
    console.log('\n6. Probando limpieza de estados...');
    
    // Test 8: Limpieza (no debería eliminar nada porque acabamos de crear)
    const eliminados = await cleanupExpiredStates();
    console.log(`   🧹 Estados expirados eliminados: ${eliminados}`);
    
    console.log('\n7. Test de persistencia...');
    console.log('   💡 Para probar persistencia real:');
    console.log('      1. Reinicia el bot');
    console.log('      2. Ejecuta este script nuevamente');
    console.log('      3. Los estados deberían seguir existiendo');
    
    console.log('\n✅ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE');
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Error en los tests:', error);
    throw error;
  }
}

// Ejecutar tests
testPersistentStates().then(() => {
  console.log('\n🎉 Tests finalizados correctamente');
  process.exit(0);
}).catch(error => {
  console.error('💥 Tests fallaron:', error);
  process.exit(1);
});
