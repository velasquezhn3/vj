// Test específico para verificar el procesamiento de mensajes
const WhatsAppQueueManager = require('./services/whatsappQueueService');

async function testMessageProcessing() {
  console.log('🧪 [TEST] Iniciando prueba específica de procesamiento de mensajes...');
  
  try {
    // Crear instancia del queue manager
    const queueManager = new WhatsAppQueueManager();
    
    // Esperar a que se inicialice
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ [TEST] Queue manager creado');
    
    // Verificar estado del queue
    console.log('📊 [TEST] Estado de inicialización:', queueManager.isInitialized);
    
    if (!queueManager.isInitialized) {
      console.log('❌ [TEST] Queue no inicializado - esto explicaría por qué no responde');
    } else {
      console.log('✅ [TEST] Queue correctamente inicializado');
    }
    
  } catch (error) {
    console.error('❌ [TEST] Error:', error);
  }
  
  process.exit(0);
}

testMessageProcessing();
