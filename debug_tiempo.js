const { calcularTiempoRestante } = require('./routes/postReservaHandler');

function debugTiempo() {
  console.log('🧪 DEBUG CÁLCULO DE TIEMPO\n');
  
  const fechaDB = '2025-07-31 21:36:23';
  console.log(`📅 Fecha en BD: ${fechaDB}`);
  
  const ahora = new Date();
  const fechaCreacion = new Date(fechaDB);
  
  console.log(`⏰ Ahora: ${ahora.toISOString()}`);
  console.log(`📅 Fecha creación: ${fechaCreacion.toISOString()}`);
  
  const tiempoTranscurrido = ahora - fechaCreacion;
  const horasTranscurridas = tiempoTranscurrido / (1000 * 60 * 60);
  
  console.log(`⏱️ Tiempo transcurrido: ${horasTranscurridas.toFixed(2)} horas`);
  console.log(`⏱️ Tiempo restante: ${(24 - horasTranscurridas).toFixed(2)} horas`);
  
  // Probar función
  const resultado = calcularTiempoRestante(fechaDB);
  console.log('\n📊 Resultado función:');
  console.log(resultado);
}

debugTiempo();
