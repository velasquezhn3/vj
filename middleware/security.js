const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

/**
 * Rate limiting para APIs generales
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana por IP
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Retorna rate limit info en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});

/**
 * Rate limiting estricto para login
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // límite de 5 intentos de login por ventana por IP
  message: {
    success: false,
    message: 'Demasiados intentos de login desde esta IP, intenta de nuevo en 15 minutos.',
    error: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true, // No contar requests exitosos
});

/**
 * Rate limiting para creación de recursos
 */
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // límite de 10 creaciones por minuto por IP
  message: {
    success: false,
    message: 'Demasiadas creaciones desde esta IP, intenta de nuevo en 1 minuto.',
    error: 'CREATE_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Configuración de Helmet para headers de seguridad
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:4000"],
    },
  },
  crossOriginEmbedderPolicy: false, // Deshabilitar para desarrollo local
});

/**
 * Middleware de sanitización de entrada
 */
const sanitizeInput = (req, res, next) => {
  // Sanitizar strings en body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  // Sanitizar query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Función helper para sanitizar objetos
 */
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remover caracteres potencialmente peligrosos
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Scripts
        .replace(/javascript:/gi, '') // JavaScript URLs
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Event handlers
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]); // Recursivo para objetos anidados
    }
  }
};

/**
 * Middleware de logging de seguridad
 */
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log para requests a endpoints administrativos
  if (req.path.startsWith('/admin')) {
    console.log(`[SECURITY] ${timestamp} - IP: ${ip} - ${req.method} ${req.path} - UA: ${userAgent}`);
  }
  
  next();
};

/**
 * Middleware de detección de ataques básicos
 */
const attackDetection = (req, res, next) => {
  const suspiciousPatterns = [
    /(<script|<iframe|<object|<embed)/i, // HTML injection
    /(union\s+select|drop\s+table|delete\s+from)/i, // SQL injection
    /(\.\.\/|\.\.\\)/g, // Path traversal
    /(\bjavascript\b|\bvbscript\b)/i, // Script injection
  ];
  
  const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.path;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.error(`[SECURITY ALERT] Suspicious request detected from IP ${req.ip}: ${req.method} ${req.path}`);
      return res.status(400).json({
        success: false,
        message: 'Solicitud rechazada por razones de seguridad',
        error: 'SECURITY_VIOLATION'
      });
    }
  }
  
  next();
};

module.exports = {
  generalLimiter,
  loginLimiter,
  createLimiter,
  helmetConfig,
  sanitizeInput,
  securityLogger,
  attackDetection
};
