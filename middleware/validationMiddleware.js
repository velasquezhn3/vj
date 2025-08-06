/**
 * Middleware de Validación Avanzada para Bot VJ
 * Validaciones mejoradas para API con mejor manejo de errores
 */

const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');
const cacheService = require('../services/cacheService');

class ValidationMiddleware {
  /**
   * Middleware para manejar errores de validación
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));
      
      logger.warn('Validation errors', {
        url: req.url,
        method: req.method,
        errors: errorDetails,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errorDetails,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  }

  /**
   * Validaciones para reservas
   */
  static validateReservation() {
    return [
      body('start_date')
        .isISO8601()
        .withMessage('Fecha de inicio debe ser ISO8601')
        .custom((value) => {
          const date = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (date < today) {
            throw new Error('Fecha de inicio no puede ser en el pasado');
          }
          return true;
        }),
        
      body('end_date')
        .isISO8601()
        .withMessage('Fecha de fin debe ser ISO8601')
        .custom((value, { req }) => {
          const startDate = new Date(req.body.start_date);
          const endDate = new Date(value);
          
          if (endDate <= startDate) {
            throw new Error('Fecha de fin debe ser posterior a fecha de inicio');
          }
          
          // Máximo 30 días de reserva
          const diffTime = Math.abs(endDate - startDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 30) {
            throw new Error('Reserva no puede exceder 30 días');
          }
          
          return true;
        }),
        
      body('cabin_id')
        .notEmpty()
        .withMessage('ID de cabaña es requerido')
        .custom(async (value) => {
          // Verificar que la cabaña existe en cache o BD
          const cacheKey = `cabin:${value}`;
          let cabin = cacheService.get(cacheKey);
          
          if (!cabin) {
            const { runQuery } = require('../db');
            const cabins = await runQuery('SELECT cabin_id FROM Cabins WHERE cabin_id = ?', [value]);
            cabin = cabins[0];
            
            if (cabin) {
              cacheService.set(cacheKey, cabin, 5 * 60 * 1000); // 5 min cache
            }
          }
          
          if (!cabin) {
            throw new Error(`Cabaña con ID ${value} no existe`);
          }
          
          return true;
        }),
        
      body('personas')
        .isInt({ min: 1, max: 15 })
        .withMessage('Número de personas debe estar entre 1 y 15')
        .custom(async (value, { req }) => {
          // Verificar capacidad de la cabaña
          const cabinId = req.body.cabin_id;
          if (cabinId) {
            const { runQuery } = require('../db');
            const cabins = await runQuery('SELECT capacity FROM Cabins WHERE cabin_id = ?', [cabinId]);
            
            if (cabins[0] && value > cabins[0].capacity) {
              throw new Error(`La cabaña solo tiene capacidad para ${cabins[0].capacity} personas`);
            }
          }
          
          return true;
        }),
        
      body('user_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('User ID debe ser un número positivo'),
        
      body('total_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Precio total debe ser un número positivo'),
        
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Validaciones para usuarios
   */
  static validateUser() {
    return [
      body('phone_number')
        .matches(/^\+?[1-9]\d{7,14}$/)
        .withMessage('Número de teléfono inválido (formato internacional)')
        .custom(async (value, { req }) => {
          // Solo verificar unicidad en creación, no en actualización
          if (req.method === 'POST') {
            const { runQuery } = require('../db');
            const users = await runQuery('SELECT user_id FROM Users WHERE phone_number = ?', [value]);
            
            if (users.length > 0) {
              throw new Error('Número de teléfono ya está registrado');
            }
          }
          
          return true;
        }),
        
      body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('Nombre solo puede contener letras y espacios'),
        
      body('role')
        .optional()
        .isIn(['guest', 'admin', 'superadmin'])
        .withMessage('Rol debe ser: guest, admin o superadmin'),
        
      body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active debe ser verdadero o falso'),
        
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Validaciones para cabañas
   */
  static validateCabin() {
    return [
      body('name')
        .isLength({ min: 3, max: 100 })
        .withMessage('Nombre debe tener entre 3 y 100 caracteres')
        .custom(async (value, { req }) => {
          // Verificar unicidad solo en creación
          if (req.method === 'POST') {
            const { runQuery } = require('../db');
            const cabins = await runQuery('SELECT cabin_id FROM Cabins WHERE name = ?', [value]);
            
            if (cabins.length > 0) {
              throw new Error('Ya existe una cabaña con ese nombre');
            }
          }
          
          return true;
        }),
        
      body('capacity')
        .isInt({ min: 1, max: 20 })
        .withMessage('Capacidad debe estar entre 1 y 20 personas'),
        
      body('price')
        .isFloat({ min: 0 })
        .withMessage('Precio debe ser un número positivo'),
        
      body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Descripción no puede exceder 1000 caracteres'),
        
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Validaciones para parámetros ID
   */
  static validateId(paramName = 'id') {
    return [
      param(paramName)
        .isInt({ min: 1 })
        .withMessage(`${paramName} debe ser un número entero positivo`),
        
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Validaciones para consultas de fecha
   */
  static validateDateQuery() {
    return [
      query('year')
        .optional()
        .isInt({ min: 2020, max: 2030 })
        .withMessage('Año debe estar entre 2020 y 2030'),
        
      query('month')
        .optional()
        .isInt({ min: 1, max: 12 })
        .withMessage('Mes debe estar entre 1 y 12'),
        
      query('start_date')
        .optional()
        .isISO8601()
        .withMessage('start_date debe ser formato ISO8601'),
        
      query('end_date')
        .optional()
        .isISO8601()
        .withMessage('end_date debe ser formato ISO8601'),
        
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Validaciones para paginación
   */
  static validatePagination() {
    return [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Límite debe estar entre 1 y 100'),
        
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset debe ser mayor o igual a 0'),
        
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Página debe ser mayor a 0'),
        
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Validaciones para búsqueda
   */
  static validateSearch() {
    return [
      query('search')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Búsqueda debe tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_@.]+$/)
        .withMessage('Búsqueda contiene caracteres inválidos'),
        
      query('sort')
        .optional()
        .isIn(['name', 'created_at', 'updated_at', 'price', 'capacity'])
        .withMessage('Campo de ordenación inválido'),
        
      query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Orden debe ser asc o desc'),
        
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Sanitización de datos de entrada
   */
  static sanitizeInput(req, res, next) {
    try {
      // Sanitizar strings en body
      if (req.body && typeof req.body === 'object') {
        req.body = ValidationMiddleware.sanitizeObject(req.body);
      }
      
      // Sanitizar query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = ValidationMiddleware.sanitizeObject(req.query);
      }
      
      next();
    } catch (error) {
      logger.error('Error sanitizing input:', error);
      res.status(400).json({
        success: false,
        message: 'Error procesando datos de entrada'
      });
    }
  }

  /**
   * Sanitizar objeto recursivamente
   */
  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remover caracteres peligrosos básicos
        sanitized[key] = value
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = ValidationMiddleware.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Validaciones para login de usuarios
   */
  static validateLogin() {
    return [
      body('phone_number')
        .isMobilePhone('es-CO')
        .withMessage('Número de teléfono inválido')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 6 })
        .withMessage('Password debe tener al menos 6 caracteres'),
      
      ValidationMiddleware.handleValidationErrors
    ];
  }

  /**
   * Rate limiting simple por IP
   */
  static createRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const requests = new Map();
    
    return (req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Limpiar entradas antiguas
      if (requests.has(ip)) {
        const userRequests = requests.get(ip).filter(time => time > windowStart);
        requests.set(ip, userRequests);
      } else {
        requests.set(ip, []);
      }
      
      const userRequests = requests.get(ip);
      
      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes, intenta más tarde',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      userRequests.push(now);
      next();
    };
  }
}

module.exports = ValidationMiddleware;
