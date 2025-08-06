const winston = require('winston');
const { combine, timestamp, printf, colorize, errors, metadata } = winston.format;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Configuración basada en entorno
const isProduction = process.env.NODE_ENV === 'production';
const logDir = process.env.LOG_DIR || path.join(__dirname, '../logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato para consola (mejor legibilidad)
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, stack }) => {
    const logMessage = `${timestamp} [${level}]: ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
  })
);

// Formato para archivos (JSON estructurado con metadatos)
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack'] }),
  winston.format.json()
);

// Filtros para diferentes niveles
const errorFilter = winston.format((info) => 
  info.level === 'error' ? info : false
);

const infoFilter = winston.format((info) => 
  ['info', 'debug', 'warn'].includes(info.level) ? info : false
);

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    winston.format.splat(),
    winston.format((info) => {
      // Añadir información de proceso
      info.pid = process.pid;
      info.environment = process.env.NODE_ENV || 'development';
      return info;
    })()
  ),
  transports: [
    // Transporte para consola (solo en desarrollo)
    ...(isProduction ? [] : [
      new winston.transports.Console({
        format: consoleFormat,
        handleExceptions: true
      })
    ]),
    
    // Transporte para archivo de errores
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: fileFormat,
      filter: errorFilter
    }),
    
    // Transporte para logs generales
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
      filter: infoFilter
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat
    })
  ],
  exitOnError: false, // No cerrar proceso en errores de log
  silent: process.env.DISABLE_LOGGING === 'true' // Opción para deshabilitar logging
});

// En producción, añadir transporte de consola JSON
if (isProduction) {
  logger.add(new winston.transports.Console({
    format: fileFormat,
    handleExceptions: true
  }));
}

// Captura global de excepciones
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // No cerrar el proceso inmediatamente para permitir limpieza
  setTimeout(() => process.exit(1), 1000);
});

// Funciones helper para categorías específicas
logger.security = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'security' });
};

// Función helper para cache operations
logger.cache = (message, meta = {}) => {
  logger.debug(message, { ...meta, category: 'cache' });
};

// Función helper para tracking de performance
logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'performance' });
};

module.exports = logger;