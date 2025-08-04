const axios = require('axios');

async function testMenuAPI() {
  console.log('🌐 PROBANDO API DE ADMINISTRACIÓN DE TIPOS DE MENÚ\n');
  
  const baseURL = 'http://localhost:4000/admin';
  
  try {
    console.log('🔗 Conectando al servidor...');
    
    // 1. Obtener todos los tipos de menú
    console.log('\n✅ PASO 1: Obtener tipos de menú');
    try {
      const response = await axios.get(`${baseURL}/cabin-types`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Tipos encontrados: ${response.data.total}`);
      
      if (response.data.success && response.data.data.length > 0) {
        console.log('   Tipos disponibles:');
        response.data.data.forEach((type, index) => {
          console.log(`     ${index + 1}. ${type.nombre} (${type.type_key})`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log('   💡 El servidor no está corriendo. Ejecuta: npm start');
        return;
      }
    }
    
    // 2. Vista previa del menú
    console.log('\n✅ PASO 2: Vista previa del menú');
    try {
      const response = await axios.get(`${baseURL}/cabin-types/preview/menu`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Opciones de menú: ${response.data.totalOptions}`);
      
      if (response.data.success) {
        console.log('\n   🏖️ VISTA PREVIA DEL MENÚ:');
        response.data.menu.forEach(option => {
          console.log(`     ${option.text}`);
          console.log(`       - ${option.details.capacidad}`);
          console.log(`       - ${option.details.habitaciones} hab, ${option.details.baños} baños`);
          console.log(`       - ${option.details.precio} por noche`);
          console.log(`       - ${option.details.fotos} fotos disponibles`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // 3. Obtener tipo específico
    console.log('\n✅ PASO 3: Obtener tipo específico (tortuga)');
    try {
      const response = await axios.get(`${baseURL}/cabin-types/tortuga`);
      console.log(`   Status: ${response.status}`);
      
      if (response.data.success) {
        const type = response.data.data;
        console.log(`   Nombre: ${type.nombre}`);
        console.log(`   Capacidad: ${type.capacidad} personas`);
        console.log(`   Precio: ${type.moneda} ${type.precio_noche}`);
        console.log(`   Activo: ${type.activo ? '✅' : '❌'}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('\n🎉 PRUEBAS DE API COMPLETADAS');
    console.log('\n📋 ENDPOINTS DISPONIBLES:');
    console.log('   GET    /admin/cabin-types - Listar todos');
    console.log('   GET    /admin/cabin-types/:typeKey - Obtener específico');
    console.log('   PUT    /admin/cabin-types/:typeKey - Actualizar');
    console.log('   PATCH  /admin/cabin-types/:typeKey/toggle - Activar/desactivar');
    console.log('   POST   /admin/cabin-types - Crear nuevo');
    console.log('   GET    /admin/cabin-types/preview/menu - Vista previa menú');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Solo ejecutar si no hay argumentos o si se especifica 'test'
if (process.argv.length === 2 || process.argv[2] === 'test') {
  testMenuAPI();
} else {
  console.log('💡 Para probar la API: node test_menu_api.js test');
  console.log('🚀 Asegúrate de que el servidor esté corriendo: npm start');
}

module.exports = { testMenuAPI };
