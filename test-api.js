/**
 * Script para probar la API del adminServer
 */

const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testAdminServerAPI() {
  try {
    console.log('🔍 Probando API del AdminServer...\n');
    
    // Probar health endpoint
    console.log('📡 Probando /health...');
    try {
      const healthResponse = await makeRequest('/health');
      console.log('Status:', healthResponse.statusCode);
      console.log('Response:', healthResponse.body);
    } catch (healthError) {
      console.log('❌ Error en /health:', healthError.message);
    }
    
    console.log('\n📡 Probando /api/bot/queue-stats (requiere auth)...');
    try {
      const queueResponse = await makeRequest('/api/bot/queue-stats');
      console.log('Status:', queueResponse.statusCode);
      console.log('Response:', queueResponse.body);
    } catch (queueError) {
      console.log('❌ Error en queue-stats:', queueError.message);
    }
    
    console.log('\n✅ Pruebas de API completadas');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

testAdminServerAPI();
