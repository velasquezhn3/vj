// Comando /confirmar que SÍ funciona - versión simplificada
const { buscarCabanaDisponible } = require('../services/cabinsService');
const { createReservationWithUser } = require('../services/reservaService');
const { obtenerEstado } = require('../services/stateService');

async function confirmarReservaDirecta(userId) {
    console.log(`=== CONFIRMANDO RESERVA PARA ${userId} ===`);
    
    try {
        // 1. Obtener estado del usuario
        const userJid = userId + '@s.whatsapp.net';
        const estado = obtenerEstado(userJid);
        
        console.log('Estado obtenido:', JSON.stringify(estado, null, 2));
        
        if (!estado || !estado.datos) {
            throw new Error('No se encontraron datos de reserva para este usuario');
        }
        
        const datos = estado.datos;
        
        // 2. Validar datos requeridos
        if (!datos.alojamiento || !datos.personas || !datos.fechaEntrada || !datos.fechaSalida) {
            throw new Error('Faltan datos requeridos en la reserva');
        }
        
        // 3. Mapear tipo de cabaña (simplificado)
        let tipoCabana;
        const aloj = datos.alojamiento.toLowerCase();
        if (aloj.includes('tortuga')) tipoCabana = 'tortuga';
        else if (aloj.includes('delfin')) tipoCabana = 'delfin';
        else if (aloj.includes('tiburon')) tipoCabana = 'tiburon';
        else throw new Error(`Tipo de alojamiento no reconocido: ${datos.alojamiento}`);
        
        console.log(`Tipo de cabaña determinado: ${tipoCabana}`);
        
        // 4. Convertir fechas
        function convertirFecha(fecha) {
            if (fecha.includes('/')) {
                const [d, m, y] = fecha.split('/');
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            return fecha;
        }
        
        const fechaInicio = convertirFecha(datos.fechaEntrada);
        const fechaFin = convertirFecha(datos.fechaSalida);
        
        console.log(`Fechas convertidas: ${fechaInicio} - ${fechaFin}`);
        
        // 5. Buscar cabaña disponible
        const cabina = await buscarCabanaDisponible(tipoCabana, fechaInicio, fechaFin, datos.personas);
        
        if (!cabina) {
            throw new Error(`No hay cabañas ${tipoCabana} disponibles para ${datos.personas} personas en las fechas ${fechaInicio} - ${fechaFin}`);
        }
        
        console.log(`Cabaña encontrada: ${cabina.name} (ID: ${cabina.cabin_id})`);
        
        // 6. Crear reserva
        const reservaData = {
            start_date: fechaInicio,
            end_date: fechaFin,
            status: 'pendiente',
            total_price: datos.precioTotal || 0,
            personas: datos.personas
        };
        
        const resultado = await createReservationWithUser(userId, reservaData, cabina.cabin_id);
        
        if (resultado.success) {
            console.log(`✅ RESERVA CREADA EXITOSAMENTE!`);
            console.log(`   - ID: ${resultado.reservationId}`);
            console.log(`   - Usuario: ${datos.nombre} (${userId})`);
            console.log(`   - Cabaña: ${cabina.name}`);
            console.log(`   - Fechas: ${fechaInicio} - ${fechaFin}`);
            console.log(`   - Personas: ${datos.personas}`);
            console.log(`   - Precio: $${datos.precioTotal}`);
            
            return {
                success: true,
                reservationId: resultado.reservationId,
                mensaje: `Reserva confirmada para ${datos.nombre}. Cabaña asignada: ${cabina.name}. ID de reserva: ${resultado.reservationId}`
            };
        } else {
            throw new Error(resultado.error || 'Error creando reserva');
        }
        
    } catch (error) {
        console.error(`❌ ERROR en confirmación:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Test con el usuario actual
confirmarReservaDirecta('50487373838').then(resultado => {
    console.log('\n=== RESULTADO FINAL ===');
    console.log(JSON.stringify(resultado, null, 2));
    process.exit(0);
});
