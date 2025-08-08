const Redis = require('ioredis');

async function checkDetailedQueue() {
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
    console.log('✅ Conectado a Redis');
    
    const waiting = await redis.llen('bull:whatsapp-messages:waiting');
    const active = await redis.llen('bull:whatsapp-messages:active');
    const failed = await redis.llen('bull:whatsapp-messages:failed');
    const completed = await redis.llen('bull:whatsapp-messages:completed');
    
    console.log('📊 Estado actual de la cola:');
    console.log(`   - Esperando: ${waiting}`);
    console.log(`   - Activos: ${active}`);
    console.log(`   - Fallidos: ${failed}`);
    console.log(`   - Completados: ${completed}`);
    
    // Ver trabajos esperando
    if (waiting > 0) {
      console.log('\n⏳ Trabajos esperando:');
      const waitingJobs = await redis.lrange('bull:whatsapp-messages:waiting', 0, 4);
      waitingJobs.forEach((job, i) => {
        try {
          const jobData = JSON.parse(job);
          console.log(`   ${i + 1}. ID: ${jobData.id} - Timestamp: ${new Date(jobData.timestamp).toLocaleTimeString()}`);
        } catch (e) {
          console.log(`   ${i + 1}. Error parsing job: ${job.substring(0, 50)}...`);
        }
      });
    }
    
    // Ver trabajos fallidos
    if (failed > 0) {
      console.log('\n❌ Trabajos fallidos:');
      const failedJobs = await redis.lrange('bull:whatsapp-messages:failed', 0, 2);
      failedJobs.forEach((job, i) => {
        console.log(`   ${i + 1}. ${job.substring(0, 150)}...`);
      });
    }
    
    await redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDetailedQueue();
