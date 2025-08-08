/**
 * Prueba específica para verificar que la opción 1 del menú principal
 * muestre correctamente el menú de cabañas dinámico
 */

const { procesarMensaje } = require('./controllers/flows/messageProcessor');
const messagingService = require('./services/messagingService');

// Mock del servicio de mensajería para capturar las respuestas
const mockResponses = [];
const originalSendMessage = messagingService.sendMessage;
messagingService.sendMessage = (phoneNumber, message) => {
  mockResponses.push({ phoneNumber, message });
  console.log(`📱 Mensaje a ${phoneNumber}:`);
  console.log(message);
  console.log('---');
  return Promise.resolve();
};

async function testMenuOption1() {
  console.log('🧪 Testing Menu Option 1 - Alojamientos');
  console.log('=====================================\n');
  
  const testPhoneNumber = '5491234567890'; // Número de prueba
  
  try {
    // 1. Primero enviamos 'menu' para obtener el menú principal
    console.log('1️⃣ Enviando comando "menu" para mostrar menú principal');
    mockResponses.length = 0; // Limpiar respuestas previas
    
    await procesarMensaje(testPhoneNumber, 'menu');
    console.log(`✅ Respuestas del menú principal: ${mockResponses.length}\n`);
    
    // 2. Ahora enviamos '1' para seleccionar Alojamientos
    console.log('2️⃣ Enviando opción "1" para seleccionar Alojamientos');
    mockResponses.length = 0; // Limpiar respuestas previas
    
    await procesarMensaje(testPhoneNumber, '1');
    
    // 3. Verificar las respuestas
    console.log(`✅ Respuestas de la opción 1: ${mockResponses.length}`);
    
    if (mockResponses.length > 0) {
      const response = mockResponses[0].message;
      
      // Verificar que la respuesta contiene elementos del menú de cabañas
      const hasLaCabaña = response.includes('La Cabaña');
      const hasElRefugio = response.includes('El Refugio');
      const hasLaCasita = response.includes('La Casita');
      const hasMenuStructure = response.includes('1️⃣') || response.includes('2️⃣');
      
      console.log('\n📊 Análisis de la respuesta:');
      console.log(`- Contiene "La Cabaña": ${hasLaCabaña ? '✅' : '❌'}`);
      console.log(`- Contiene "El Refugio": ${hasElRefugio ? '✅' : '❌'}`);
      console.log(`- Contiene "La Casita": ${hasLaCasita ? '✅' : '❌'}`);
      console.log(`- Tiene estructura de menú: ${hasMenuStructure ? '✅' : '❌'}`);
      
      if (hasLaCabaña && hasElRefugio && hasLaCasita && hasMenuStructure) {
        console.log('\n🎉 ¡ÉXITO! El menú de cabañas se muestra correctamente');
      } else {
        console.log('\n❌ FALLO: La respuesta no parece ser el menú de cabañas');
        console.log('Contenido de la respuesta:');
        console.log(response);
      }
    } else {
      console.log('\n❌ FALLO: No se recibió ninguna respuesta');
    }
    
    // 4. Prueba adicional: verificar que no regresa al menú principal
    console.log('\n3️⃣ Verificando que no regresa al menú principal...');
    
    const response = mockResponses[0]?.message || '';
    const isMainMenu = response.includes('¡Hola! 👋 Soy tu asistente virtual') || 
                       response.includes('¿En qué puedo ayudarte?') ||
                       response.includes('1️⃣ 🏠 Alojamientos') ||
                       response.includes('2️⃣ 📅 Reservar fechas');
    
    if (isMainMenu) {
      console.log('❌ PROBLEMA: La opción 1 está regresando al menú principal');
    } else {
      console.log('✅ CORRECTO: No regresa al menú principal');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
  
  // Restaurar el servicio original
  messagingService.sendMessage = originalSendMessage;
}

// Ejecutar la prueba
testMenuOption1().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
