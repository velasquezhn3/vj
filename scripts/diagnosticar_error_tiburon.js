// Script para diagnosticar el error exacto con datos de 9 personas tiburon
const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');

// Mock del bot
global.safeSend = async (bot, jid, mensaje) => {
    console.log(`[SAFE SEND] ${typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje, null, 2)}`);
    return { success: true };
};

const mockBot = {};

async function diagnosticarErrorTiburon() {
    console.log('🦈 DIAGNOSTICANDO ERROR CON TIBURÓN');
    console.log('===================================\n');
    
    const userId = '50487373838';
    const userJid = userId + '@s.whatsapp.net';
    
    // Datos exactos del error reportado
    const datosErrorTiburon = {
        fechaEntrada: '14/10/2025',
        fechaSalida: '17/10/2025',
        noches: 3,
        nombre: 'carlos velasquez',
        telefono: '50487373838',
        personas: 9,
        alojamiento: 'tiburon',
        precioTotal: 10500
    };
    
    console.log('📋 Datos del error:', datosErrorTiburon);
    
    // Primero verificar si hay cabañas tiburón disponibles
    const { buscarCabanaDisponible } = require('../services/cabinsService');
    
    try {
        console.log('\n🔍 Probando buscarCabanaDisponible directamente...');
        const cabina = await buscarCabanaDisponible('tiburon', '2025-10-14', '2025-10-17', 9);
        console.log('🏠 Resultado directo:', cabina);
        
        if (!cabina) {
            console.log('❌ NO HAY CABAÑAS TIBURÓN DISPONIBLES para 9 personas');
            
            // Verificar capacidad de cabañas tiburón
            const { runQuery } = require('../db');
            const cabinasQuery = await runQuery('SELECT * FROM Cabins WHERE type = ?', ['tiburon']);
            console.log('\n📊 Cabañas tiburón en BD:', cabinasQuery);
            
            const maxCapacidad = Math.max(...cabinasQuery.map(c => c.capacity));
            console.log(`\n⚠️ PROBLEMA ENCONTRADO: Máxima capacidad tiburón: ${maxCapacidad}, solicitada: 9`);
            
            if (maxCapacidad < 9) {
                console.log('🚨 ESTE ES EL PROBLEMA: Las cabañas tiburón no tienen capacidad para 9 personas');
            }
        }
    } catch (error) {
        console.log('❌ Error en búsqueda directa:', error.message);
    }
    
    // Ahora probar el comando completo
    console.log('\n🔄 Probando comando completo...');
    
    await establecerEstado(userJid, 'esperando_pago', datosErrorTiburon);
    
    const remitente = '120363401911054356@g.us';
    const param = '50487373838';
    const mensajeObj = {
        key: { fromMe: false },
        message: { conversation: '/confirmar 50487373838' }
    };
    
    try {
        await handleConfirmarCommand(mockBot, remitente, param, mensajeObj);
        console.log('✅ Comando ejecutado sin errores');
    } catch (error) {
        console.log(`❌ Error en comando: ${error.message}`);
    }
    
    console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
    process.exit(0);
}

diagnosticarErrorTiburon();
