/**
 * Sistema de Validación Avanzado - Bot VJ
 * Validación centralizada con seguridad empresarial
 */

const { body, validationResult, param, query } = require('express-validator');
const logger = require('../config/logger');

// Patrones de seguridad comunes
const SECURITY_PATTERNS = {
  SQL_INJECTION: /('|(\')|;|--|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter|union|script|declare)/i,
  XSS_BASIC: /<script|<iframe|javascript:|on\w+\s*=|data:text\/html/i,
  XSS_ADVANCED: /(\bon\w+\s*=|javascript:|vbscript:|data:text\/html|<\s*script|<\s*iframe|<\s*object|<\s*embed|<\s*link|<\s*meta)/i,
  PATH_TRAVERSAL: /\.\.|\/\.\.|\\\.\.|\.\.\\/,
  COMMAND_INJECTION: /(\||;|&|\$\(|\`|<|>|\{|\})/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE_INTERNATIONAL: /^\+?[1-9]\d{7,14}$/,
  PHONE_HONDURAS: /^(\+504|504)?[2389]\d{7}$/,
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/,
  SAFE_TEXT: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.@()]+$/,
  USERNAME: /^[a-zA-Z0-9_.-]{3,30}$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// Listas de palabras prohibidas
const FORBIDDEN_WORDS = {
  SQL_KEYWORDS: ['select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'exec', 'execute', 'union', 'script'],
  SCRIPT_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'style'],
  DANGEROUS_FUNCTIONS: ['eval', 'setTimeout', 'setInterval', 'Function', 'constructor']
};

/**
 * Logger de seguridad mejorado
 */
function logSecurityEvent(eventType, req, details = {}) {
  const logData = {
    eventType,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    endpoint: req.originalUrl,
    method: req.method,
    userId: req.user?.adminId,
    timestamp: new Date().toISOString(),
    ...details
  };

  if (eventType === 'SECURITY_VIOLATION') {
    logger.error('🚨 Violación de seguridad detectada', logData);
  } else if (eventType === 'VALIDATION_FAILED') {
    logger.warn('⚠️ Validación fallida', logData);
  } else {
    logger.info(`🔍 Evento de seguridad: ${eventType}`, logData);
  }
}

/**
 * Sanitizador avanzado contra XSS
 */
function advancedSanitize(input) {
  if (typeof input !== 'string') return input;
  
  return input
    // Remover scripts y elementos peligrosos
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Remover eventos JavaScript
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    // Remover data URLs peligrosos
    .replace(/data:text\/html/gi, '')
    // Normalizar espacios
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detector de ataques de seguridad
 */
function detectSecurityThreats(input, req) {
  const threats = [];
  
  if (typeof input !== 'string') return threats;
  
  const lowerInput = input.toLowerCase();
  
  // Detectar SQL Injection
  if (SECURITY_PATTERNS.SQL_INJECTION.test(input)) {
    threats.push({
      type: 'SQL_INJECTION',
      severity: 'HIGH',
      pattern: 'SQL keywords or dangerous characters detected'
    });
  }
  
  // Detectar XSS avanzado
  if (SECURITY_PATTERNS.XSS_ADVANCED.test(input)) {
    threats.push({
      type: 'XSS_ATTACK',
      severity: 'HIGH',
      pattern: 'JavaScript injection or HTML injection detected'
    });
  }
  
  // Detectar Path Traversal
  if (SECURITY_PATTERNS.PATH_TRAVERSAL.test(input)) {
    threats.push({
      type: 'PATH_TRAVERSAL',
      severity: 'MEDIUM',
      pattern: 'Directory traversal attempt detected'
    });
  }
  
  // Detectar Command Injection
  if (SECURITY_PATTERNS.COMMAND_INJECTION.test(input)) {
    threats.push({
      type: 'COMMAND_INJECTION',
      severity: 'HIGH',
      pattern: 'Command injection attempt detected'
    });
  }
  
  // Verificar palabras prohibidas
  FORBIDDEN_WORDS.SQL_KEYWORDS.forEach(keyword => {
    if (lowerInput.includes(keyword)) {
      threats.push({
        type: 'FORBIDDEN_KEYWORD',
        severity: 'MEDIUM',
        pattern: `Forbidden SQL keyword: ${keyword}`
      });
    }
  });
  
  return threats;
}

/**
 * Middleware de seguridad avanzado
 */
const advancedSecurityMiddleware = (req, res, next) => {
  const violations = [];
  
  // Verificar body
  if (req.body && typeof req.body === 'object') {
    Object.entries(req.body).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const threats = detectSecurityThreats(value, req);
        if (threats.length > 0) {
          violations.push({ field: key, threats });
        }
        // Sanitizar automáticamente
        req.body[key] = advancedSanitize(value);
      }
    });
  }
  
  // Verificar query parameters
  if (req.query && typeof req.query === 'object') {
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const threats = detectSecurityThreats(value, req);
        if (threats.length > 0) {
          violations.push({ field: `query.${key}`, threats });
        }
      }
    });
  }
  
  // Si hay violaciones de seguridad críticas, bloquear
  const criticalViolations = violations.filter(v => 
    v.threats.some(t => t.severity === 'HIGH')
  );
  
  if (criticalViolations.length > 0) {
    logSecurityEvent('SECURITY_VIOLATION', req, {
      violations: criticalViolations,
      blockedRequest: true
    });
    
    return res.status(400).json({
      success: false,
      message: 'Solicitud bloqueada por motivos de seguridad',
      error: 'SECURITY_VIOLATION',
      code: 'BLOCKED_REQUEST'
    });
  }
  
  // Log violaciones menores pero permitir continuación
  if (violations.length > 0) {
    logSecurityEvent('SECURITY_WARNING', req, {
      violations,
      sanitized: true
    });
  }
  
  next();
};

/**
 * Validador de entrada robusta mejorado
 */
const enhancedValidationHandler = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value ? '[HIDDEN_FOR_SECURITY]' : undefined,
      location: error.location
    }));
    
    logSecurityEvent('VALIDATION_FAILED', req, {
      errorCount: errorDetails.length,
      fields: errorDetails.map(e => e.field),
      validationErrors: errorDetails
    });
    
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errorDetails,
      error: 'VALIDATION_ERROR',
      code: 'INVALID_INPUT'
    });
  }
  
  next();
};

/**
 * Validaciones de negocio específicas mejoradas
 */
const validateStrongPassword = (value) => {
  if (!SECURITY_PATTERNS.PASSWORD_STRONG.test(value)) {
    throw new Error('Password must contain at least 8 characters, including uppercase, lowercase, number and special character');
  }
  return true;
};

const validateInternationalPhone = (value) => {
  if (!SECURITY_PATTERNS.PHONE_INTERNATIONAL.test(value)) {
    throw new Error('Número de teléfono inválido. Formato internacional: +[código país][número]');
  }
  return true;
};

const validateSafeText = (value) => {
  if (!SECURITY_PATTERNS.SAFE_TEXT.test(value)) {
    throw new Error('Texto contiene caracteres no permitidos');
  }
  return true;
};

const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (start < today) {
    throw new Error('Fecha de inicio no puede ser en el pasado');
  }
  
  if (end <= start) {
    throw new Error('Fecha de fin debe ser posterior a fecha de inicio');
  }
  
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    throw new Error('Reserva no puede exceder 30 días');
  }
  
  if (diffDays < 1) {
    throw new Error('Reserva debe ser de al menos 1 día');
  }
  
  return true;
};

/**
 * Validaciones mejoradas para entidades específicas
 */
const advancedUserValidation = [
  body('username')
    .if(body('username').exists())
    .matches(SECURITY_PATTERNS.USERNAME)
    .withMessage('Username debe contener solo letras, números, guiones y puntos (3-30 caracteres)')
    .customSanitizer(value => value ? value.toLowerCase().trim() : value),
  
  body('password')
    .if(body('password').exists())
    .custom(validateStrongPassword),
  
  body('phone_number')
    .if(body('phone_number').exists())
    .custom(validateInternationalPhone),
  
  body('name')
    .if(body('name').exists())
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres')
    .custom(validateSafeText)
    .customSanitizer(advancedSanitize),
  
  body('email')
    .if(body('email').exists())
    .matches(SECURITY_PATTERNS.EMAIL)
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  enhancedValidationHandler
];

const advancedReservationValidation = [
  body('start_date', 'end_date')
    .custom((value, { req }) => {
      return validateDateRange(req.body.start_date, req.body.end_date);
    }),
  
  body('personas')
    .isInt({ min: 1, max: 20 })
    .withMessage('Número de personas debe estar entre 1 y 20'),
  
  body('cabin_id')
    .isInt({ min: 1 })
    .withMessage('ID de cabaña inválido'),
  
  body('notes')
    .if(body('notes').exists())
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
    .custom(validateSafeText)
    .customSanitizer(advancedSanitize),
  
  enhancedValidationHandler
];

module.exports = {
  // Middleware principal
  advancedSecurityMiddleware,
  enhancedValidationHandler,
  
  // Funciones de utilidad
  advancedSanitize,
  detectSecurityThreats,
  logSecurityEvent,
  
  // Validadores específicos
  validateStrongPassword,
  validateInternationalPhone,
  validateSafeText,
  validateDateRange,
  
  // Validaciones de entidades mejoradas
  advancedUserValidation,
  advancedReservationValidation,
  
  // Patrones de seguridad
  SECURITY_PATTERNS,
  FORBIDDEN_WORDS
};
