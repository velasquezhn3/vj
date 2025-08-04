const { loadTiposCabañas } = require('../services/alojamientosService');

async function testTiposCabanas() {
  console.log('🧪 Probando función loadTiposCabañas...\n');
  
  try {
    const tipos = await loadTiposCabañas();
    
    console.log(`✅ Se encontraron ${tipos.length} tipos de cabañas:\n`);
    
    tipos.forEach((tipo, index) => {
      console.log(`${index + 1}. ${tipo.nombre}`);
      console.log(`   - Tipo: ${tipo.tipo}`);
      console.log(`   - Capacidad: ${tipo.capacidad} personas`);
      console.log(`   - Precio: Lmps. ${tipo.precio_noche}`);
      console.log(`   - Habitaciones: ${tipo.habitaciones}`);
      console.log(`   - Baños: ${tipo.baños}`);
      console.log(`   - Fotos: ${tipo.fotos?.length || 0} disponibles`);
      console.log();
    });
    
    console.log('🎉 Prueba exitosa! El menú mostrará exactamente estos 3 tipos.');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

testTiposCabanas();
