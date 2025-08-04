#!/usr/bin/env node
/**
 * Script para mostrar estadísticas del sistema de estados
 */

const { 
  getStateStatistics, 
  cleanupExpiredStates 
} = require('../services/persistentStateService');

async function showStateStatistics() {
  console.log('📊 ESTADÍSTICAS DEL SISTEMA DE ESTADOS');
  console.log('======================================\n');
  
  try {
    // Obtener estadísticas
    const stats = await getStateStatistics();
    
    console.log('📋 Resumen General:');
    console.log(`   • Estados activos: ${stats.totalActive}`);
    console.log(`   • En caché: ${stats.cacheSize}`);
    console.log(`   • Última limpieza: ${stats.lastCleanup || 'No registrada'}`);
    
    if (stats.byState.length > 0) {
      console.log('\n📈 Estados por tipo:');
      stats.byState.forEach(stat => {
        console.log(`   • ${stat.state}: ${stat.count} usuarios`);
      });
    } else {
      console.log('\n📭 No hay estados activos');
    }
    
    // Mostrar estados expirados
    console.log('\n🧹 Verificando estados expirados...');
    const expired = await cleanupExpiredStates();
    
    if (expired > 0) {
      console.log(`   🗑️ Eliminados ${expired} estados expirados`);
      
      // Volver a obtener estadísticas actualizadas
      const updatedStats = await getStateStatistics();
      console.log(`   📊 Estados activos tras limpieza: ${updatedStats.totalActive}`);
    } else {
      console.log('   ✅ No hay estados expirados');
    }
    
    console.log('\n✅ Estadísticas mostradas correctamente');
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    process.exit(1);
  }
}

// Ejecutar
showStateStatistics().then(() => {
  process.exit(0);
});
