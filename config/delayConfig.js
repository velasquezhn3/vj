/**
 * Configuración de delays para mensajes de WhatsApp
 * Para evitar bloqueos y simular comportamiento humano
 */

const DELAY_CONFIG = {
  // Rango de delay base (en milisegundos)
  MIN_DELAY: 4000,  // 4 segundos
  MAX_DELAY: 15000, // 15 segundos
  
  // Delays específicos por tipo de mensaje
  MENU_MESSAGES: {
    MIN_DELAY: 3000,  // 3 segundos para menús (respuesta más rápida)
    MAX_DELAY: 8000   // 8 segundos
  },
  
  CONFIRMATION_MESSAGES: {
    MIN_DELAY: 2000,  // 2 segundos para confirmaciones
    MAX_DELAY: 6000   // 6 segundos
  },
  
  ERROR_MESSAGES: {
    MIN_DELAY: 1000,  // 1 segundo para errores (respuesta rápida)
    MAX_DELAY: 3000   // 3 segundos
  },
  
  ACTIVITY_MESSAGES: {
    MIN_DELAY: 5000,  // 5 segundos para mensajes de actividades
    MAX_DELAY: 12000  // 12 segundos
  },
  
  RESERVATION_MESSAGES: {
    MIN_DELAY: 4000,  // 4 segundos para reservas
    MAX_DELAY: 15000  // 15 segundos
  },
  
  // Delay adicional entre mensajes múltiples
  MULTI_MESSAGE_DELAY: {
    MIN_DELAY: 2000,  // 2 segundos
    MAX_DELAY: 5000   // 5 segundos
  },
  
  // Configuración de logging
  LOG_DELAYS: true // true para mostrar logs de delays, false para ocultarlos
};

module.exports = DELAY_CONFIG;
