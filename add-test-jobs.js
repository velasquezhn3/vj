const { getQueueManager } = require('./services/whatsappQueueService');

async function addTestJobs() {
  console.log('🧪 Agregando trabajos de prueba...\n');
  
  try {
    const queueManager = getQueueManager();
    
    if (!queueManager.isInitialized) {
      console.log('⏳ Esperando inicialización del QueueManager...');
      await queueManager.init();
    }
    
    const testMessages = [
      {
        sender: '50498765432@c.us',
        text: 'Hola, me interesa una cabaña para el fin de semana',
        messageType: 'text'
      },
      {
        sender: '50487654321@c.us', 
        text: '¿Tienen disponibilidad para 4 personas?',
        messageType: 'text'
      },
      {
        sender: '50476543210@c.us',
        text: 'Quiero hacer una reserva',
        messageType: 'text'
      },
      {
        sender: '50465432109@c.us',
        text: '1', // Opción de menú
        messageType: 'text'
      },
      {
        sender: '50454321098@c.us',
        text: 'Gracias por la información',
        messageType: 'text'
      }
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      
      console.log(`📤 Agregando trabajo ${i + 1}: ${message.text}`);
      
      try {
        await queueManager.addMessageToQueue(
          null, // Mock bot instance
          message.sender,
          message.text,
          { from: message.sender, body: message.text },
          message.messageType
        );
        
        console.log(`   ✅ Trabajo agregado correctamente`);
        
        // Esperar un poco entre trabajos
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Error agregando trabajo: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Trabajos de prueba agregados. Revisa el dashboard!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  addTestJobs().then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  });
}

module.exports = { addTestJobs };
