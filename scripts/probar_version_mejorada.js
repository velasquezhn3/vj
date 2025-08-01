// Probar la versión mejorada con FAILSAFE
const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');

// Mock del bot para simular envío de mensajes
global.safeSend = async (bot, jid, mensaje) => {
    console.log(`[SAFE SEND] ${typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje, null, 2)}`);
    return { success: true };
};

const mockBot = {};

async function probarVersionMejorada() {
    console.log('🛡️ PROBANDO VERSIÓN CON FAILSAFE');
    console.log('=================================\n');
    
    const userId = '50487373838';
    const userJid = userId + '@s.whatsapp.net';
    
    // Datos que causan el problema original
    const datosProblematicos = {
        fechaEntrada: '15/11/2025',
        fechaSalida: '20/11/2025',
        noches: 5,
        nombre: 'carlos velasquez',
        telefono: '50487373838',
        personas: 3,
        alojamiento: 'tortuga',
        precioTotal: 7500
    };
    
    console.log('📋 Estableciendo estado con datos problemáticos...');
    await establecerEstado(userJid, 'esperando_pago', datosProblematicos);
    
    const remitente = '120363401911054356@g.us';
    const param = '50487373838';
    const mensajeObj = {
        key: { fromMe: false },
        message: { conversation: '/confirmar 50487373838' }
    };
    
    try {
        console.log('🔄 Ejecutando comando mejorado...');
        await handleConfirmarCommand(mockBot, remitente, param, mensajeObj);
        console.log('✅ ¡Comando ejecutado exitosamente sin errores!');
    } catch (error) {
        console.log(`❌ Error inesperado: ${error.message}`);
    }
    
    console.log('\n🎯 PRUEBA COMPLETADA');
    process.exit(0);
}

probarVersionMejorada();
