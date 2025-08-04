// Limpiar cache de cabañas y probar
const cabinsDataService = require('./services/cabinsDataService');
const { generateDynamicMenu } = require('./controllers/mainMenuHandler');

async function testClean() {
    console.log('=== LIMPIANDO CACHE Y PROBANDO ===');
    
    // Limpiar cache
    cabinsDataService.clearCache();
    console.log('Cache limpiado');
    
    // Obtener cabañas frescas de BD
    const cabanas = await cabinsDataService.getAllCabins();
    console.log(`Total cabañas: ${cabanas.length}`);
    
    console.log('Cabañas:');
    cabanas.forEach((c, i) => {
        console.log(`${i+1}. ${c.name} (${c.capacity} personas) - $${c.price || c.basePrice}`);
    });
    
    // Generar menú
    console.log('\n=== MENU DINÁMICO ===');
    const menuMessage = await generateDynamicMenu('cabañas');
    console.log(menuMessage);
}

testClean().catch(console.error);
