/**
 * Script para agregar mensajes continuos y ver actividad en tiempo real
 */

const { getQueueManager } = require('./services/whatsappQueueService');

async function addContinuousMessages() {
  try {
    console.log('🔄 Iniciando generación continua de mensajes...');
    
    const queueManager = getQueueManager();
    
    // Esperar inicialización
    let attempts = 0;
    while (!queueManager.isInitialized && attempts < 10) {
      console.log('⏳ Esperando inicialización...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (!queueManager.isInitialized) {
      console.log('❌ No se pudo inicializar el queue manager');
      return;
    }
    
    console.log('✅ Queue manager inicializado');
    
    const fakeBotInstance = { sendMessage: () => Promise.resolve() };
    
    // Mensajes de prueba variados
    const testMessages = [
      'Hola, quiero hacer una reserva para este fin de semana',
      '¿Qué actividades tienen disponibles?',
      'Necesito información sobre precios de cabañas',
      'Me interesa saber sobre paquetes familiares',
      'Quiero hacer una reserva para 4 personas',
      '¿Tienen disponibilidad para diciembre?',
      'Me pueden enviar la lista de actividades',
      'Quiero cancelar mi reserva',
      'Necesito modificar mi reserva',
      '¿A qué hora abren?'
    ];
    
    let messageCount = 0;
    
    // Agregar mensaje cada 5 segundos
    const interval = setInterval(async () => {
      try {
        const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
        const sender = `test${messageCount + 1}@s.whatsapp.net`;
        
        console.log(`\n📤 [${new Date().toLocaleTimeString()}] Agregando mensaje ${messageCount + 1}:`);
        console.log(`👤 De: ${sender}`);
        console.log(`💬 Texto: ${randomMessage}`);
        
        const result = await queueManager.addMessageToQueue(
          fakeBotInstance,
          sender,
          randomMessage,
          { fake: true, timestamp: Date.now() },
          'text'
        );
        
        if (result.success) {
          console.log(`✅ Mensaje agregado con jobId: ${result.jobId}`);
        } else {
          console.log(`❌ Error agregando mensaje: ${result.error || 'Unknown error'}`);
        }
        
        // Mostrar estadísticas cada 3 mensajes
        if ((messageCount + 1) % 3 === 0) {
          try {
            const stats = await queueManager.getQueueStats();
            console.log('\n📊 Estadísticas actuales:');
            console.log(`   - En espera: ${stats.waiting || 0}`);
            console.log(`   - Activos: ${stats.active || 0}`);
            console.log(`   - Completados: ${stats.completed || 0}`);
            console.log(`   - Total: ${stats.total || 0}`);
          } catch (statsError) {
            console.log('⚠️ Error obteniendo estadísticas:', statsError.message);
          }
        }
        
        messageCount++;
        
        // Parar después de 20 mensajes
        if (messageCount >= 20) {
          console.log('\n🏁 Alcanzado límite de 20 mensajes. Deteniendo...');
          clearInterval(interval);
          
          // Mostrar estadísticas finales
          setTimeout(async () => {
            try {
              const finalStats = await queueManager.getQueueStats();
              console.log('\n📊 ESTADÍSTICAS FINALES:');
              console.log(`   - En espera: ${finalStats.waiting || 0}`);
              console.log(`   - Activos: ${finalStats.active || 0}`);
              console.log(`   - Completados: ${finalStats.completed || 0}`);
              console.log(`   - Fallidos: ${finalStats.failed || 0}`);
              console.log(`   - Total: ${finalStats.total || 0}`);
              console.log('\n🎯 Revisa el dashboard para ver la actividad');
            } catch (error) {
              console.error('Error obteniendo estadísticas finales:', error);
            }
            
            process.exit(0);
          }, 3000);
        }
        
      } catch (error) {
        console.error('❌ Error en mensaje continuo:', error);
      }
    }, 5000); // Cada 5 segundos
    
    console.log('🔄 Agregando un mensaje cada 5 segundos...');
    console.log('🔍 Ve al dashboard http://localhost:3001/queue-dashboard para ver la actividad');
    
  } catch (error) {
    console.error('❌ Error en script continuo:', error);
    process.exit(1);
  }
}

addContinuousMessages();
