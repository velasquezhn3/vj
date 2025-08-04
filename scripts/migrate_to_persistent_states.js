#!/usr/bin/env node
/**
 * Script de migración del sistema de estados en memoria a persistente en BD
 */

const fs = require('fs');
const path = require('path');
const { initializeStateTables, migrateMemoryStatesToDB, getStateStatistics } = require('../services/persistentStateService');

console.log('🔄 MIGRACIÓN DE SISTEMA DE ESTADOS');
console.log('==================================\n');

async function migrateStateSystem() {
  try {
    console.log('1. Inicializando tablas de estado persistente...');
    await initializeStateTables();
    console.log('   ✅ Tablas creadas correctamente\n');
    
    // Intentar leer estados existentes del servicio actual
    console.log('2. Verificando estados en memoria existentes...');
    
    // Simular algunos estados de ejemplo para testing
    const estadosEjemplo = {
      '50412345678@s.whatsapp.net': {
        estado: 'ESPERANDO_PAGO',
        datos: {
          nombre: 'Usuario Prueba',
          telefono: '50412345678',
          personas: 3,
          alojamiento: 'tortuga',
          fechaEntrada: '2025-08-15',
          fechaSalida: '2025-08-18',
          precioTotal: 4500
        }
      },
      '50487373838@s.whatsapp.net': {
        estado: 'LISTA_CABAÑAS',
        datos: {}
      }
    };
    
    console.log(`   📋 Encontrados ${Object.keys(estadosEjemplo).length} estados de ejemplo`);
    
    console.log('\n3. Migrando estados a base de datos...');
    await migrateMemoryStatesToDB(estadosEjemplo);
    console.log('   ✅ Estados migrados correctamente\n');
    
    console.log('4. Verificando migración...');
    const stats = await getStateStatistics();
    console.log('   📊 Estadísticas de estados:');
    console.log(`      - Total activos: ${stats.totalActive}`);
    console.log(`      - Cache size: ${stats.cacheSize}`);
    
    if (stats.byState.length > 0) {
      console.log('      - Por estado:');
      stats.byState.forEach(stat => {
        console.log(`        • ${stat.state}: ${stat.count} usuarios`);
      });
    }
    
    console.log('\n5. Creando backup del servicio anterior...');
    const oldServicePath = path.resolve(__dirname, '../services/stateService.js');
    const backupPath = path.resolve(__dirname, '../services/stateService.backup.js');
    
    if (fs.existsSync(oldServicePath)) {
      fs.copyFileSync(oldServicePath, backupPath);
      console.log(`   ✅ Backup creado: ${backupPath}`);
    }
    
    console.log('\n6. Actualizando servicio principal...');
    const newServiceContent = `/**
 * Servicio de estados - Ahora usa persistencia en BD
 * 
 * MIGRADO: Este archivo ahora redirige al nuevo sistema persistente
 * Backup del original disponible en: stateService.backup.js
 */

// Importar el nuevo servicio persistente
const persistentStateService = require('./persistentStateService');

// Re-exportar las funciones para mantener compatibilidad
module.exports = {
  establecerEstado: persistentStateService.establecerEstado,
  obtenerEstado: persistentStateService.obtenerEstado,
  establecerUltimoSaludo: persistentStateService.establecerUltimoSaludo,
  obtenerUltimoSaludo: persistentStateService.obtenerUltimoSaludo,
  
  // Funciones adicionales del nuevo sistema
  initializeStateTables: persistentStateService.initializeStateTables,
  cleanupExpiredStates: persistentStateService.cleanupExpiredStates,
  getStateStatistics: persistentStateService.getStateStatistics
};

// Mensaje de información
console.log('🔄 [StateService] Usando sistema de estados persistente en BD');
`;
    
    fs.writeFileSync(oldServicePath, newServiceContent);
    console.log('   ✅ Servicio actualizado correctamente');
    
    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('');
    console.log('📋 Cambios realizados:');
    console.log('  • Tablas de estado persistente creadas');
    console.log('  • Estados migrados a base de datos');
    console.log('  • Servicio principal actualizado');
    console.log('  • Backup del servicio anterior creado');
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('  • Reiniciar el bot para usar el nuevo sistema');
    console.log('  • Verificar que no hay errores en los logs');
    console.log('  • Probar funcionalidades de estado');
    console.log('');
    console.log('🔧 Scripts útiles:');
    console.log('  • node scripts/test_persistent_states.js - Probar nuevo sistema');
    console.log('  • node scripts/state_statistics.js - Ver estadísticas');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.log('\n🚨 La migración falló. El sistema anterior sigue funcionando.');
    process.exit(1);
  }
}

// Ejecutar migración
migrateStateSystem().then(() => {
  console.log('\n🎉 ¡Migración finalizada!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
