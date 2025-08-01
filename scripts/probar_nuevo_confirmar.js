// Probar el nuevo comando /confirmar mejorado
const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');

// Mock del bot para simular envío de mensajes
const mockBot = {
    sendMessage: async (jid, mensaje) => {
        console.log(`[MOCK BOT] Enviando a ${jid}:`);
        console.log(mensaje);
        console.log('---');
        return { success: true };
    }
};

// Mock de safeSend
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

async function probarNuevoConfirmar() {
    console.log('🧪 PROBANDO NUEVO COMANDO /CONFIRMAR');
    console.log('=====================================\n');
    
    // Caso 1: Usuario sin estado (debería usar reserva directa)
    console.log('📌 CASO 1: Usuario sin estado - Reserva directa');
    const remitente = '120363177663828250@g.us'; // grupo
    const param = '50487373838'; // userId
    const mensajeObj = {
        key: { fromMe: false },
        message: { conversation: '/confirmar 50487373838' }
    };
    
    try {
        await handleConfirmarCommand(mockBot, remitente, param, mensajeObj);
        console.log('✅ Comando ejecutado exitosamente\n');
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
    
    // Caso 2: Simular estado válido
    console.log('📌 CASO 2: Con estado válido');
    const { establecerEstado } = require('../services/stateService');
    const userJid = param + '@s.whatsapp.net';
    
    await establecerEstado(userJid, 'esperando_pago', {
        fechaEntrada: '15/12/2025',
        fechaSalida: '18/12/2025',
        noches: 3,
        nombre: 'carlos',
        telefono: '50487373838',
        personas: 9,
        alojamiento: 'tiburon',
        precioTotal: 10500
    });
    
    try {
        await handleConfirmarCommand(mockBot, remitente, param, mensajeObj);
        console.log('✅ Comando con estado ejecutado exitosamente\n');
    } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
    }
    
    console.log('🎯 PRUEBAS COMPLETADAS');
    process.exit(0);
}

probarNuevoConfirmar();
