/**
 * Script para probar el estado del sistema de colas
 */

const { getQueueManager } = require('./services/whatsappQueueService');

async function testQueueStatus() {
  try {
    console.log('🔍 Probando estado del sistema de colas...\n');
    
    // Obtener instancia del queue manager
    const queueManager = getQueueManager();
    
    if (!queueManager) {
      console.log('❌ QueueManager no disponible');
      return;
    }
    
    console.log('✅ QueueManager obtenido');
    console.log('📊 Estado de inicialización:', queueManager.isInitialized);
    
    if (queueManager.redis) {
      console.log('📊 Estado de Redis:', queueManager.redis.status);
    } else {
      console.log('❌ Redis no conectado');
    }
    
    // Obtener estadísticas de la cola
    try {
      const stats = await queueManager.getQueueStats();
      console.log('\n📈 Estadísticas de Cola:');
      console.log('- Disponible:', stats.available);
      console.log('- En espera:', stats.waiting || 0);
      console.log('- Activos:', stats.active || 0);
      console.log('- Completados:', stats.completed || 0);
      console.log('- Fallidos:', stats.failed || 0);
      console.log('- Retrasados:', stats.delayed || 0);
      console.log('- Total:', stats.total || 0);
    } catch (statsError) {
      console.error('❌ Error obteniendo estadísticas:', statsError.message);
    }
    
    // Probar Redis directamente
    try {
      if (queueManager.redis) {
        const pong = await queueManager.redis.ping();
        console.log('\n🏓 Ping a Redis:', pong);
      }
    } catch (redisError) {
      console.error('❌ Error ping Redis:', redisError.message);
    }
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    process.exit(0);
  }
}

testQueueStatus();
