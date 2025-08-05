/**
 * 🧪 CONFIGURACIÓN GLOBAL DE TESTS
 * Setup para todos los tests del proyecto Bot VJ
 */

// Configuración global para tests
global.console = {
  ...console,
  // Mantener logs importantes pero silenciar spam
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock básico para sqlite3
jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => ({
    close: jest.fn((callback) => callback && callback()),
    run: jest.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        params(null);
      } else if (callback) {
        callback(null);
      }
    }),
    get: jest.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        params(null, {});
      } else if (callback) {
        callback(null, {});
      }
    }),
    all: jest.fn((sql, params, callback) => {
      if (typeof params === 'function') {
        params(null, []);
      } else if (callback) {
        callback(null, []);
      }
    })
  }))
}));

// Mock para variables de entorno críticas
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_PATH = ':memory:';

// Configuración para timeouts
jest.setTimeout(10000);

// Limpieza después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

console.log('🧹 Limpieza de testing completada');
