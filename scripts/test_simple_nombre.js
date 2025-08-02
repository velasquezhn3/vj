// Test simple para verificar que el nombre se personaliza
console.log('🧪 INICIANDO TEST SIMPLE');

const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');

// Mock simple del bot
const mockBot = {
  sendMessage: async (jid, message) => {
    console.log('\\n📤 MENSAJE A:', jid);
    console.log('📝 TEXTO:', message.text);
    
    // Verificar si el mensaje contiene un nombre personalizado
    if (message.text.includes('María González')) {
      console.log('✅ ÉXITO: El mensaje incluye el nombre personalizado "María González"');
    } else if (message.text.includes('Usuario') || message.text.includes('Estimado Cliente')) {
      console.log('❌ PROBLEMA: El mensaje usa un nombre genérico en lugar del nombre real');
    }
    
    return Promise.resolve();
  }
};

async function testSimple() {
  console.log('📋 Configurando estado del usuario...');
  
  const userId = '50498765432';
  const userJid = userId + '@s.whatsapp.net';
  const nombreUsuario = 'María González';
  
  // Establecer estado con nombre
  const datosReserva = {
    nombre: nombreUsuario,
    fechaEntrada: '2025-08-15',
    fechaSalida: '2025-08-18',
    personas: 2,
    tipoCabana: 'tortuga',
    precioTotal: 3000,
    noches: 3
  };
  
  await establecerEstado(userJid, 'RESERVA_PENDIENTE', datosReserva);
  console.log('✅ Estado establecido para:', nombreUsuario);
  
  console.log('\\n🎯 Ejecutando comando /confirmar...');
  
  try {
    await handleConfirmarCommand(mockBot, '1234567890-grupo@g.us', userId, {
      message: { conversation: `/confirmar ${userId}` }
    });
    
    console.log('\\n✅ Test completado');
  } catch (error) {
    console.log('\\n❌ Error:', error.message);
  }
}

testSimple().then(() => {
  console.log('\\n🏁 Fin del test');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
