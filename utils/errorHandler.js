/**
 * 🛡️ ERROR HANDLER CENTRALIZADO - Bot VJ
 * Manejo robusto y centralizado de errores
 */

const logger = require('./logger');

class ErrorHandler {
    constructor() {
        this.errorCodes = {
            // Errores de validación (400)
            VALIDATION_ERROR: { code: 400, message: 'Error de validación' },
            INVALID_INPUT: { code: 400, message: 'Entrada inválida' },
            MISSING_FIELDS: { code: 400, message: 'Campos requeridos faltantes' },
            
            // Errores de autenticación (401)
            UNAUTHORIZED: { code: 401, message: 'No autorizado' },
            INVALID_TOKEN: { code: 401, message: 'Token inválido' },
            TOKEN_EXPIRED: { code: 401, message: 'Token expirado' },
            
            // Errores de permisos (403)
            FORBIDDEN: { code: 403, message: 'Acceso prohibido' },
            INSUFFICIENT_PERMISSIONS: { code: 403, message: 'Permisos insuficientes' },
            
            // Errores de recursos (404)
            NOT_FOUND: { code: 404, message: 'Recurso no encontrado' },
            USER_NOT_FOUND: { code: 404, message: 'Usuario no encontrado' },
            RESERVATION_NOT_FOUND: { code: 404, message: 'Reserva no encontrada' },
            
            // Errores de conflicto (409)
            CONFLICT: { code: 409, message: 'Conflicto de recursos' },
            DUPLICATE_ENTRY: { code: 409, message: 'Entrada duplicada' },
            RESERVATION_CONFLICT: { code: 409, message: 'Conflicto de reserva' },
            
            // Errores de rate limiting (429)
            RATE_LIMIT_EXCEEDED: { code: 429, message: 'Límite de velocidad excedido' },
            TOO_MANY_REQUESTS: { code: 429, message: 'Demasiadas solicitudes' },
            
            // Errores del servidor (500)
            INTERNAL_ERROR: { code: 500, message: 'Error interno del servidor' },
            DATABASE_ERROR: { code: 500, message: 'Error de base de datos' },
            EXTERNAL_SERVICE_ERROR: { code: 500, message: 'Error de servicio externo' },
            
            // Errores específicos del bot
            BOT_CONNECTION_ERROR: { code: 503, message: 'Error de conexión del bot' },
            MESSAGE_SEND_ERROR: { code: 503, message: 'Error enviando mensaje' },
            WHATSAPP_ERROR: { code: 503, message: 'Error de WhatsApp' }
        };
        
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Manejar errores no capturados
        process.on('uncaughtException', (error) => {
            logger.error('SYSTEM', 'Uncaught Exception', {
                error: error.message,
                stack: error.stack
            });
            
            // Dar tiempo para que el log se escriba antes de salir
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Manejar promesas rechazadas
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('SYSTEM', 'Unhandled Promise Rejection', {
                reason: reason?.message || reason,
                stack: reason?.stack
            });
        });
    }

    createError(errorType, customMessage = null, additionalData = null) {
        const errorConfig = this.errorCodes[errorType];
        
        if (!errorConfig) {
            logger.warn('ERROR_HANDLER', `Unknown error type: ${errorType}`);
            return this.createError('INTERNAL_ERROR');
        }

        const error = new Error(customMessage || errorConfig.message);
        error.name = errorType;
        error.statusCode = errorConfig.code;
        error.isOperational = true;
        
        if (additionalData) {
            error.data = additionalData;
        }

        return error;
    }

    handleError(error, req = null, res = null) {
        // Log del error
        this.logError(error, req);
        
        // Si tenemos respuesta HTTP, enviar error apropiado
        if (res && !res.headersSent) {
            return this.sendErrorResponse(error, res);
        }
        
        return error;
    }

    logError(error, req = null) {
        const errorInfo = {
            name: error.name || 'Error',
            message: error.message,
            stack: error.stack,
            statusCode: error.statusCode,
            isOperational: error.isOperational
        };

        // Añadir información de la request si está disponible
        if (req) {
            errorInfo.request = {
                method: req.method,
                url: req.url,
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                body: this.sanitizeBody(req.body)
            };
        }

        // Añadir datos adicionales si existen
        if (error.data) {
            errorInfo.additionalData = error.data;
        }

        // Log según severidad
        if (error.statusCode && error.statusCode < 500) {
            logger.warn('ERROR_HANDLER', 'Client Error', errorInfo);
        } else {
            logger.error('ERROR_HANDLER', 'Server Error', errorInfo);
        }
    }

    sendErrorResponse(error, res) {
        const statusCode = error.statusCode || 500;
        const response = {
            success: false,
            error: {
                message: error.message,
                type: error.name || 'Error'
            }
        };

        // En desarrollo, incluir stack trace
        if (process.env.NODE_ENV === 'development') {
            response.error.stack = error.stack;
        }

        // Añadir datos adicionales si existen y no son sensibles
        if (error.data && !this.containsSensitiveData(error.data)) {
            response.error.data = error.data;
        }

        return res.status(statusCode).json(response);
    }

    sanitizeBody(body) {
        if (!body) return null;
        
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
        const sanitized = { ...body };
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    containsSensitiveData(data) {
        const sensitivePatterns = [
            /password/i,
            /token/i,
            /secret/i,
            /key/i,
            /credential/i
        ];
        
        const dataString = JSON.stringify(data);
        return sensitivePatterns.some(pattern => pattern.test(dataString));
    }

    // Middleware para Express
    middleware() {
        return (error, req, res, next) => {
            this.handleError(error, req, res);
        };
    }

    // Wrapper para funciones asíncronas
    asyncWrapper(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    // Métodos de conveniencia para crear errores específicos
    validationError(message, data = null) {
        return this.createError('VALIDATION_ERROR', message, data);
    }

    notFoundError(resource = 'Recurso') {
        return this.createError('NOT_FOUND', `${resource} no encontrado`);
    }

    unauthorizedError(message = null) {
        return this.createError('UNAUTHORIZED', message);
    }

    forbiddenError(message = null) {
        return this.createError('FORBIDDEN', message);
    }

    conflictError(message = null) {
        return this.createError('CONFLICT', message);
    }

    rateLimitError(message = null) {
        return this.createError('RATE_LIMIT_EXCEEDED', message);
    }

    databaseError(message = null, data = null) {
        return this.createError('DATABASE_ERROR', message, data);
    }

    botError(message = null, data = null) {
        return this.createError('BOT_CONNECTION_ERROR', message, data);
    }

    // Método para verificar si un error es operacional
    isOperationalError(error) {
        return error.isOperational === true;
    }

    // Obtener estadísticas de errores
    getErrorStats() {
        // Esta funcionalidad requeriría un sistema de métricas más avanzado
        // Por ahora retornamos información básica
        return {
            handlerActive: true,
            errorTypes: Object.keys(this.errorCodes),
            timestamp: new Date().toISOString()
        };
    }
}

// Crear instancia singleton
const errorHandler = new ErrorHandler();

module.exports = errorHandler;
