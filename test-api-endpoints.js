/**
 * Test directo de los endpoints de la API Queue
 */

const http = require('http');

async function testQueueEndpoints() {
  console.log('🧪 Probando endpoints de Queue API...\n');

  // Token de ejemplo (en producción sería un JWT válido)
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3MjMwNjk2MDEsImV4cCI6MTcyMzE1NjAwMX0.sometoken';
  
  const endpoints = [
    { name: 'Queue Status', path: '/api/bot/queue-status' },
    { name: 'Queue Stats', path: '/api/bot/queue-stats' },
    { name: 'Queue Config', path: '/api/bot/queue-config' },
    { name: 'Queue Jobs', path: '/api/bot/queue-jobs' }
  ];

  for (const endpoint of endpoints) {
    await new Promise((resolve) => {
      console.log(`📡 Probando: ${endpoint.name}`);
      console.log(`   URL: http://localhost:4000${endpoint.path}`);
      
      const options = {
        hostname: 'localhost',
        port: 4000,
        path: endpoint.path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData = JSON.parse(data);
              console.log(`   ✅ Respuesta:`, JSON.stringify(jsonData, null, 2));
            } catch (e) {
              console.log(`   ✅ Respuesta (texto):`, data);
            }
          } else {
            console.log(`   ❌ Error:`, data);
          }
          
          console.log(''); // Línea en blanco
          resolve();
        });
      });

      req.on('error', (error) => {
        console.log(`   ❌ Excepción:`, error.message);
        console.log(''); // Línea en blanco
        resolve();
      });

      req.end();
    });
  }
}

testQueueEndpoints().catch(console.error);
