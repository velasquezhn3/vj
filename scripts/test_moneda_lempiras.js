// Test para verificar que todos los precios ahora aparecen en Lempiras (Lmps.)
console.log('🧪 VERIFICANDO CAMBIOS DE MONEDA');
console.log('=' .repeat(50));

const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');

// Mock del bot para capturar los mensajes
const mockBot = {
  sendMessage: async (jid, message) => {
    console.log('\\n📤 MENSAJE ENVIADO:');
    console.log('📝 CONTENIDO:', message.text);
    
    // Verificar que no aparezca el símbolo de dólar
    if (message.text.includes('$')) {
      console.log('❌ ERROR: Aún aparece el símbolo $ en el mensaje');
    } else if (message.text.includes('Lmps.')) {
      console.log('✅ CORRECTO: El mensaje usa Lmps. (Lempiras)');
    }
    
    console.log('-'.repeat(40));
    return Promise.resolve();
  }
};

async function testMonedaLempiras() {
  console.log('📋 Configurando reserva de prueba...');
  
  const userId = '50412345678';
  const userJid = userId + '@s.whatsapp.net';
  
  // Datos de prueba con precio en lempiras
  const datosReserva = {
    nombre: 'Carlos Mendoza',
    fechaEntrada: '2025-08-20',
    fechaSalida: '2025-08-23',
    personas: 3,
    tipoCabana: 'delfin',
    precioTotal: 15000,  // 15,000 lempiras
    noches: 3
  };
  
  await establecerEstado(userJid, 'RESERVA_PENDIENTE', datosReserva);
  console.log('✅ Estado establecido');
  console.log(`💰 Precio de prueba: ${datosReserva.precioTotal} (debería mostrarse como Lmps. 15,000)`);
  
  console.log('\\n🎯 Ejecutando comando /confirmar...');
  
  try {
    await handleConfirmarCommand(mockBot, '1234567890-grupo@g.us', userId, {
      message: { conversation: `/confirmar ${userId}` }
    });
    
    console.log('\\n✅ Test de moneda completado');
    console.log('Verifica que todos los precios aparezcan como "Lmps." y no como "$"');
  } catch (error) {
    console.log('\\n❌ Error en el test:', error.message);
  }
}

// Ejecutar test
testMonedaLempiras().then(() => {
  console.log('\\n🏁 Verificación de moneda finalizada');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});
