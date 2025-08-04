// Test del flujo completo de estados y cabañas
const { establecerEstado, obtenerEstado } = require('./services/persistentStateService');
const { generateDynamicMenu } = require('./controllers/mainMenuHandler');
const cabinsDataService = require('./services/cabinsDataService');

async function testFlow() {
    const testUserId = '5493513876543@s.whatsapp.net';
    
    console.log('=== INICIANDO PRUEBAS ===');
    
    // 1. Prueba inicial de estado
    console.log('\n1. Probando estado inicial...');
    const estadoInicial = await obtenerEstado(testUserId);
    console.log('Estado inicial:', estadoInicial);
    
    // 2. Establecer estado MENU_PRINCIPAL
    console.log('\n2. Estableciendo estado MENU_PRINCIPAL...');
    await establecerEstado(testUserId, 'MENU_PRINCIPAL', { nombre: 'Usuario Test' });
    
    // 3. Verificar estado guardado
    console.log('\n3. Verificando estado guardado...');
    const estadoGuardado = await obtenerEstado(testUserId);
    console.log('Estado guardado:', estadoGuardado);
    
    // 4. Probar servicio de cabañas
    console.log('\n4. Probando servicio de cabañas...');
    const cabanas = await cabinsDataService.getAllCabins();
    console.log(`Total cabañas: ${cabanas.length}`);
    console.log('Estructura primera cabaña:', JSON.stringify(cabanas[0], null, 2));
    console.log('Primeras 3 cabañas:', cabanas.slice(0, 3).map(c => `${c.id}: ${c.nombre || c.name || 'SIN_NOMBRE'}`));
    
    // 5. Generar mensaje del menú de cabañas
    console.log('\n5. Generando mensaje del menú de cabañas...');
    const mensajeMenu = await generateDynamicMenu('cabañas');
    console.log('Mensaje del menú:');
    console.log(mensajeMenu);
    
    console.log('\n=== PRUEBAS COMPLETADAS ===');
}

testFlow().catch(console.error);
