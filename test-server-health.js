/**
 * Test para verificar que el servidor responde
 */

const http = require('http');

function testServerHealth() {
  console.log('🩺 Probando salud del servidor...\n');

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`✅ Servidor responde en puerto 4000`);
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   Headers:`, res.headers);
      console.log(''); 
      
      // Ahora probar un endpoint sin autenticación si existe
      testPublicEndpoint();
    });
  });

  req.on('error', (error) => {
    console.log(`❌ Error conectando al servidor:`, error.message);
  });

  req.end();
}

function testPublicEndpoint() {
  console.log('🔍 Probando endpoint queue-status sin auth...\n');

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/bot/queue-status',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   Respuesta:`, data);
    });
  });

  req.on('error', (error) => {
    console.log(`   ❌ Error:`, error.message);
  });

  req.end();
}

testServerHealth();
