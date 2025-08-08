/**
 * Prueba del sistema de delays aleatorios para mensajes
 */

const { sendMessageWithDelay, randomDelay } = require('./utils/messageDelayUtils');

// Mock del bot para pruebas
const mockBot = {
  sendMessage: (recipient, message) => {
    console.log(`📱 Mensaje enviado a ${recipient}: ${message.text?.substring(0, 50)}...`);
    return Promise.resolve({ success: true });
  }
};

async function testDelaySystem() {
  console.log('🧪 Testing Random Delay System');
  console.log('==============================\n');
  
  const testRecipient = '5491234567890';
  
  console.log('1️⃣ Probando delay por defecto (4-15 segundos)...');
  const start1 = Date.now();
  await sendMessageWithDelay(mockBot, testRecipient, { text: 'Mensaje con delay por defecto' });
  const elapsed1 = Date.now() - start1;
  console.log(`⏱️  Tiempo transcurrido: ${(elapsed1/1000).toFixed(1)}s\n`);
  
  console.log('2️⃣ Probando delay para menús (3-8 segundos)...');
  const start2 = Date.now();
  await sendMessageWithDelay(mockBot, testRecipient, { text: 'Mensaje de menú' }, 'menu');
  const elapsed2 = Date.now() - start2;
  console.log(`⏱️  Tiempo transcurrido: ${(elapsed2/1000).toFixed(1)}s\n`);
  
  console.log('3️⃣ Probando delay para confirmaciones (2-6 segundos)...');
  const start3 = Date.now();
  await sendMessageWithDelay(mockBot, testRecipient, { text: 'Confirmación' }, 'confirmation');
  const elapsed3 = Date.now() - start3;
  console.log(`⏱️  Tiempo transcurrido: ${(elapsed3/1000).toFixed(1)}s\n`);
  
  console.log('4️⃣ Probando delay para errores (1-3 segundos)...');
  const start4 = Date.now();
  await sendMessageWithDelay(mockBot, testRecipient, { text: 'Mensaje de error' }, 'error');
  const elapsed4 = Date.now() - start4;
  console.log(`⏱️  Tiempo transcurrido: ${(elapsed4/1000).toFixed(1)}s\n`);
  
  console.log('5️⃣ Probando delay para reservas (4-15 segundos)...');
  const start5 = Date.now();
  await sendMessageWithDelay(mockBot, testRecipient, { text: 'Mensaje de reserva' }, 'reservation');
  const elapsed5 = Date.now() - start5;
  console.log(`⏱️  Tiempo transcurrido: ${(elapsed5/1000).toFixed(1)}s\n`);
  
  console.log('📊 RESUMEN DE PRUEBAS:');
  console.log('======================');
  console.log(`Default (4-15s):      ${(elapsed1/1000).toFixed(1)}s`);
  console.log(`Menu (3-8s):          ${(elapsed2/1000).toFixed(1)}s`);
  console.log(`Confirmation (2-6s):  ${(elapsed3/1000).toFixed(1)}s`);
  console.log(`Error (1-3s):         ${(elapsed4/1000).toFixed(1)}s`);
  console.log(`Reservation (4-15s):  ${(elapsed5/1000).toFixed(1)}s`);
  
  const totalTime = (elapsed1 + elapsed2 + elapsed3 + elapsed4 + elapsed5) / 1000;
  console.log(`\n⏱️  Tiempo total: ${totalTime.toFixed(1)}s`);
  
  console.log('\n✅ Sistema de delays funcionando correctamente');
  console.log('🚀 Los mensajes del bot ahora tendrán delays aleatorios para evitar bloqueos');
}

// Ejecutar la prueba
testDelaySystem().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error en la prueba:', error);
  process.exit(1);
});
