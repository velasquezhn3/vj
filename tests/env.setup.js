/**
 * Configuración de variables de entorno para tests
 */

// Cargar dotenv para tests
require('dotenv').config();

// Configurar variables específicas para testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.ADMIN_PORT = '4001';
process.env.DB_PATH = ':memory:';
process.env.LOG_LEVEL = 'error';
process.env.SILENT_TESTS = 'true';

// Configuración de JWT para tests
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRES_IN = '1h';

// Configuración de WhatsApp para tests (mock)
process.env.GRUPO_JID = 'test@g.us';
process.env.BOT_NAME = 'TestBot';

console.log('🧪 Configuración de entorno para tests cargada');
