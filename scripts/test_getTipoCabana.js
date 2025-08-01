// Test específico de getTipoCabana
function getTipoCabana(alojamiento) {
  console.log(`[DEBUG] getTipoCabana recibió: "${alojamiento}" (tipo: ${typeof alojamiento})`);
  
  if (!alojamiento) {
    console.log('[DEBUG] alojamiento es null/undefined');
    return null;
  }
  
  // Normalizar el texto a minúsculas para comparación
  const alojamientoLower = alojamiento.toLowerCase();
  console.log(`[DEBUG] alojamientoLower: "${alojamientoLower}"`);
  
  if (alojamientoLower.includes('tortuga') || alojamientoLower.includes('🐢')) {
    console.log('[DEBUG] Detectado tipo: tortuga');
    return 'tortuga';
  } else if (alojamientoLower.includes('delfín') || alojamientoLower.includes('delfin') || alojamientoLower.includes('🐬')) {
    console.log('[DEBUG] Detectado tipo: delfin');
    return 'delfin';
  } else if (alojamientoLower.includes('tiburón') || alojamientoLower.includes('tiburon') || alojamientoLower.includes('🦈')) {
    console.log('[DEBUG] Detectado tipo: tiburon');
    return 'tiburon';
  }
  
  console.log('[DEBUG] No se pudo determinar el tipo');
  return null;
}

// Test con datos del último intento
const alojamiento = 'tiburon';
console.log('=== TEST getTipoCabana ===');
const resultado = getTipoCabana(alojamiento);
console.log(`Resultado final: "${resultado}"`);

process.exit(0);
