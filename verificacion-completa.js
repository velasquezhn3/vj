/**
 * 🎯 VERIFICACIÓN COMPLETA DEL SISTEMA
 * Script para verificar que todos los componentes estén funcionando
 */

const { getQueueManager } = require('./services/whatsappQueueService');
const Redis = require('ioredis');

async function verificacionCompleta() {
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA BOT VILLAS JULIE');
  console.log('═'.repeat(60));
  console.log();

  const resultados = {
    redis: '❌',
    queueManager: '❌',
    adminServer: '❌',
    bot: '❌',
    frontend: '❌'
  };

  // 1. VERIFICAR REDIS
  console.log('1️⃣ VERIFICANDO REDIS...');
  try {
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true
    });
    
    await redis.connect();
    const pong = await redis.ping();
    
    if (pong === 'PONG') {
      console.log('   ✅ Redis conectado y funcionando');
      resultados.redis = '✅';
    } else {
      console.log('   ❌ Redis no responde correctamente');
    }
    
    await redis.quit();
  } catch (redisError) {
    console.log('   ❌ Error conectando a Redis:', redisError.message);
  }

  // 2. VERIFICAR QUEUE MANAGER
  console.log('\n2️⃣ VERIFICANDO SISTEMA DE COLAS...');
  try {
    const queueManager = getQueueManager();
    
    // Esperar inicialización
    let attempts = 0;
    while (!queueManager.isInitialized && attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (queueManager.isInitialized) {
      console.log('   ✅ Sistema de colas inicializado');
      
      try {
        const stats = await queueManager.getQueueStats();
        console.log('   📊 Estadísticas de cola:');
        console.log(`      - Total trabajos: ${stats.total || 0}`);
        console.log(`      - En espera: ${stats.waiting || 0}`);
        console.log(`      - Activos: ${stats.active || 0}`);
        console.log(`      - Completados: ${stats.completed || 0}`);
        
        resultados.queueManager = '✅';
      } catch (statsError) {
        console.log('   ⚠️ Cola inicializada pero error obteniendo stats');
        resultados.queueManager = '⚠️';
      }
    } else {
      console.log('   ❌ Sistema de colas no inicializado');
    }
  } catch (queueError) {
    console.log('   ❌ Error verificando colas:', queueError.message);
  }

  // 3. VERIFICAR ADMIN SERVER
  console.log('\n3️⃣ VERIFICANDO ADMIN SERVER...');
  try {
    const http = require('http');
    
    const testServer = () => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 4000,
          path: '/health',
          method: 'GET',
          timeout: 5000
        }, (res) => {
          resolve(res.statusCode === 200);
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Timeout')));
        req.end();
      });
    };
    
    const serverOK = await testServer();
    if (serverOK) {
      console.log('   ✅ AdminServer respondiendo en puerto 4000');
      resultados.adminServer = '✅';
    } else {
      console.log('   ❌ AdminServer no responde correctamente');
    }
  } catch (serverError) {
    console.log('   ❌ AdminServer no disponible:', serverError.message);
  }

  // 4. VERIFICAR PROCESOS
  console.log('\n4️⃣ VERIFICANDO PROCESOS...');
  const { exec } = require('child_process');
  
  try {
    await new Promise((resolve, reject) => {
      exec('netstat -an | findstr ":4000.*LISTENING"', (error, stdout) => {
        if (stdout && stdout.trim()) {
          console.log('   ✅ Puerto 4000 en escucha (AdminServer)');
        } else {
          console.log('   ⚠️ Puerto 4000 no detectado');
        }
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      exec('netstat -an | findstr ":6379.*LISTENING"', (error, stdout) => {
        if (stdout && stdout.trim()) {
          console.log('   ✅ Puerto 6379 en escucha (Redis)');
        } else {
          console.log('   ❌ Puerto 6379 no detectado');
        }
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      exec('netstat -an | findstr ":3001.*LISTENING"', (error, stdout) => {
        if (stdout && stdout.trim()) {
          console.log('   ✅ Puerto 3001 en escucha (Frontend)');
          resultados.frontend = '✅';
        } else {
          console.log('   ❌ Puerto 3001 no detectado');
        }
        resolve();
      });
    });
  } catch (processError) {
    console.log('   ❌ Error verificando procesos');
  }

  // 5. RESUMEN FINAL
  console.log('\n🎯 RESUMEN FINAL');
  console.log('═'.repeat(40));
  console.log(`Redis:           ${resultados.redis}`);
  console.log(`Sistema Colas:   ${resultados.queueManager}`);
  console.log(`AdminServer:     ${resultados.adminServer}`);
  console.log(`Frontend:        ${resultados.frontend}`);
  
  const totalOK = Object.values(resultados).filter(v => v === '✅').length;
  const totalWarning = Object.values(resultados).filter(v => v === '⚠️').length;
  
  console.log('\n📊 ESTADO GENERAL:');
  if (totalOK === 4) {
    console.log('🎉 SISTEMA COMPLETAMENTE FUNCIONAL');
    console.log('✅ Todos los componentes están operativos');
    console.log('🔗 Dashboard disponible: http://localhost:3001');
  } else if (totalOK >= 2) {
    console.log('⚠️ SISTEMA PARCIALMENTE FUNCIONAL');
    console.log(`✅ ${totalOK}/4 componentes operativos`);
    if (totalWarning > 0) {
      console.log(`⚠️ ${totalWarning} componentes con advertencias`);
    }
  } else {
    console.log('❌ SISTEMA CON PROBLEMAS CRÍTICOS');
    console.log('🔧 Se requiere intervención manual');
  }

  console.log('\n🚀 PRÓXIMOS PASOS:');
  console.log('1. Abrir dashboard: http://localhost:3001');
  console.log('2. Verificar estadísticas de cola en tiempo real');
  console.log('3. Enviar mensaje de WhatsApp de prueba');
  console.log('4. Monitorear logs para confirmar procesamiento');
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

verificacionCompleta().catch(console.error);
