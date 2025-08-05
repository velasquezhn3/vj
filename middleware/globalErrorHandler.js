/**
 * Sistema de Manejo de Errores Global para Bot VJ
 * Captura y maneja todos los errores de manera consistente
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

class GlobalErrorHandler {
  constructor() {
    this.setupLogger();
    this.setupUncaughtHandlers();
  }

  /**
   * Configurar logger para errores
   */
  setupLogger() {
    // Crear directorio de logs si no existe
    const logDir = './logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: path.join(logDir, 'error.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 10
        }),
        new winston.transports.File({ 
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880,
          maxFiles: 5
        })
      ]
    });

    // Agregar consola en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  /**
   * Configurar manejadores para errores no capturados
   */
  setupUncaughtHandlers() {
    // Manejar excepciones no capturadas
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      console.error('💥 UNCAUGHT EXCEPTION:', error);
      
      // Dar tiempo para escribir logs antes de salir
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Manejar promesas rechazadas no capturadas
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      console.error('💥 UNHANDLED REJECTION:', reason);
      
      // No salir del proceso para promesas rechazadas
      // Solo loggear el error
    });

    // Manejar señales de terminación
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received. Shutting down gracefully.');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.logger.info('SIGINT received. Shutting down gracefully.');
      process.exit(0);
    });
  }

  /**
   * Middleware de manejo de errores para Express
   */
  expressErrorHandler() {
    return (error, req, res, next) => {
      // Log del error
      this.logError(error, req);

      // Determinar tipo de error y respuesta apropiada
      const errorResponse = this.buildErrorResponse(error, req);

      // Enviar respuesta
      res.status(errorResponse.status).json(errorResponse.body);
    };
  }

  /**
   * Loggear error con contexto
   */
  logError(error, req = null) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...(req && {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: this.sanitizeBody(req.body),
        params: req.params,
        query: req.query
      })
    };

    this.logger.error('Application Error:', errorInfo);
  }

  /**
   * Construir respuesta de error apropiada
   */
  buildErrorResponse(error, req) {
    // Errores conocidos con manejo específico
    const knownErrors = {
      'ValidationError': { status: 400, type: 'validation' },
      'UnauthorizedError': { status: 401, type: 'auth' },
      'ForbiddenError': { status: 403, type: 'auth' },
      'NotFoundError': { status: 404, type: 'not_found' },
      'ConflictError': { status: 409, type: 'conflict' },
      'RateLimitError': { status: 429, type: 'rate_limit' }
    };

    const errorType = knownErrors[error.constructor.name];
    const status = errorType?.status || error.status || 500;
    const type = errorType?.type || 'internal';

    // Respuesta base
    const response = {
      success: false,
      error: this.getErrorMessage(error, status),
      type: type,
      timestamp: new Date().toISOString()
    };

    // Agregar detalles en desarrollo
    if (process.env.NODE_ENV === 'development') {
      response.details = {
        message: error.message,
        stack: error.stack,
        path: req?.path,
        method: req?.method
      };
    }

    // Agregar ID de seguimiento para errores 500
    if (status >= 500) {
      response.trackingId = this.generateTrackingId();
    }

    return {
      status,
      body: response
    };
  }

  /**
   * Obtener mensaje de error apropiado
   */
  getErrorMessage(error, status) {
    // Mensajes personalizados por tipo de error
    const errorMessages = {
      400: 'Solicitud inválida. Verifica los datos enviados.',
      401: 'No autorizado. Inicia sesión para continuar.',
      403: 'Acceso denegado. No tienes permisos para esta acción.',
      404: 'Recurso no encontrado.',
      409: 'Conflicto. El recurso ya existe o está en conflicto.',
      429: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
      500: 'Error interno del servidor. Contacta al administrador.'
    };

    // Si es error conocido y tiene mensaje personalizado
    if (error.message && status < 500) {
      return error.message;
    }

    return errorMessages[status] || 'Ha ocurrido un error inesperado.';
  }

  /**
   * Generar ID de seguimiento único
   */
  generateTrackingId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ERR-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Sanitizar body para logging (remover información sensible)
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Wrapper para funciones async que maneja errores automáticamente
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Middleware para capturar errores de rutas no encontradas
   */
  static notFoundHandler() {
    return (req, res, next) => {
      const error = new Error(`Ruta no encontrada: ${req.method} ${req.path}`);
      error.status = 404;
      error.name = 'NotFoundError';
      next(error);
    };
  }

  /**
   * Inicializar manejo global de errores
   */
  static initialize(app) {
    const handler = new GlobalErrorHandler();

    // Middleware de ruta no encontrada (debe ir antes del error handler)
    app.use(this.notFoundHandler());

    // Middleware de manejo de errores (debe ir al final)
    app.use(handler.expressErrorHandler());

    console.log('✅ Global Error Handler inicializado');
    return handler;
  }
}

module.exports = GlobalErrorHandler;
