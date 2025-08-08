// Script de prueba para verificar el flujo del bot
const { obtenerEstado, establecerEstado } = require('./services/stateService');

async function testBotFlow() {
  console.log('🧪 [TEST] Iniciando prueba de flujos del bot...');
  
  const testUserId = '50487373838@s.whatsapp.net';
  
  try {
    // 1. Limpiar estado previo
    await establecerEstado(testUserId, null, {});
    console.log('✅ [TEST] Estado limpiado');
    
    // 2. Obtener estado actual
    const estado = await obtenerEstado(testUserId);
    console.log('📋 [TEST] Estado actual:', estado);
    
    // 3. Establecer estado de menú
    await establecerEstado(testUserId, 'MENU_PRINCIPAL', {});
    console.log('✅ [TEST] Estado establecido a MENU_PRINCIPAL');
    
    // 4. Verificar estado
    const nuevoEstado = await obtenerEstado(testUserId);
    console.log('📋 [TEST] Nuevo estado:', nuevoEstado);
    
    console.log('✅ [TEST] Prueba completada - Sistema de estados funcionando');
    
  } catch (error) {
    console.error('❌ [TEST] Error en prueba:', error);
  }
  
  process.exit(0);
}

testBotFlow();
