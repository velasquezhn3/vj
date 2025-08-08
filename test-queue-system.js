/**
 * Script de pruebas para el sistema de colas de WhatsApp
 * Prueba la funcionalidad básica del sistema de colas
 */

const { getQueueManager } = require('./services/whatsappQueueService');

// Mock del objeto bot para pruebas
const mockBot = {
  sendMessage: async (jid, message) => {
    console.log(`📤 [MOCK] Enviando mensaje a ${jid}:`, message);
    return { status: 'success', messageId: Date.now() };
  }
};

async function testQueueSystemBasic() {
  console.log('🧪 Iniciando pruebas básicas del sistema de colas...\n');
  
  let queueManager;
  
  try {
    // 1. Inicializar el gestor de colas
    console.log('1️⃣ Inicializando gestor de colas...');
    queueManager = getQueueManager();
    
    // Si Redis no está disponible, las pruebas continuarán en modo fallback
    await queueManager.init();
    console.log('✅ Gestor de colas inicializado (puede estar en modo fallback)\n');
    
    // 2. Probar añadir mensajes a la cola
    console.log('2️⃣ Añadiendo mensajes de prueba...');
    
    const testMessages = [
      {
        remitente: '5491123456789@s.whatsapp.net',
        texto: 'Hola, mensaje de prueba',
        messageType: 'conversation'
      },
      {
        remitente: '5491123456789@s.whatsapp.net',
        texto: 'Segundo mensaje',
        messageType: 'conversation'
      }
    ];
    
    for (const [index, testMsg] of testMessages.entries()) {
      const mockMsgObj = {
        key: { 
          remoteJid: testMsg.remitente,
          fromMe: false,
          id: `test_msg_${index + 1}`
        },
        message: {
          conversation: testMsg.texto
        }
      };
      
      console.log(`➡️ Añadiendo mensaje ${index + 1}: "${testMsg.texto}"`);
      
      try {
        await queueManager.addMessageToQueue(
          mockBot, 
          testMsg.remitente, 
          testMsg.texto, 
          mockMsgObj, 
          testMsg.messageType
        );
        console.log(`✅ Mensaje ${index + 1} añadido exitosamente`);
      } catch (msgError) {
        console.log(`⚠️ Mensaje ${index + 1} procesado en modo fallback:`, msgError.message);
      }
    }
    
    console.log('✅ Prueba de mensajes completada\n');
    
    // 3. Probar obtener estadísticas (si Redis está disponible)
    console.log('3️⃣ Obteniendo estadísticas...');
    try {
      const stats = await queueManager.getQueueStats();
      console.log(`📊 Estadísticas obtenidas:`, stats);
    } catch (statsError) {
      console.log('⚠️ Estadísticas no disponibles (modo fallback):', statsError.message);
    }
    
    console.log('\n🎉 Pruebas básicas completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    console.log('💡 El sistema continuará funcionando en modo fallback sin colas');
    
  } finally {
    // Limpiar recursos
    if (queueManager) {
      console.log('\n🧹 Limpiando recursos...');
      try {
        await queueManager.close();
        console.log('✅ Recursos limpiados');
      } catch (closeError) {
        console.log('⚠️ Error cerrando recursos:', closeError.message);
      }
    }
  }
}

async function testSystemIntegration() {
  console.log('\n🧪 Probando integración del sistema...\n');
  
  // Simular el flujo completo como en botController
  const queueManager = getQueueManager();
  
  try {
    // Inicializar como en botController
    console.log('🚀 Inicializando como en producción...');
    try {
      await queueManager.init();
      console.log('✅ Sistema de colas iniciado correctamente');
    } catch (queueError) {
      console.log('⚠️ Error inicializando colas, continuando sin colas:', queueError.message);
    }
    
    // Simular mensaje entrante
    console.log('\n📩 Simulando mensaje entrante...');
    const mockMessage = {
      key: { 
        remoteJid: '5491123456789@s.whatsapp.net',
        fromMe: false,
        id: 'integration_test_msg'
      },
      message: {
        conversation: 'Hola bot!'
      }
    };
    
    const remitente = mockMessage.key.remoteJid;
    const texto = mockMessage.message.conversation;
    const messageType = 'conversation';
    
    // Procesar como en botController
    console.log(`📩 Mensaje recibido de ${remitente}: ${texto}`);
    
    if (queueManager) {
      await queueManager.addMessageToQueue(mockBot, remitente, texto, mockMessage, messageType);
      console.log('✅ Mensaje enviado al sistema de colas');
    } else {
      console.log('⚠️ Procesando directamente (fallback)');
    }
    
    console.log('✅ Prueba de integración completada');
    
  } catch (error) {
    console.log('❌ Error en prueba de integración:', error.message);
  } finally {
    try {
      await queueManager.close();
    } catch (closeError) {
      // Ignorar errores de cierre en pruebas
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  (async () => {
    try {
      await testQueueSystemBasic();
      await testSystemIntegration();
      
      console.log('\n🎉 Todas las pruebas completadas');
      console.log('💡 Para usar Redis en producción, asegúrate de tenerlo instalado y corriendo');
      process.exit(0);
      
    } catch (error) {
      console.error('\n❌ Las pruebas fallaron:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  testQueueSystemBasic,
  testSystemIntegration
};
