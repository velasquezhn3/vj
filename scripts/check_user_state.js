// Script para verificar el estado del usuario
const { obtenerEstado } = require('../services/stateService');

const userId = '50487373838@s.whatsapp.net';
const estado = obtenerEstado(userId);

console.log('=== ESTADO DEL USUARIO ===');
console.log('UserID:', userId);
console.log('Estado completo:', JSON.stringify(estado, null, 2));

if (estado && estado.datos) {
    console.log('\n=== DATOS EXTRAÍDOS ===');
    console.log('Nombre:', estado.datos.nombre);
    console.log('Teléfono:', estado.datos.telefono);
    console.log('Personas:', estado.datos.personas);
    console.log('Alojamiento:', estado.datos.alojamiento);
    console.log('Fecha entrada:', estado.datos.fechaEntrada);
    console.log('Fecha salida:', estado.datos.fechaSalida);
    console.log('Precio total:', estado.datos.precioTotal);
    console.log('Noches:', estado.datos.noches);
}

// Test de getTipoCabana
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

if (estado && estado.datos && estado.datos.alojamiento) {
    console.log('\n=== MAPEO DE TIPO DE CABAÑA ===');
    const tipoCabana = getTipoCabana(estado.datos.alojamiento);
    console.log(`Alojamiento: "${estado.datos.alojamiento}" -> Tipo: "${tipoCabana}"`);
}

process.exit(0);
