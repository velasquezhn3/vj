// Debugging específico para el error "No se encontró la cabaña seleccionada"
const { handleConfirmarCommand } = require('../controllers/flows/reservationHandlers');
const { establecerEstado } = require('../services/stateService');
const { buscarCabanaDisponible } = require('../services/cabinsService');

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

async function debugError() {
    console.log('🐛 DEBUGGING ERROR ESPECÍFICO');
    console.log('=============================\n');
    
    const userId = '50487373838';
    const userJid = userId + '@s.whatsapp.net';
    
    // Los datos exactos que aparecen en el log
    const datosOriginales = {
        fechaEntrada: '15/11/2025',
        fechaSalida: '20/11/2025',
        noches: 5,
        nombre: 'carlos velasquez',
        telefono: '50487373838',
        personas: 3,
        alojamiento: 'tortuga',
        precioTotal: 7500
    };
    
    console.log('📋 Datos originales:', datosOriginales);
    
    // Primero, probar buscarCabanaDisponible directamente
    console.log('\n🔍 PASO 1: Probando buscarCabanaDisponible directamente...');
    
    // Convertir fechas como lo hace el código
    function convertirFecha(fecha) {
        if (!fecha) return new Date().toISOString().split('T')[0];
        if (fecha.includes('/')) {
            const [d, m, y] = fecha.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return fecha;
    }
    
    const fechaEntradaISO = convertirFecha(datosOriginales.fechaEntrada);
    const fechaSalidaISO = convertirFecha(datosOriginales.fechaSalida);
    
    console.log('📅 Fechas convertidas:', {
        original: { entrada: datosOriginales.fechaEntrada, salida: datosOriginales.fechaSalida },
        convertidas: { entrada: fechaEntradaISO, salida: fechaSalidaISO }
    });
    
    try {
        const cabina = await buscarCabanaDisponible(
            'tortuga', 
            fechaEntradaISO, 
            fechaSalidaISO, 
            3
        );
        
        console.log('🏠 Resultado de buscarCabanaDisponible:', cabina);
        
        if (cabina) {
            console.log('✅ Cabaña encontrada directamente');
        } else {
            console.log('❌ NO se encontró cabaña directamente');
        }
    } catch (error) {
        console.log('❌ Error en buscarCabanaDisponible:', error.message);
    }
    
    // Ahora probar el comando completo
    console.log('\n🔍 PASO 2: Probando comando completo...');
    
    await establecerEstado(userJid, 'esperando_pago', datosOriginales);
    
    const remitente = '120363401911054356@g.us';
    const param = '50487373838';
    const mensajeObj = {
        key: { fromMe: false },
        message: { conversation: '/confirmar 50487373838' }
    };
    
    try {
        await handleConfirmarCommand(mockBot, remitente, param, mensajeObj);
        console.log('✅ Comando ejecutado exitosamente');
    } catch (error) {
        console.log(`❌ Error en comando: ${error.message}`);
        console.log('Stack:', error.stack);
    }
    
    console.log('\n🎯 DEBUG COMPLETADO');
    process.exit(0);
}

debugError();
