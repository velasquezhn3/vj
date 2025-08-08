const Redis = require('ioredis');

async function testQueue() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    lazyConnect: true
  });

  try {
    await redis.connect();
    console.log('✅ Redis conectado');
    
    // Ver estado actual de la cola
    const waiting = await redis.llen('bull:whatsapp-messages:waiting');
    const active = await redis.llen('bull:whatsapp-messages:active');
    const completed = await redis.llen('bull:whatsapp-messages:completed');
    const failed = await redis.llen('bull:whatsapp-messages:failed');
    
    console.log('📊 Estado de la cola WhatsApp:');
    console.log(`   - Esperando: ${waiting}`);
    console.log(`   - Activos: ${active}`);
    console.log(`   - Completados: ${completed}`);
    console.log(`   - Fallidos: ${failed}`);
    
    // Ver últimos trabajos fallidos si los hay
    if (failed > 0) {
      console.log('\n❌ Trabajos fallidos:');
      const failedJobs = await redis.lrange('bull:whatsapp-messages:failed', 0, 2);
      failedJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.substring(0, 200)}...`);
      });
    }
    
    // Ver claves relacionadas
    const keys = await redis.keys('bull:whatsapp-messages:*');
    console.log(`\n🔍 Total de claves: ${keys.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testQueue();
