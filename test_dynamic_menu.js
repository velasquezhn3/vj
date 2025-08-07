const { generateDynamicMenu } = require('./controllers/mainMenuHandler');

async function testDynamicActivitiesMenu() {
    console.log('🧪 Probando menú dinámico de actividades...');
    
    try {
        const menuActividades = await generateDynamicMenu('actividades');
        console.log('✅ Menú generado:');
        console.log(menuActividades);
        
        // También probar cabañas para comparar
        console.log('\n🏠 Probando menú de cabañas para comparar:');
        const menuCabanas = await generateDynamicMenu('cabañas');
        console.log(menuCabanas);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testDynamicActivitiesMenu();
