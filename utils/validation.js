/**
 * 🛡️ SISTEMA DE VALIDACIÓN CENTRALIZADO
 * Validaciones para reservas, usuarios y datos del bot
 */

const Joi = require('joi');

/**
 * Schema para validación de reservas
 */
const reservationSchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.min': 'La fecha de inicio debe ser futura',
      'date.iso': 'Formato de fecha inválido (usar YYYY-MM-DD)',
      'any.required': 'Fecha de inicio es obligatoria'
    }),
    
  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .required()
    .messages({
      'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio',
      'any.required': 'Fecha de fin es obligatoria'
    }),
    
  guests: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.min': 'Mínimo 1 huésped',
      'number.max': 'Máximo 10 huéspedes',
      'any.required': 'Número de huéspedes es obligatorio'
    }),
    
  cabinType: Joi.string()
    .valid('tortuga', 'delfin', 'tiburon')
    .required()
    .messages({
      'any.only': 'Tipo de cabaña debe ser: tortuga, delfin o tiburon'
    }),
    
  guestName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .required()
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres'
    }),
    
  phoneNumber: Joi.string()
    .pattern(/^[0-9+\-\s()]{8,20}$/)
    .required()
    .messages({
      'string.pattern.base': 'Número de teléfono inválido'
    })
});

/**
 * Schema para validación de usuarios
 */
const userSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^[0-9+\-\s()]{8,20}$/)
    .required(),
    
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .optional(),
    
  role: Joi.string()
    .valid('guest', 'admin')
    .default('guest')
});

/**
 * Schema para validación de configuración admin
 */
const adminConfigSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
    
  password: Joi.string()
    .min(12)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password debe tener mayúsculas, minúsculas, números y símbolos',
      'string.min': 'Password debe tener mínimo 12 caracteres'
    })
});

/**
 * Funciones de validación específicas
 */

/**
 * Valida datos de reserva
 * @param {Object} data - Datos de la reserva
 * @returns {Object} Resultado de validación
 */
function validateReservation(data) {
  const { error, value } = reservationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  return {
    isValid: !error,
    data: value,
    errors: error ? error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    })) : []
  };
}

/**
 * Valida datos de usuario
 * @param {Object} data - Datos del usuario
 * @returns {Object} Resultado de validación
 */
function validateUser(data) {
  const { error, value } = userSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  return {
    isValid: !error,
    data: value,
    errors: error ? error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    })) : []
  };
}

/**
 * Sanitiza input de texto para prevenir inyecciones
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/[<>\"']/g, '') // Remover caracteres peligrosos
    .substring(0, 500); // Limitar longitud
}

/**
 * Valida número de teléfono hondureño
 * @param {string} phone - Número de teléfono
 * @returns {Object} Resultado de validación
 */
function validateHonduranPhone(phone) {
  // Formato hondureño: +504 9999-9999 o 504 9999-9999 o 99999999
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  if (cleanPhone.length === 8) {
    return { isValid: true, formatted: `+504${cleanPhone}` };
  }
  
  if (cleanPhone.length === 11 && cleanPhone.startsWith('504')) {
    return { isValid: true, formatted: `+${cleanPhone}` };
  }
  
  return { 
    isValid: false, 
    message: 'Formato inválido. Usar: 99999999 o +504 9999-9999' 
  };
}

module.exports = {
  validateReservation,
  validateUser,
  validateHonduranPhone,
  sanitizeText,
  schemas: {
    reservationSchema,
    userSchema,
    adminConfigSchema
  }
};
