/**
 * Middleware de validación robusta para Bot VJ
 * Previene SQL injection, XSS y ataques de validación
 */

const Joi = require('joi');
const validator = require('express-validator');

class SecurityValidator {
  /**
   * Esquemas de validación Joi para diferentes entidades
   */
  static schemas = {
    // Validación para reservas
    reservation: Joi.object({
      cabin_id: Joi.number().integer().positive().required(),
      start_date: Joi.date().iso().min('now').required(),
      end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
      personas: Joi.number().integer().min(1).max(20).required(),
      phone_number: Joi.string().pattern(/^\+\d{10,15}$/).required(),
      name: Joi.string().min(2).max(100).pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).required()
    }),

    // Validación para admin login
    adminLogin: Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().min(8).max(128).required()
    }),

    // Validación para cabañas
    cabin: Joi.object({
      name: Joi.string().min(3).max(100).required(),
      type: Joi.string().valid('individual', 'familiar', 'grupal').required(),
      capacity: Joi.number().integer().min(1).max(20).required(),
      price_per_night: Joi.number().positive().precision(2).required(),
      description: Joi.string().max(1000).optional(),
      amenities: Joi.string().max(500).optional()
    }),

    // Validación para usuarios
    user: Joi.object({
      phone_number: Joi.string().pattern(/^\+\d{10,15}$/).required(),
      name: Joi.string().min(2).max(100).pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).required(),
      role: Joi.string().valid('guest', 'admin').default('guest')
    }),

    // Validación para IDs
    id: Joi.number().integer().positive(),

    // Validación para fechas
    dateRange: Joi.object({
      start_date: Joi.date().iso().min('now').required(),
      end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
    })
  };

  /**
   * Middleware para validar datos con Joi
   */
  static validateBody(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: errorDetails
        });
      }

      req.validatedBody = value;
      next();
    };
  }

  /**
   * Middleware para validar parámetros de URL
   */
  static validateParams(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.params, { 
        abortEarly: false 
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de URL inválidos',
          details: error.details.map(d => d.message)
        });
      }

      req.validatedParams = value;
      next();
    };
  }

  /**
   * Middleware para validar query parameters
   */
  static validateQuery(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.query, { 
        abortEarly: false,
        allowUnknown: true
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: error.details.map(d => d.message)
        });
      }

      req.validatedQuery = value;
      next();
    };
  }

  /**
   * Sanitización de strings para prevenir XSS
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>\"']/g, '') // Remover caracteres peligrosos
      .trim()
      .substring(0, 1000); // Limitar longitud
  }

  /**
   * Validación de números de teléfono Venezuela
   */
  static isValidVenezuelanPhone(phone) {
    const phoneRegex = /^(\+58|0058|58)?[24]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * Validación de fechas futuras
   */
  static isFutureDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Resetear a inicio del día
    return date >= now;
  }

  /**
   * Middleware combinado para validación de reservas
   */
  static validateReservation() {
    return [
      this.validateBody(this.schemas.reservation),
      (req, res, next) => {
        const { start_date, end_date, phone_number } = req.validatedBody;

        // Validaciones adicionales
        if (!this.isFutureDate(start_date)) {
          return res.status(400).json({
            success: false,
            error: 'La fecha de entrada debe ser futura'
          });
        }

        if (!this.isValidVenezuelanPhone(phone_number)) {
          return res.status(400).json({
            success: false,
            error: 'Número de teléfono venezolano inválido'
          });
        }

        // Validar duración máxima (30 días)
        const daysDiff = (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24);
        if (daysDiff > 30) {
          return res.status(400).json({
            success: false,
            error: 'La reserva no puede exceder 30 días'
          });
        }

        next();
      }
    ];
  }

  /**
   * Middleware para validación de admin
   */
  static validateAdmin() {
    return [
      this.validateBody(this.schemas.adminLogin),
      (req, res, next) => {
        const { username, password } = req.validatedBody;

        // Validaciones adicionales de seguridad
        if (username.toLowerCase().includes('admin') && username.length < 5) {
          return res.status(400).json({
            success: false,
            error: 'Nombre de usuario demasiado simple'
          });
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          return res.status(400).json({
            success: false,
            error: 'La contraseña debe tener mayúsculas, minúsculas y números'
          });
        }

        next();
      }
    ];
  }
}

module.exports = SecurityValidator;
