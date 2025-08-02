// Establecer estado y confirmar reserva inmediatamente
const { establecerEstado, obtenerEstado } = require('../services/stateService');
const { buscarCabanaDisponible } = require('../services/cabinsService');
const { createReservationWithUser } = require('../services/reservaService');

async function solucionInmediata() {
    console.log('=== SOLUCIÓN INMEDIATA - CONFIRMAR RESERVA ===');
    
    const userId = '50487373838';
    const userJid = userId + '@s.whatsapp.net';
    
    // 1. Establecer estado con datos de la última reserva
    const datosReserva = {
        fechaEntrada: '15/12/2025',
        fechaSalida: '18/12/2025',
        noches: 3,
        nombre: 'carlos',
        telefono: '50487373838',
        personas: 9,
        alojamiento: 'tiburon',
        precioTotal: 10500
    };
    
    console.log('Estableciendo estado...');
    await establecerEstado(userJid, 'esperando_pago', datosReserva);
    
    // 2. Verificar estado
    console.log('Verificando estado...');
    const estado = obtenerEstado(userJid);
    console.log('Estado verificado:', estado);
    
    // 3. Procesar confirmación
    console.log('Procesando confirmación...');
    
    const tipoCabana = 'tiburon'; // directo
    const fechaInicio = '2025-12-15'; // directo
    const fechaFin = '2025-12-18'; // directo
    const personas = 9;
    
    console.log(`Buscando cabaña ${tipoCabana} para ${personas} personas del ${fechaInicio} al ${fechaFin}`);
    
    const cabina = await buscarCabanaDisponible(tipoCabana, fechaInicio, fechaFin, personas);
    
    if (!cabina) {
        console.log('❌ No se encontró cabaña disponible');
        return;
    }
    
    console.log(`✅ Cabaña encontrada: ${cabina.name} (ID: ${cabina.cabin_id})`);
    
    // 4. Crear reserva
    const reservaData = {
        start_date: fechaInicio,
        end_date: fechaFin,
        status: 'pendiente',
        total_price: 10500,
        personas: 9
    };
    
    console.log('Creando reserva...');
    const resultado = await createReservationWithUser(userId, reservaData, cabina.cabin_id);
    
    if (resultado.success) {
        console.log(`🎉 ¡RESERVA CREADA EXITOSAMENTE!`);
        console.log(`   - ID de reserva: ${resultado.reservationId}`);
        console.log(`   - Usuario: carlos (${userId})`);
        console.log(`   - Cabaña: ${cabina.name}`);
        console.log(`   - Fechas: ${fechaInicio} - ${fechaFin}`);
        console.log(`   - Personas: ${personas}`);
        console.log(`   - Precio: Lmps. 10,500`);
        console.log(`   - Estado: pendiente`);
        
        console.log('\n🔔 La reserva está lista y guardada en la base de datos.');
        console.log('🔔 El usuario puede proceder con el pago.');
    } else {
        console.log(`❌ Error: ${resultado.error}`);
    }
    
    console.log('\n=== PROCESO COMPLETADO ===');
    process.exit(0);
}

solucionInmediata();
