const axios = require('axios');

async function testActivitiesEndpoint() {
    console.log('🧪 Testing Activities API endpoint...');
    
    try {
        // Primero obtener un token JWT válido (simulando login)
        console.log('🔐 Intentando login...');
        const loginResponse = await axios.post('http://localhost:4000/admin/auth/login', {
            username: 'admin', 
            password: 'VJ2024!' // Contraseña del sistema
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Token JWT obtenido');
        
        // Probar el endpoint de actividades
        const response = await axios.get('http://localhost:4000/admin/activities', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('\n📊 Respuesta del API:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        
        if (response.data && response.data.length > 0) {
            console.log(`\n✅ Encontradas ${response.data.length} actividades`);
            response.data.forEach((activity, index) => {
                console.log(`${index + 1}. ${activity.nombre} (ID: ${activity.activity_id}, Activo: ${activity.activo})`);
            });
        } else {
            console.log('\n⚠️ No se encontraron actividades');
        }
        
    } catch (error) {
        console.error('❌ Error testing endpoint:', error.response?.data || error.message);
    }
}

testActivitiesEndpoint();
