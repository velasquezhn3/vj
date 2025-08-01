// Test específico para debuggear el problema del comando /confirmar
const { buscarCabanaDisponible } = require('../services/cabinsService');

async function testBuscarCabana() {
    console.log('=== DEBUGGING BÚSQUEDA DE CABAÑA ===\n');
    
    // Datos exactos del último intento
    const datos = {
        fechaEntrada: '15/10/2025',
        fechaSalida: '20/10/2025',
        noches: 5,
        nombre: 'carlos velasquez',
        telefono: '50487373838',
        personas: 6,
        alojamiento: 'delfin',
        precioTotal: 21000
    };
    
    console.log('Datos de entrada:', datos);
    
    // 1. Test de getTipoCabana
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
    
    console.log('\n1. Test de getTipoCabana:');
    const tipoCabana = getTipoCabana(datos.alojamiento);
    console.log(`   Alojamiento: "${datos.alojamiento}"`);
    console.log(`   Tipo determinado: "${tipoCabana}"`);
    
    // 2. Test de conversión de fechas
    function convertirFecha(fecha) {
        if (!fecha) return null;
        if (fecha.includes('/')) {
            const [d, m, y] = fecha.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return fecha;
    }
    
    console.log('\n2. Test de conversión de fechas:');
    const fechaEntradaISO = convertirFecha(datos.fechaEntrada);
    const fechaSalidaISO = convertirFecha(datos.fechaSalida);
    console.log(`   Entrada: ${datos.fechaEntrada} -> ${fechaEntradaISO}`);
    console.log(`   Salida: ${datos.fechaSalida} -> ${fechaSalidaISO}`);
    
    // 3. Test de validación de parámetros
    console.log('\n3. Validación de parámetros:');
    console.log(`   tipoCabana: "${tipoCabana}" (${typeof tipoCabana})`);
    console.log(`   personas: ${datos.personas} (${typeof datos.personas})`);
    console.log(`   fechaEntradaISO: "${fechaEntradaISO}" (${typeof fechaEntradaISO})`);
    console.log(`   fechaSalidaISO: "${fechaSalidaISO}" (${typeof fechaSalidaISO})`);
    
    if (!tipoCabana) {
        console.log('   ❌ ERROR: No se pudo determinar el tipo de cabaña');
        return;
    }
    
    if (!datos.personas) {
        console.log('   ❌ ERROR: No hay número de personas');
        return;
    }
    
    // 4. Test de búsqueda de cabaña
    console.log('\n4. Ejecutando búsqueda de cabaña...');
    try {
        const cabinDisponible = await buscarCabanaDisponible(
            tipoCabana,
            fechaEntradaISO,
            fechaSalidaISO,
            datos.personas
        );
        
        if (cabinDisponible) {
            console.log('   ✅ CABAÑA ENCONTRADA:');
            console.log(`      ID: ${cabinDisponible.cabin_id}`);
            console.log(`      Nombre: ${cabinDisponible.name}`);
            console.log(`      Tipo: ${cabinDisponible.type}`);
            console.log(`      Capacidad: ${cabinDisponible.capacity}`);
        } else {
            console.log('   ❌ NO SE ENCONTRÓ CABAÑA DISPONIBLE');
        }
    } catch (error) {
        console.log('   ❌ ERROR EN BÚSQUEDA:', error.message);
    }
    
    console.log('\n=== FIN DEL DEBUG ===');
    process.exit(0);
}

testBuscarCabana();
