const http = require('http');

function testNativeServer() {
  console.log('🧪 Probando servidor nativo en puerto 3000...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/admin/activities',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('📦 Respuesta:', data);
      
      if (res.statusCode === 200) {
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.success && jsonData.data) {
            console.log(`✅ ¡Funciona! Se encontraron ${jsonData.data.length} actividades:`);
            jsonData.data.forEach((activity, index) => {
              console.log(`  ${index + 1}. ${activity.nombre} (${activity.categoria})`);
            });
          }
        } catch (e) {
          console.log('⚠️ Error parseando respuesta:', e.message);
        }
      } else {
        console.log('❌ Error en el servidor');
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error en la petición:', e.message);
  });

  req.end();
}

setTimeout(testNativeServer, 2000);
