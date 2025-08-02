// Test para verificar que el comando /confirmar ahora usa el nombre personalizado
const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');

// Mock del bot
const mockBot = {
  sendMessage: async (jid, message) => {
    console.log('📤 MENSAJE ENVIADO A:', jid);
    console.log('📝 CONTENIDO:', message.text);
    console.log('='.repeat(50));
    return Promise.resolve();
  }
};

async function testConfirmarPersonalizado() {
  console.log('🧪 INICIANDO TEST DEL COMANDO /confirmar PERSONALIZADO');
  console.log('='.repeat(60));
  
  const userId = '50498765432';
  const userJid = userId + '@s.whatsapp.net';
  const nombreUsuario = 'María González';
  
  // Establecer estado simulado con datos de reserva
  const datosReserva = {
    nombre: nombreUsuario,
    fechaEntrada: '2025-08-15',
    fechaSalida: '2025-08-18',
    personas: 2,
    tipoCabana: 'tortuga',
    precioTotal: 3000,
    noches: 3
  };
  
  console.log('📋 Estableciendo estado con datos:', datosReserva);
  establecerEstado(userJid, 'RESERVA_PENDIENTE', datosReserva);
  
  // Simular el comando desde el grupo
  const remitenteGrupo = '1234567890-grupo@g.us';
  const param = userId;
  
  const mensajeObj = {
    message: { conversation: `/confirmar ${userId}` }
  };
  
  console.log(`\n🎯 EJECUTANDO: /confirmar ${userId}`);
  console.log(`👤 Nombre esperado en el mensaje: ${nombreUsuario}`);
  console.log('\n--- MENSAJES ENVIADOS ---\n');
  
  try {
    await handleConfirmarCommand(mockBot, remitenteGrupo, param, mensajeObj);
    console.log('\n✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('Verifica que el mensaje de confirmación incluya el nombre "María González" en lugar de "Usuario"');
  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:', error.message);
    console.error('Stack completo:', error);
  }
}

// Ejecutar el test
testConfirmarPersonalizado().then(() => {
  console.log('\n🏁 Test finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
