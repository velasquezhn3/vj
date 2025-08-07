// Prueba simple sin autenticación
const http = require('http');

function testSimple() {
  console.log('🔍 Probando conexión simple al servidor...');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('✅ Servidor está funcionando:', data);
      
      // Ahora probar actividades sin token
      testActivitiesWithoutAuth();
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error:', e.message);
  });

  req.end();
}

function testActivitiesWithoutAuth() {
  console.log('\n🧪 Probando /admin/activities sin autenticación...');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/admin/activities',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('📦 Respuesta:', data);
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error:', e.message);
  });

  req.end();
}

setTimeout(testSimple, 2000);
