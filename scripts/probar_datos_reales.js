// Probar /confirmar con los datos exactos del log
const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');

// Mock del bot para simular envío de mensajes
global.safeSend = async (bot, jid, mensaje) => {
    console.log(`[SAFE SEND] Enviando a ${jid}:`);
    if (typeof mensaje === 'object') {
        console.log(mensaje.text || mensaje);
    } else {
        console.log(mensaje);
    }
    console.log('---');
    return { success: true };
};

const mockBot = {};

async function probarConDatosReales() {
    console.log('🧪 PROBANDO CON DATOS EXACTOS DEL LOG');
    console.log('======================================\n');
    
    const userId = '50487373838';
    const userJid = userId + '@s.whatsapp.net';
    
    // Establecer el estado exacto del log
    const datosDelLog = {
        fechaEntrada: '15/11/2025',
        fechaSalida: '20/11/2025',
        noches: 5,
        nombre: 'carlos velasquez',
        telefono: '50487373838',
        personas: 3,
        alojamiento: 'tortuga',
        precioTotal: 7500
    };
    
    console.log('📋 Estableciendo estado con datos del log...');
    await establecerEstado(userJid, 'esperando_pago', datosDelLog);
    
    // Probar comando
    const remitente = '120363401911054356@g.us';
    const param = '50487373838';
    const mensajeObj = {
        key: { fromMe: false },
        message: { conversation: '/confirmar 50487373838' }
    };
    
    try {
        console.log('🔄 Ejecutando /confirmar...');
        await handleConfirmarCommand(mockBot, remitente, param, mensajeObj);
        console.log('✅ ¡Comando ejecutado exitosamente!');
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log('Stack:', error.stack);
    }
    
    console.log('\n🎯 PRUEBA COMPLETADA');
    process.exit(0);
}

probarConDatosReales();
