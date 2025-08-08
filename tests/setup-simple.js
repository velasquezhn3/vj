/**
 * Configuración simple para tests después de la limpieza
 */

// Configurar timeout para tests
jest.setTimeout(30000);

// Variables globales para tests
global.console = {
  ...console,
  // Silenciar logs durante tests si es necesario
  log: process.env.SILENT_TESTS === 'true' ? jest.fn() : console.log,
  debug: process.env.SILENT_TESTS === 'true' ? jest.fn() : console.debug,
  info: process.env.SILENT_TESTS === 'true' ? jest.fn() : console.info,
  warn: console.warn,
  error: console.error,
};

// Configuración de base de datos para tests
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:'; // Usar SQLite en memoria para tests

// Setup básico antes de todos los tests
beforeAll(async () => {
  // Inicialización básica si es necesaria
});

// Cleanup después de todos los tests
afterAll(async () => {
  // Limpieza básica si es necesaria
});
