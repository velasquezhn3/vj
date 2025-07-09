// config/logger.js
const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;
const DailyRotateFile = require('winston-daily-rotate-file');

// Formato personalizado para consola
const consoleFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Formato para archivos (JSON estructurado)
const fileFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const logEntry = {
    timestamp,
    level,
    message,
    ...metadata
  };
  return JSON.stringify(logEntry);
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Transporte para consola (solo en desarrollo)
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      )
    }),
    // Transporte para archivo de errores
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: fileFormat
    }),
    // Transporte para todos los logs
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Captura excepciones no manejadas
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

module.exports = logger;