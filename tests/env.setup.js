/**
 * 🔧 CONFIGURACIÓN DE ENTORNO PARA TESTS
 * Variables de entorno y configuración inicial
 */

// Configurar entorno de testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.DATABASE_PATH = ':memory:';
process.env.GRUPO_JID = 'test-group@g.us';

// Configuración de timezone para evitar problemas
process.env.TZ = 'America/Tegucigalpa';

// Silenciar warnings específicos de testing
process.env.NODE_NO_WARNINGS = '1';
