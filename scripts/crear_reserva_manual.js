// Script para crear una reserva manual de emergencia
const { createReservationWithUser } = require('../services/reservaService');
const { runQuery } = require('../db');

async function crearReservaManual() {
    console.log('=== CREANDO RESERVA MANUAL DE EMERGENCIA ===\n');
    
    const userId = '50487373838';
    const userName = 'carlos velasquez';
    const fechaEntrada = '2025-08-10';
    const fechaSalida = '2025-08-13';
    const personas = 9;
    const cabinId = 48; // Cabaña Tiburón 3
    const precioTotal = 12000;
    
    console.log('Datos de la reserva:');
    console.log(`- Usuario: ${userName} (${userId})`);
    console.log(`- Fechas: ${fechaEntrada} - ${fechaSalida}`);
    console.log(`- Personas: ${personas}`);
    console.log(`- Cabaña ID: ${cabinId}`);
    console.log(`- Precio: Lmps. ${precioTotal}`);
    
    const reservaData = {
        start_date: fechaEntrada,
        end_date: fechaSalida,
        status: 'pendiente',
        total_price: precioTotal,
        personas: personas
    };
    
    try {
        console.log('\nCreando reserva...');
        const resultado = await createReservationWithUser(userId, reservaData, cabinId);
        
        if (resultado.success) {
            console.log(`✅ RESERVA CREADA EXITOSAMENTE!`);
            console.log(`   ID de reserva: ${resultado.reservationId}`);
            
            // Verificar la reserva
            const reserva = await runQuery('SELECT * FROM Reservations WHERE reservation_id = ?', [resultado.reservationId]);
            if (reserva.length > 0) {
                console.log('\n📋 DETALLES DE LA RESERVA:');
                console.log(`   - ID: ${reserva[0].reservation_id}`);
                console.log(`   - Usuario ID: ${reserva[0].user_id}`);
                console.log(`   - Cabaña ID: ${reserva[0].cabin_id}`);
                console.log(`   - Fechas: ${reserva[0].start_date} - ${reserva[0].end_date}`);
                console.log(`   - Personas: ${reserva[0].personas}`);
                console.log(`   - Precio: Lmps. ${reserva[0].total_price}`);
                console.log(`   - Estado: ${reserva[0].status}`);
            }
            
            // Obtener info de la cabaña
            const cabin = await runQuery('SELECT * FROM Cabins WHERE cabin_id = ?', [cabinId]);
            if (cabin.length > 0) {
                console.log(`\n🏠 CABAÑA ASIGNADA: ${cabin[0].name} (${cabin[0].type})`);
            }
            
        } else {
            console.log(`❌ ERROR: ${resultado.error}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    console.log('\n=== PROCESO COMPLETADO ===');
    process.exit(0);
}

crearReservaManual();
