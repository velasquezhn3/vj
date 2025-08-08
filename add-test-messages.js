/**
 * Script para agregar mensajes de prueba a la cola
 */

const { getQueueManager } = require('./services/whatsappQueueService');

async function addTestMessages() {
  try {
    console.log('🧪 Agregando mensajes de prueba a la cola...\n');
    
    const queueManager = getQueueManager();
    
    // Esperar a que se inicialice
    let attempts = 0;
    while (!queueManager.isInitialized && attempts < 10) {
      console.log('⏳ Esperando inicialización de cola...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (!queueManager.isInitialized) {
      console.log('❌ Cola no inicializada después de 10 intentos');
      return;
    }
    
    console.log('✅ Cola inicializada, agregando mensajes...\n');
    
    // Simular instancia de bot (para prueba)
    const fakeBotInstance = { sendMessage: () => Promise.resolve() };
    
    // Agregar varios mensajes de prueba
    const testMessages = [
      {
        sender: '123456789@s.whatsapp.net',
        text: 'Hola, quiero hacer una reserva',
        messageType: 'text'
      },
      {
        sender: '987654321@s.whatsapp.net', 
        text: '¿Qué actividades tienen disponibles?',
        messageType: 'text'
      },
      {
        sender: '555666777@s.whatsapp.net',
        text: 'Necesito información sobre precios',
        messageType: 'text'
      }
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i];
      console.log(`📤 Agregando mensaje ${i+1}: ${msg.text.substring(0, 30)}...`);
      
      const result = await queueManager.addMessageToQueue(
        fakeBotInstance,
        msg.sender,
        msg.text,
        { fake: true }, // mensaje original simulado
        msg.messageType
      );
      
      if (result.success) {
        console.log(`✅ Mensaje ${i+1} agregado con jobId: ${result.jobId}`);
      } else {
        console.log(`❌ Error agregando mensaje ${i+1}`);
      }
      
      // Delay entre mensajes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Obtener estadísticas actualizadas
    console.log('\n📊 Estadísticas después de agregar mensajes:');
    const stats = await queueManager.getQueueStats();
    console.log('- En espera:', stats.waiting || 0);
    console.log('- Activos:', stats.active || 0);
    console.log('- Total:', stats.total || 0);
    
    console.log('\n✅ Mensajes de prueba agregados exitosamente');
    console.log('🔍 Revisa el dashboard en http://localhost:3001 para ver las estadísticas');
    
  } catch (error) {
    console.error('❌ Error agregando mensajes:', error);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

addTestMessages();
