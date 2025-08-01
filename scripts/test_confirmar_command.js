// Script para probar el comando /confirmar con datos simulados
const { establecerEstado } = require('../services/stateService');
const { buscarCabanaDisponible } = require('../services/cabinsService');
const { createReservationWithUser } = require('../services/reservaService');

async function testConfirmarCommand() {
    console.log('=== SIMULANDO COMANDO /CONFIRMAR ===\n');
    
    const userId = '50487373838';
    const userJid = userId + '@s.whatsapp.net';
    
    // 1. Establecer estado con datos de prueba
    console.log('1. Estableciendo estado con datos de prueba...');
    const datosSimulados = {
        nombre: 'carlos velasquez',
        telefono: '50487373838',
        personas: 9,
        alojamiento: 'tiburon',
        fechaEntrada: '10/08/2025',
        fechaSalida: '13/08/2025',
        noches: 3,
        precioTotal: 12000
    };
    
    await establecerEstado(userJid, 'ESPERANDO_PAGO', datosSimulados);
    console.log('✅ Estado establecido con datos:', datosSimulados);
    
    // 2. Función para mapear alojamiento a tipo de cabaña
    function getTipoCabana(alojamiento) {
        if (!alojamiento) return null;
        const alojamientoLower = alojamiento.toLowerCase();
        
        if (alojamientoLower.includes('tortuga') || alojamientoLower.includes('🐢')) {
          return 'tortuga';
        } else if (alojamientoLower.includes('delfín') || alojamientoLower.includes('delfin') || alojamientoLower.includes('🐬')) {
          return 'delfin';
        } else if (alojamientoLower.includes('tiburón') || alojamientoLower.includes('tiburon') || alojamientoLower.includes('🦈')) {
          return 'tiburon';
        }
        
        return null;
    }
    
    // 3. Convertir fechas
    function convertirFecha(fecha) {
        if (fecha.includes('/')) {
            const [d, m, y] = fecha.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return fecha;
    }
    
    console.log('\n2. Determinando tipo de cabaña...');
    const tipoCabana = getTipoCabana(datosSimulados.alojamiento);
    console.log(`   Alojamiento: "${datosSimulados.alojamiento}" -> Tipo: "${tipoCabana}"`);
    
    console.log('\n3. Convirtiendo fechas...');
    const fechaEntradaISO = convertirFecha(datosSimulados.fechaEntrada);
    const fechaSalidaISO = convertirFecha(datosSimulados.fechaSalida);
    console.log(`   ${datosSimulados.fechaEntrada} -> ${fechaEntradaISO}`);
    console.log(`   ${datosSimulados.fechaSalida} -> ${fechaSalidaISO}`);
    
    console.log('\n4. Buscando cabaña disponible...');
    const cabinDisponible = await buscarCabanaDisponible(
        tipoCabana,
        fechaEntradaISO,
        fechaSalidaISO,
        datosSimulados.personas
    );
    
    if (cabinDisponible) {
        console.log(`✅ Cabaña encontrada: ID ${cabinDisponible.cabin_id}, Nombre: ${cabinDisponible.name}`);
        
        console.log('\n5. Creando reserva...');
        const reservaData = {
            start_date: fechaEntradaISO,
            end_date: fechaSalidaISO,
            status: 'pendiente',
            total_price: datosSimulados.precioTotal,
            personas: datosSimulados.personas
        };
        
        const resultado = await createReservationWithUser(userId, reservaData, cabinDisponible.cabin_id);
        
        if (resultado.success) {
            console.log(`✅ Reserva creada exitosamente! ID: ${resultado.reservationId}`);
        } else {
            console.log(`❌ Error creando reserva: ${resultado.error}`);
        }
    } else {
        console.log(`❌ No se encontró cabaña disponible para ${tipoCabana}, ${datosSimulados.personas} personas`);
    }
    
    console.log('\n=== TEST COMPLETADO ===');
    process.exit(0);
}

testConfirmarCommand().catch(console.error);
