const { sendActividadDetails } = require('./controllers/actividadesController');

// Mock del bot para pruebas
const mockBot = {
    sendMessage: async (remitente, mensaje) => {
        console.log(`📱 Mensaje a ${remitente}:`);
        if (mensaje.image) {
            console.log(`🖼️ Imagen: ${mensaje.image.url}`);
        }
        if (mensaje.caption) {
            console.log(`📝 Caption: ${mensaje.caption}`);
        }
        if (mensaje.text) {
            console.log(`💬 Texto: ${mensaje.text}`);
        }
        console.log('---');
    }
};

async function testActivityDetails() {
    console.log('🧪 Probando detalles de actividad...');
    
    try {
        // Probar la primera actividad
        await sendActividadDetails(mockBot, '50488888888@s.whatsapp.net', 1);
        
        // Probar la segunda actividad
        await sendActividadDetails(mockBot, '50488888888@s.whatsapp.net', 2);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testActivityDetails();
