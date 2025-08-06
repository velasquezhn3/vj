/**
 * Configuración de Jest para Tests Completos
 * Bot VJ - Sistema de Reservas Villas Julie
 */

module.exports = {
  // Entorno de testing
  testEnvironment: 'node',
  
  // Directorios de tests
  roots: ['<rootDir>/tests'],
  
  // Patrones de archivos de test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Setup y teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Cobertura de código
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov', 
    'html',
    'json-summary'
  ],
  
  // Archivos a incluir en cobertura
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/logs/**'
  ],
  
  // Umbrales de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './services/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './controllers/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Configuración de timeouts
  testTimeout: 30000,
  
  // Variables de entorno para tests
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  
  // Reporters personalizados
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Bot VJ Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      suiteName: 'Bot VJ Test Suite'
    }]
  ],
  
  // Transformaciones
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignorar patrones
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/logs/',
    '<rootDir>/uploads/',
    '<rootDir>/backups/'
  ],
  
  // Mock de módulos
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@config/(.*)$': '<rootDir>/config/$1'
  },
  
  // Configuración de verbose
  verbose: true,
  
  // Configuración para tests en paralelo
  maxWorkers: '50%',
  
  // Configuración de cache
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Configuración de notificaciones
  notify: false,
  notifyMode: 'failure-change',
  
  // Configuración de watch
  watchman: false,
  
  // Configuración global
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.LOG_LEVEL': 'error'
  },
  
  // Configuración de módulos a limpiar
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true
};
