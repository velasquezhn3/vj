/**
 * Prueba simple para verificar que la lógica de estados funcione correctamente
 * para la opción 1 del menú principal (Alojamientos)
 */

const stateService = require('./services/stateService');
const { handleMainMenuOptions } = require('./controllers/mainMenuHandler');

async function testMenuStateLogic() {
  console.log('🧪 Testing Menu State Logic - Option 1');
  console.log('=====================================\n');
  
  const testPhoneNumber = '5491234567890'; // Número de prueba
  
  try {
    // 1. Limpiar estado previo
    console.log('1️⃣ Estableciendo estado inicial...');
    await stateService.establecerEstado(testPhoneNumber, null);
    
    // 2. Verificar estado inicial
    const initialState = await stateService.obtenerEstado(testPhoneNumber);
    console.log(`Estado inicial: ${initialState || 'null'}`);
    
    // 3. Procesar opción 1 (Alojamientos)
    console.log('\n2️⃣ Procesando opción "1" (Alojamientos)...');
    
    // Mock del bot para evitar errores
    const mockBot = {
      sendMessage: () => Promise.resolve(),
      sendMessageWithOptions: () => Promise.resolve()
    };
    
    await handleMainMenuOptions(testPhoneNumber, '1', mockBot);
    
    // 4. Verificar el nuevo estado
    const newState = await stateService.obtenerEstado(testPhoneNumber);
    console.log(`Estado después de la opción 1: ${newState}`);
    
    // 5. Validar el resultado
    if (newState === 'LISTA_CABAÑAS') {
      console.log('\n🎉 ¡ÉXITO! El estado se estableció correctamente a "LISTA_CABAÑAS"');
      console.log('✅ La opción 1 ahora debería mostrar el menú de cabañas');
    } else if (newState === 'alojamientos') {
      console.log('\n❌ PROBLEMA: El estado sigue siendo "alojamientos" (estado antiguo)');
      console.log('❌ Esto causaría que el usuario regrese al menú principal');
    } else {
      console.log(`\n❓ Estado inesperado: "${newState}"`);
    }
    
    // 6. Verificar que los estados constantes están correctos
    console.log('\n3️⃣ Verificando constantes de estado...');
    const mainMenuHandler = require('./controllers/mainMenuHandler');
    console.log('Contenido del archivo mainMenuHandler:');
    
    // Leer el archivo para verificar las constantes
    const fs = require('fs');
    const content = fs.readFileSync('./controllers/mainMenuHandler.js', 'utf8');
    
    if (content.includes("LODGING: 'LISTA_CABAÑAS'")) {
      console.log('✅ CORRECTO: LODGING está definido como "LISTA_CABAÑAS"');
    } else if (content.includes("LODGING: 'alojamientos'")) {
      console.log('❌ PROBLEMA: LODGING sigue definido como "alojamientos"');
    } else {
      console.log('❓ No se pudo verificar la constante LODGING');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  }
}

// Ejecutar la prueba
testMenuStateLogic().then(() => {
  console.log('\n🏁 Prueba de lógica de estados completada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
