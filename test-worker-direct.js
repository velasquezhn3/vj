const { getQueueManager } = require('./services/whatsappQueueService');

async function testQueueWorker() {
  console.log('🧪 Iniciando test del worker de cola...');
  
  try {
    const queueManager = getQueueManager();
    
    console.log('📋 Inicializando queue manager...');
    await queueManager.init();
    
    console.log('🤖 Configurando bot falso para test...');
    const fakeBotInstance = {
      sendMessage: async (jid, message) => {
        console.log(`📤 [FAKE BOT] Enviando a ${jid}: ${message.text || JSON.stringify(message)}`);
        return { status: 'sent' };
      }
    };
    
    queueManager.setBotInstance(fakeBotInstance);
    
    console.log('📨 Añadiendo mensaje de prueba a la cola...');
    await queueManager.addMessageToQueue(
      fakeBotInstance,
      '50487373838@s.whatsapp.net',
      'test worker',
      { 
        key: { remoteJid: '50487373838@s.whatsapp.net' },
        message: { conversation: 'test worker' }
      },
      'text'
    );
    
    console.log('⏳ Esperando 5 segundos para ver si el worker procesa el mensaje...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Test completado');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testQueueWorker();
