// Probar la nueva función robusta
const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');

// Mock del bot
global.safeSend = async (bot, jid, mensaje) => {
    console.log(`[MENSAJE] ${typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje, null, 2)}`);
    return { success: true };
};

const mockBot = {};

async function probarFuncionRobusta() {
    console.log('🛡️ PROBANDO FUNCIÓN ROBUSTA');
    console.log('============================\n');
    
    const userId = '50487373838';
    const userJid = userId + '@s.whatsapp.net';
    
    // Caso 1: Con datos problemáticos (tiburón 9 personas)
    const datosProblematicos = {
        fechaEntrada: '14/10/2025',
        fechaSalida: '17/10/2025',
        noches: 3,
        nombre: 'carlos velasquez',
        telefono: '50487373838',
        personas: 9,
        alojamiento: 'tiburon',
        precioTotal: 10500
    };
    
    console.log('📋 Caso 1: Datos problemáticos');
    await establecerEstado(userJid, 'esperando_pago', datosProblematicos);
    
    try {
        await handleConfirmarCommand(mockBot, '120363401911054356@g.us', '50487373838', {});
        console.log('✅ Caso 1: Exitoso\n');
    } catch (error) {
        console.log(`❌ Caso 1: Error: ${error.message}\n`);
    }
    
    // Caso 2: Sin estado (debe usar failsafe)
    console.log('📋 Caso 2: Sin estado (failsafe)');
    try {
        await handleConfirmarCommand(mockBot, '120363401911054356@g.us', '50487373999', {});
        console.log('✅ Caso 2: Exitoso\n');
    } catch (error) {
        console.log(`❌ Caso 2: Error: ${error.message}\n`);
    }
    
    console.log('🎯 PRUEBAS COMPLETADAS');
    process.exit(0);
}

probarFuncionRobusta();
