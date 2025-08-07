const http = require('http');

// Primero hacer login para obtener un token válido
function doLogin() {
  console.log('🔐 Haciendo login...');
  
  const postData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Login Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('📦 Login Response:', data);
      
      if (res.statusCode === 200) {
        try {
          const loginResponse = JSON.parse(data);
          if (loginResponse.success && loginResponse.token) {
            console.log('✅ Login exitoso!');
            // Probar actividades con el token
            testActivitiesWithToken(loginResponse.token);
          } else {
            console.log('❌ Login falló:', loginResponse.message);
          }
        } catch (e) {
          console.log('⚠️ Error parseando login response:', e.message);
        }
      } else {
        console.log('❌ Error en login');
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error en login:', e.message);
  });

  req.write(postData);
  req.end();
}

function testActivitiesWithToken(token) {
  console.log('\n🧪 Probando /admin/activities con token...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/admin/activities',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
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
            console.log(`✅ ¡Perfecto! Se encontraron ${jsonData.data.length} actividades:`);
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

setTimeout(doLogin, 2000);
