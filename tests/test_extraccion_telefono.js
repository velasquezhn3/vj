/**
 * Script para probar la extracción del número de teléfono y búsqueda de reservas
 */

const { buscarReservaActivaOPendiente } = require('../routes/postReservaHandler');

async function probarExtraccionTelefono() {
  console.log('🧪 Probando extracción de número de teléfono...\n');

  const casos = [
    {
      remitente: '50487373838@s.whatsapp.net',
      esperado: '50487373838',
      descripcion: 'ID de WhatsApp completo'
    },
    {
      remitente: '50487373838',
      esperado: '50487373838', 
      descripcion: 'Solo número'
    },
    {
      remitente: '50499222188@s.whatsapp.net',
      esperado: '50499222188',
      descripcion: 'Usuario de prueba'
    }
  ];

  for (const caso of casos) {
    console.log(`📱 Probando: ${caso.descripcion}`);
    console.log(`   Remitente: ${caso.remitente}`);
    
    // Extraer teléfono (simular la lógica del código)
    const telefono = caso.remitente.replace('@s.whatsapp.net', '');
    console.log(`   Teléfono extraído: ${telefono}`);
    console.log(`   ¿Correcto?: ${telefono === caso.esperado ? '✅' : '❌'}`);
    
    // Probar búsqueda de reserva
    try {
      const reserva = await buscarReservaActivaOPendiente(telefono);
      if (reserva) {
        console.log(`   ✅ Reserva encontrada: ID ${reserva.reservation_id} (${reserva.tipo})`);
      } else {
        console.log(`   ❌ Sin reservas`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Línea en blanco
  }
}

// Función para probar específicamente el caso problemático
async function probarCasoProblematico() {
  console.log('🔍 Probando caso problemático específico...\n');
  
  const remitente = '50487373838@s.whatsapp.net';
  const telefono = remitente.replace('@s.whatsapp.net', '');
  
  console.log(`📱 Remitente original: ${remitente}`);
  console.log(`📱 Teléfono extraído: ${telefono}`);
  
  try {
    const reserva = await buscarReservaActivaOPendiente(telefono);
    
    if (reserva) {
      console.log(`✅ ¡Reserva encontrada!`);
      console.log(`   - ID: ${reserva.reservation_id}`);
      console.log(`   - Tipo: ${reserva.tipo}`);
      console.log(`   - Estado: ${reserva.status}`);
      console.log(`   - Huésped: ${reserva.guest_name}`);
      console.log(`   - Fechas: ${reserva.check_in_date} a ${reserva.check_out_date}`);
    } else {
      console.log(`❌ No se encontró reserva`);
    }
  } catch (error) {
    console.error(`❌ Error en búsqueda: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 PRUEBAS DE EXTRACCIÓN DE TELÉFONO\n');
  console.log('====================================\n');
  
  await probarExtraccionTelefono();
  await probarCasoProblematico();
  
  console.log('🏁 Pruebas completadas');
}

main().catch(console.error);
