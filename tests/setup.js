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

/**
 * Setup global para tests
 * Bot VJ - Sistema de Reservas Villas Julie
 */

const { runExecute } = require('../db');
const logger = require('../config/logger');

// Configurar timeout global para tests
jest.setTimeout(30000);

// Mock del logger para tests (reducir ruido)
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  cache: jest.fn(),
  security: jest.fn(),
  performance: jest.fn()
}));

// Variables globales para tests
global.testConfig = {
  database: {
    timeout: 5000
  },
  api: {
    timeout: 10000
  }
};

// Setup antes de cada test suite
beforeAll(async () => {
  // Configurar base de datos para tests
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  
  console.log('� Iniciando suite de tests...');
  
  // Verificar conexión a base de datos
  try {
    await runExecute('SELECT 1');
    console.log('✅ Conexión a base de datos establecida');
  } catch (error) {
    console.error('❌ Error conectando a base de datos:', error);
    throw error;
  }
});

// Cleanup después de cada test suite
afterAll(async () => {
  console.log('�🧹 Limpiando después de tests...');
  
  // Limpiar datos de test si es necesario
  try {
    await runExecute('DELETE FROM Users WHERE phone_number LIKE "+5730%"');
    await runExecute('DELETE FROM ConversationStates WHERE user_id NOT IN (SELECT user_id FROM Users)');
    console.log('✅ Cleanup completado');
  } catch (error) {
    console.warn('⚠️ Error en cleanup:', error.message);
  }
});

// Utilidades globales para tests
global.testUtils = {
  // Generar datos de prueba
  generateTestUser: (index = 1) => ({
    phone_number: `+5730123456${index.toString().padStart(2, '0')}`,
    name: `Test User ${index}`,
    role: 'cliente'
  }),
  
  // Generar reserva de prueba
  generateTestReservation: (userId, cabinId) => ({
    user_id: userId,
    cabin_id: cabinId,
    start_date: '2025-12-01',
    end_date: '2025-12-03',
    guest_count: 4,
    status: 'pendiente',
    special_requests: 'Test reservation'
  }),
  
  // Esperar un tiempo determinado
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generar ID único para tests
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Limpiar cache para tests
  clearCache: () => {
    const cacheService = require('../services/cacheService');
    cacheService.clear();
  }
};

// Handler para errores no capturados en tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection en tests:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception en tests:', error);
});
