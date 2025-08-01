// Test para verificar el flujo completo de reservación
const { buscarCabanaDisponible } = require('../services/cabinsService');
const { createReservationWithUser } = require('../services/reservaService');
const { runQuery } = require('../db');

async function testFlow() {
    console.log('=== INICIANDO TEST DEL FLUJO DE RESERVA ===\n');
    
    try {
        // 1. Verificar cabañas en la base de datos
        console.log('1. Verificando cabañas en la base de datos...');
        const cabins = await runQuery('SELECT * FROM Cabins ORDER BY type, cabin_id');
        console.log(`Cabañas encontradas: ${cabins.length}`);
        cabins.forEach(cabin => {
            console.log(`   - ID: ${cabin.cabin_id}, Tipo: ${cabin.type}, Nombre: ${cabin.name}, Capacidad: ${cabin.capacity}`);
        });
        
        console.log('\n2. Probando búsqueda de cabaña disponible...');
        // 2. Probar búsqueda de cabaña
        const fechaInicio = '2024-12-25';
        const fechaFin = '2024-12-28';
        const personas = 4;
        const tipo = 'delfin';
        
        console.log(`   Buscando cabaña tipo ${tipo} para ${personas} personas del ${fechaInicio} al ${fechaFin}`);
        
        const cabanaDisponible = await buscarCabanaDisponible(tipo, fechaInicio, fechaFin, personas);
        
        if (cabanaDisponible) {
            console.log(`   ✅ Cabaña encontrada: ID ${cabanaDisponible.cabin_id}, Nombre: ${cabanaDisponible.name}`);
            
            console.log('\n3. Probando creación de reserva...');
            // 3. Probar creación de reserva
            const reservaData = {
                start_date: fechaInicio,
                end_date: fechaFin,
                status: 'pendiente',
                total_price: 1500,
                personas: personas
            };
            
            const testUserId = '50412345678';
            console.log(`   Creando reserva para usuario: ${testUserId}`);
            
            const resultado = await createReservationWithUser(testUserId, reservaData, cabanaDisponible.cabin_id);
            
            if (resultado.success) {
                console.log(`   ✅ Reserva creada exitosamente! ID: ${resultado.reservationId}`);
                
                // 4. Verificar la reserva creada
                console.log('\n4. Verificando reserva creada...');
                const reservaCreada = await runQuery('SELECT * FROM Reservations WHERE reservation_id = ?', [resultado.reservationId]);
                if (reservaCreada.length > 0) {
                    console.log('   ✅ Reserva verificada en la base de datos:');
                    console.log(`      - ID: ${reservaCreada[0].reservation_id}`);
                    console.log(`      - Usuario: ${reservaCreada[0].user_id}`);
                    console.log(`      - Cabaña: ${reservaCreada[0].cabin_id}`);
                    console.log(`      - Fechas: ${reservaCreada[0].start_date} - ${reservaCreada[0].end_date}`);
                    console.log(`      - Personas: ${reservaCreada[0].personas}`);
                    console.log(`      - Precio: $${reservaCreada[0].total_price}`);
                    console.log(`      - Estado: ${reservaCreada[0].status}`);
                }
            } else {
                console.log(`   ❌ Error creando reserva: ${resultado.error}`);
            }
        } else {
            console.log('   ❌ No se encontró cabaña disponible');
        }
        
        console.log('\n=== TEST COMPLETADO ===');
        
    } catch (error) {
        console.error('Error en el test:', error);
    }
    
    process.exit(0);
}

testFlow();
