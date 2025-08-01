/**
 * Utilidades para manejar números de teléfono en WhatsApp
 */

/**
 * Extrae el número de teléfono de un ID de WhatsApp
 * @param {string} remitente - ID del remitente (puede incluir @s.whatsapp.net)
 * @returns {string} Número de teléfono limpio
 */
function extraerTelefono(remitente) {
  if (!remitente) return '';
  
  // Remover sufijo de WhatsApp si existe
  return remitente.replace('@s.whatsapp.net', '').trim();
}

/**
 * Valida si un número de teléfono tiene formato correcto
 * @param {string} telefono - Número a validar
 * @returns {boolean} true si es válido
 */
function validarTelefono(telefono) {
  if (!telefono) return false;
  
  // Verificar que solo contenga dígitos y tenga longitud apropiada
  const numeroLimpio = telefono.replace(/\D/g, '');
  return numeroLimpio.length >= 8 && numeroLimpio.length <= 15;
}

/**
 * Formatea un número de teléfono para mostrar
 * @param {string} telefono - Número a formatear
 * @returns {string} Número formateado
 */
function formatearTelefono(telefono) {
  if (!telefono) return '';
  
  const numero = extraerTelefono(telefono);
  
  // Si es un número hondureño (504), formatear apropiadamente
  if (numero.startsWith('504') && numero.length === 11) {
    return `+${numero.substring(0, 3)} ${numero.substring(3, 7)}-${numero.substring(7)}`;
  }
  
  return numero;
}

/**
 * Normaliza un número de teléfono para búsquedas en base de datos
 * @param {string} telefono - Número a normalizar
 * @returns {string} Número normalizado
 */
function normalizarTelefono(telefono) {
  if (!telefono) return '';
  
  // Extraer solo dígitos
  let numero = telefono.replace(/\D/g, '');
  
  // Si no tiene código de país y parece hondureño, agregar 504
  if (numero.length === 8 && numero.match(/^[2-9]/)) {
    numero = '504' + numero;
  }
  
  return numero;
}

module.exports = {
  extraerTelefono,
  validarTelefono,
  formatearTelefono,
  normalizarTelefono
};
