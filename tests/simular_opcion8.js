/**
 * Script para simular el acceso a la opción 8 - Ayuda Post Reserva
 */

const { manejarPostReserva } = require('../routes/postReservaHandler');

// Mock del bot y función establecerEstado para pruebas
const mockBot = {
  sendMessage: async (remitente, opciones) => {
    console.log(`📤 [BOT → ${remitente}]: ${opciones.text}`);
    return Promise.resolve();
  }
};

const mockEstablecerEstado = async (remitente, estado, datos = {}) => {
  console.log(`🔄 [ESTADO] ${remitente}: ${estado}`, datos ? `(con datos: ${JSON.stringify(datos, null, 2)})` : '');
  return Promise.resolve();
};

async function simularAccesoOpcion8() {
  console.log('🎯 SIMULACIÓN DE ACCESO A OPCIÓN 8\n');
  console.log('==================================\n');

  const casos = [
    {
      remitente: '50487373838@s.whatsapp.net',
      descripcion: 'Usuario problemático (carlos velásquez)',
      esperado: 'Debería encontrar reserva pendiente ID 4'
    },
    {
      remitente: '50499222188@s.whatsapp.net', 
      descripcion: 'Usuario de prueba',
      esperado: 'Debería encontrar reserva pendiente ID 6'
    },
    {
      remitente: '50400000000@s.whatsapp.net',
      descripcion: 'Usuario sin reservas',
      esperado: 'Debería mostrar mensaje de acceso denegado'
    }
  ];

  for (let i = 0; i < casos.length; i++) {
    const caso = casos[i];
    console.log(`📱 Caso ${i + 1}: ${caso.descripcion}`);
    console.log(`   Remitente: ${caso.remitente}`);
    console.log(`   Esperado: ${caso.esperado}`);
    console.log('');

    try {
      // Simular que el usuario selecciona opción 8
      await manejarPostReserva(mockBot, caso.remitente, '8', mockEstablecerEstado);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

async function main() {
  await simularAccesoOpcion8();
  console.log('🏁 Simulación completada');
}

main().catch(console.error);
