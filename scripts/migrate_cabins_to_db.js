#!/usr/bin/env node
/**
 * Script de migración de datos de cabañas desde JSON a base de datos
 */

const cabinsDataService = require('../services/cabinsDataService');

console.log('🏠 MIGRACIÓN DE DATOS DE CABAÑAS');
console.log('================================\n');

async function migrateCabinsData() {
  try {
    console.log('1. Inicializando tablas de cabañas...');
    await cabinsDataService.initializeTables();
    console.log('   ✅ Tablas verificadas correctamente\n');
    
    console.log('2. Verificando datos existentes...');
    const statsBefore = await cabinsDataService.getStatistics();
    console.log(`   📊 Cabañas actuales en BD: ${statsBefore.activeCabins}`);
    console.log(`   📊 Total de fotos: ${statsBefore.totalPhotos}\n`);
    
    console.log('3. Iniciando migración desde JSON...');
    const migratedCount = await cabinsDataService.migrateFromJSON();
    console.log(`   ✅ Migradas ${migratedCount} cabañas nuevas\n`);
    
    console.log('4. Verificando migración...');
    const statsAfter = await cabinsDataService.getStatistics();
    console.log('   📊 Estadísticas finales:');
    console.log(`      - Total de cabañas: ${statsAfter.totalCabins}`);
    console.log(`      - Cabañas activas: ${statsAfter.activeCabins}`);
    console.log(`      - Cabañas inactivas: ${statsAfter.inactiveCabins}`);
    console.log(`      - Capacidad promedio: ${statsAfter.averageCapacity} personas`);
    console.log(`      - Rango de precios: $${statsAfter.priceRange.min} - $${statsAfter.priceRange.max}`);
    console.log(`      - Total de fotos: ${statsAfter.totalPhotos}`);
    
    console.log('\n5. Probando acceso a datos...');
    const allCabins = await cabinsDataService.getAllCabins();
    console.log(`   🏠 Cabañas disponibles: ${allCabins.length}`);
    
    if (allCabins.length > 0) {
      console.log('   📋 Lista de cabañas:');
      allCabins.forEach(cabin => {
        console.log(`      • ${cabin.name} (Capacidad: ${cabin.capacity}, Precio: $${cabin.basePrice})`);
      });
    }
    
    console.log('\n✅ MIGRACIÓN DE CABAÑAS COMPLETADA');
    console.log('==================================');
    console.log('');
    console.log('📋 Cambios realizados:');
    console.log('  • Datos de cabañas migrados desde JSON a BD');
    console.log('  • Fotos de cabañas organizadas correctamente');
    console.log('  • Sistema de cache implementado');
    console.log('  • Servicio unificado de datos de cabañas creado');
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('  • Actualizar controladores para usar nuevo servicio');
    console.log('  • Crear backup del archivo JSON original');
    console.log('  • Probar funcionalidades del bot');
    console.log('');
    console.log('🔧 Scripts útiles:');
    console.log('  • node scripts/test_cabins_service.js - Probar nuevo servicio');
    console.log('  • node scripts/cabins_statistics.js - Ver estadísticas');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.log('\n🚨 La migración falló. Los archivos JSON siguen siendo usados.');
    process.exit(1);
  }
}

// Ejecutar migración
migrateCabinsData().then(() => {
  console.log('\n🎉 ¡Migración de cabañas finalizada!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
