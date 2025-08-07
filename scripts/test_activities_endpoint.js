const http = require('http');

// Token de prueba (reemplazar con uno real para probar)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzM1NTk4NDR9.8n4K3zE7wU1nJ2mK4oP6qR9sT0vX5cY6hA8fDgE9iW0';

function testActivitiesEndpoint() {
  console.log('🧪 Probando endpoint /admin/activities...');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/admin/activities',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('📦 Respuesta:');
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (jsonData.success && jsonData.data) {
          console.log(`✅ ¡Funciona! Se encontraron ${jsonData.data.length} actividades`);
          jsonData.data.forEach((activity, index) => {
            console.log(`  ${index + 1}. ${activity.nombre} (${activity.categoria})`);
          });
        } else {
          console.log('⚠️ Respuesta no esperada:', jsonData);
        }
      } catch (e) {
        console.log('❌ Error parseando JSON:', e);
        console.log('📄 Respuesta cruda:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error en la petición:', e.message);
  });

  req.end();
}

// Esperar un poco para que los servidores se inicialicen
setTimeout(() => {
  testActivitiesEndpoint();
}, 3000);
