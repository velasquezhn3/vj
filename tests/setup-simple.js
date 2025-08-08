/**
 * 🧪 SETUP SIMPLIFICADO PARA TESTS
 * Configuración mínima y estable para tests
 */

// Mock básico para sqlite3
jest.mock('sqlite3', () => ({
  verbose: () => ({
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
  })
}));

// Mock del logger
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  cache: jest.fn(),
  security: jest.fn(),
  performance: jest.fn()
}));

// Variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-not-secure';
process.env.DATABASE_PATH = ':memory:';
process.env.LOG_LEVEL = 'error';

// Configuración de timeouts
jest.setTimeout(10000);

// Limpieza después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Setup antes de todos los tests
beforeAll(() => {
  console.log('✅ Setup de tests completado');
});

// Cleanup después de todos los tests
afterAll(() => {
  console.log('✅ Tests completados');
});

console.log('🧪 Setup simplificado para tests cargado');
