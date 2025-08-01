/**
 * Servicio para manejo de estados de conversación de usuarios.
 */

const estadosUsuarios = {};
const ultimosSaludo = {}; // Track last greeting date per user

/**
 * Establece el estado de un usuario.
 * @param {string} numero - Número del usuario.
 * @param {string} estado - Estado a establecer.
 * @param {Object} datos - Datos adicionales.
 */
function establecerEstado(numero, estado, datos = {}) {
  console.log(`[StateService] Estableciendo estado para ${numero}:`);
  console.log(`  - Estado: ${estado}`);
  console.log(`  - Datos:`, JSON.stringify(datos, null, 2));
  
  estadosUsuarios[numero] = { estado, datos, timestamp: Date.now() };
  
  console.log(`[StateService] Estado establecido exitosamente para ${numero}`);
}

/**
 * Obtiene el estado actual de un usuario.
 * Elimina estados con más de 60 minutos de antigüedad, excepto si está esperando pago (2 horas).
 * @param {string} numero - Número del usuario.
 * @returns {Object} Estado y datos.
 */
function obtenerEstado(numero) {
  console.log(`[StateService] Obteniendo estado para ${numero}`);
  
  const estado = estadosUsuarios[numero];
  
  if (estado) {
    console.log(`[StateService] Estado encontrado: ${estado.estado}`);
    console.log(`[StateService] Timestamp: ${estado.timestamp} (hace ${Math.round((Date.now() - estado.timestamp) / 1000)} segundos)`);
    
    // Determinar tiempo de expiración según el estado
    let tiempoExpiracion = 60 * 60 * 1000; // 1 hora por defecto
    
    if (estado.estado === 'esperando_pago' || estado.estado === 'ESPERANDO_PAGO') {
      tiempoExpiracion = 2 * 60 * 60 * 1000; // 2 horas para estados de pago
    }
    
    if (Date.now() - estado.timestamp > tiempoExpiracion) {
      console.log(`[StateService] Estado expirado para ${numero}: ${estado.estado}`);
      delete estadosUsuarios[numero];
      return { estado: 'MENU_PRINCIPAL', datos: {} };
    }
    
    console.log(`[StateService] Retornando estado válido:`, estado);
    return estado;
  }
  
  console.log(`[StateService] No se encontró estado para ${numero}, retornando MENU_PRINCIPAL`);
  return { estado: 'MENU_PRINCIPAL', datos: {} };
}

/**
 * Establece la fecha del último saludo enviado a un usuario.
 * @param {string} numero - Número del usuario.
 * @param {string} fecha - Fecha en formato YYYY-MM-DD.
 */
function establecerUltimoSaludo(numero, fecha) {
  ultimosSaludo[numero] = fecha;
}

/**
 * Obtiene la fecha del último saludo enviado a un usuario.
 * @param {string} numero - Número del usuario.
 * @returns {string|null} Fecha en formato YYYY-MM-DD o null si no existe.
 */
function obtenerUltimoSaludo(numero) {
  return ultimosSaludo[numero] || null;
}

module.exports = {
  establecerEstado,
  obtenerEstado,
  establecerUltimoSaludo,
  obtenerUltimoSaludo
};