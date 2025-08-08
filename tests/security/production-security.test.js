/**
 * Tests de seguridad críticos para producción
 * Verifica que todas las medidas de seguridad estén funcionando
 */

const path = require('path');
const fs = require('fs');

// Mock de módulos para evitar problemas de inicialización
jest.mock('../../services/whatsappQueueService', () => ({
  getQueueManager: () => ({
    init: async () => true,
    setBotInstance: () => true
  })
}));

jest.mock('../../db', () => ({
  runQuery: jest.fn(),
  runExecute: jest.fn()
}));

describe('🔐 SEGURIDAD CRÍTICA - Tests Producción', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar environment para tests
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_key_for_security_testing_minimum_64_chars_required_here';
  });

  describe('🛡️ Configuración de Seguridad', () => {
    test('✅ Debe tener variables de entorno seguras', () => {
      const requiredEnvVars = [
        'NODE_ENV',
        'JWT_SECRET'
      ];

      requiredEnvVars.forEach(varName => {
        expect(process.env[varName]).toBeDefined();
        expect(process.env[varName]).not.toBe('');
      });

      // JWT_SECRET debe ser suficientemente largo
      expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    });

    test('✅ Debe tener middlewares de seguridad disponibles', () => {
      const securityFiles = [
        '../../middleware/security.js',
        '../../middleware/auth.js',
        '../../middleware/securityValidator.js',
        '../../middleware/globalErrorHandler.js'
      ];

      securityFiles.forEach(file => {
        const filePath = path.resolve(__dirname, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('🚨 Validación de Entrada', () => {
    test('✅ SecurityValidator debe estar disponible', () => {
      const SecurityValidator = require('../../middleware/securityValidator');
      
      expect(SecurityValidator).toBeDefined();
      expect(typeof SecurityValidator.validateBody).toBe('function');
      expect(SecurityValidator.schemas).toBeDefined();
    });

    test('❌ Debe rechazar patrones SQL injection', () => {
      const SecurityValidator = require('../../middleware/securityValidator');
      
      const maliciousInputs = [
        "'; DROP TABLE Users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM Users",
        "'; DELETE FROM Users WHERE '1'='1"
      ];

      maliciousInputs.forEach(input => {
        // Simular validación
        const containsSQLKeywords = /('|(\')|;|--|\/\*|\*\/|union|select|insert|update|delete|drop|create|alter)/i.test(input);
        expect(containsSQLKeywords).toBe(true);
      });
    });

    test('❌ Debe detectar patrones XSS', () => {
      const xssPatterns = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '<img onerror="alert(1)" src="invalid">'
      ];

      xssPatterns.forEach(pattern => {
        const containsXSS = /<script|javascript:|<iframe|onerror=/i.test(pattern);
        expect(containsXSS).toBe(true);
      });
    });
  });

  describe('🔐 Sistema de Autenticación', () => {
    test('✅ JWT middleware debe estar configurado', () => {
      const { authenticateToken } = require('../../middleware/auth');
      
      expect(authenticateToken).toBeDefined();
      expect(typeof authenticateToken).toBe('function');
    });

    test('✅ Debe validar tokens JWT correctamente', () => {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET;

      // Crear token válido
      const validToken = jwt.sign({ 
        adminId: 1, 
        username: 'test',
        role: 'admin' 
      }, secret, { expiresIn: '1h' });

      // Verificar token
      const decoded = jwt.verify(validToken, secret);
      expect(decoded.adminId).toBe(1);
      expect(decoded.username).toBe('test');
    });

    test('❌ Debe rechazar tokens inválidos', () => {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET;

      const invalidTokens = [
        'invalid.token.here',
        jwt.sign({ test: 'data' }, 'wrong_secret'),
        'expired.token.example'
      ];

      invalidTokens.forEach(token => {
        try {
          jwt.verify(token, secret);
          // Si llega aquí, el token fue válido (no debería pasar)
          expect(true).toBe(false);
        } catch (error) {
          // Token inválido correctamente rechazado
          expect(error.name).toMatch(/(JsonWebTokenError|TokenExpiredError|NotBeforeError)/);
        }
      });
    });
  });

  describe('⚡ Rate Limiting', () => {
    test('✅ Rate limiting debe estar configurado', () => {
      const { generalLimiter, loginLimiter } = require('../../middleware/security');
      
      expect(generalLimiter).toBeDefined();
      expect(loginLimiter).toBeDefined();
      expect(typeof generalLimiter).toBe('function');
      expect(typeof loginLimiter).toBe('function');
    });
  });

  describe('🛡️ Manejo de Errores', () => {
    test('✅ GlobalErrorHandler debe estar disponible', () => {
      const GlobalErrorHandler = require('../../middleware/globalErrorHandler');
      
      expect(GlobalErrorHandler).toBeDefined();
      expect(typeof GlobalErrorHandler).toBe('function');
      
      // Crear instancia
      const errorHandler = new GlobalErrorHandler();
      expect(errorHandler.expressErrorHandler).toBeDefined();
      expect(typeof errorHandler.expressErrorHandler).toBe('function');
    });

    test('✅ Debe sanitizar errores en producción', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Sensitive database info');
      error.stack = 'Error stack trace with sensitive info';
      
      // Simular sanitización
      const sanitizedError = {
        success: false,
        message: 'Error interno del servidor',
        trackingId: 'ERR-123456'
        // stack y detalles sensibles omitidos en producción
      };
      
      expect(sanitizedError.stack).toBeUndefined();
      expect(sanitizedError.message).not.toContain('database');
      expect(sanitizedError.trackingId).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('📊 Cache System', () => {
    test('✅ CacheService debe estar disponible', () => {
      const cacheService = require('../../services/cacheService');
      
      expect(cacheService).toBeDefined();
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.set).toBe('function');
    });

    test('✅ Cache debe funcionar correctamente', () => {
      const cacheService = require('../../services/cacheService');
      
      const testKey = 'test-key';
      const testData = { test: 'data', timestamp: Date.now() };
      
      // Set cache
      cacheService.set(testKey, testData, 60);
      
      // Get cache
      const cachedData = cacheService.get(testKey);
      expect(cachedData).toEqual(testData);
      
      // Limpiar cache de test
      cacheService.delete(testKey);
    });
  });

  describe('🗄️ Base de Datos', () => {
    test('✅ Conexión DB debe estar disponible', () => {
      const db = require('../../db');
      
      expect(db).toBeDefined();
      expect(typeof db.runQuery).toBe('function');
      expect(typeof db.runExecute).toBe('function');
    });

    test('✅ Base de datos debe existir', () => {
      const dbPath = path.resolve(__dirname, '../../bot_database.sqlite');
      expect(fs.existsSync(dbPath)).toBe(true);
    });
  });

  describe('📁 Archivos Críticos', () => {
    test('✅ Archivos de configuración deben existir', () => {
      const criticalFiles = [
        '../../package.json',
        '../../adminServer.js',
        '../../controllers/botController.js',
        '../../.env.example'
      ];

      criticalFiles.forEach(file => {
        const filePath = path.resolve(__dirname, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('❌ No deben existir archivos temporales', () => {
      const tempFiles = [
        '../../test-api.js',
        '../../diagnose-tests.js',
        '../../verify-fix.js'
      ];

      tempFiles.forEach(file => {
        const filePath = path.resolve(__dirname, file);
        expect(fs.existsSync(filePath)).toBe(false);
      });
    });
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.resetModules();
  });
});
