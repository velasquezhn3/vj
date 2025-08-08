const Redis = require('ioredis');

console.log('🔍 DIAGNÓSTICO DIRECTO DE REDIS');

async function testRedis() {
  try {
    console.log('1. Creando conexión Redis...');
    
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      connectTimeout: 5000,
      lazyConnect: true
    });

    console.log('2. Conectando...');
    
    redis.on('connect', () => {
      console.log('✅ Evento: Redis conectado');
    });

    redis.on('ready', () => {
      console.log('✅ Evento: Redis listo');
    });

    redis.on('error', (error) => {
      console.log('❌ Evento: Error Redis:', error.message);
    });

    await redis.connect();

    console.log('3. Probando comando PING...');
    const pong = await redis.ping();
    console.log('✅ PING respuesta:', pong);

    console.log('4. Probando SET/GET...');
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('✅ SET/GET funciona:', value);

    await redis.disconnect();
    console.log('✅ Desconectado exitosamente');

    console.log('🎉 REDIS FUNCIONA PERFECTAMENTE!');
    console.log('💡 El problema debe estar en el servicio de colas específico');

  } catch (error) {
    console.log('❌ Error conectando a Redis:', error.message);
    console.log('🔍 Posibles causas:');
    console.log('- Redis no está ejecutándose');
    console.log('- Puerto 6379 bloqueado');
    console.log('- Problemas de permisos');
  }
}

testRedis();
