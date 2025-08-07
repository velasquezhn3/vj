const { generateDynamicMenu } = require('./controllers/mainMenuHandler');
const { sendActividadDetails } = require('./controllers/actividadesController');

// Mock de funciones del bot para pruebas
const mockBot = {
    sendMessage: async (remitente, mensaje) => {
        console.log(`📱 Mensaje a ${remitente}:`);
        if (mensaje.text) {
            console.log(`💬 Texto: ${mensaje.text}`);
        }
        if (mensaje.image) {
            console.log(`🖼️ Imagen: ${mensaje.image.url}`);
            if (mensaje.caption) {
                console.log(`📝 Caption: ${mensaje.caption}`);
            }
        }
        console.log('---');
    }
};

const mockEstablecerEstado = async (remitente, estado) => {
    console.log(`🔄 Estado establecido para ${remitente}: ${estado}`);
};

async function testCompleteActivitiesFlow() {
    console.log('🧪 Probando flujo completo de actividades...\n');
    
    try {
        // 1. Probar menú de actividades
        console.log('1️⃣ Generando menú de actividades:');
        const menuActividades = await generateDynamicMenu('actividades');
        console.log(menuActividades);
        console.log('\n');
        
        // 2. Probar selección de actividad
        console.log('2️⃣ Probando selección de actividad (opción 1):');
        await sendActividadDetails(mockBot, '50488888888@s.whatsapp.net', 1, mockEstablecerEstado);
        console.log('\n');
        
        // 3. Probar selección de actividad 2
        console.log('3️⃣ Probando selección de actividad (opción 2):');
        await sendActividadDetails(mockBot, '50488888888@s.whatsapp.net', 2, mockEstablecerEstado);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testCompleteActivitiesFlow();
