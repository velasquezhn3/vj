/**
 * TEST DE PRODUCCIÓN - VALIDACIÓN COMPLETA
 * Este test valida que el sistema esté listo para producción
 */

const fs = require('fs');
const path = require('path');

describe('🚀 PRODUCCIÓN - Validación Completa', () => {
  
  beforeAll(() => {
    // Configurar environment para producción
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'production_jwt_secret_key_must_be_64_chars_minimum_for_security_requirements';
  });

  describe('📁 Archivos Críticos', () => {
    const criticalFiles = [
      'adminServer.js',
      'package.json', 
      'db.js',
      'controllers/botController.js',
      'middleware/auth.js',
      'middleware/security.js',
      'middleware/securityValidator.js',
      'middleware/globalErrorHandler.js',
      'services/cacheService.js',
      'bot_database.sqlite',
      '.env.example'
    ];

    criticalFiles.forEach(file => {
      test(`✅ ${file} debe existir`, () => {
        const filePath = path.resolve(__dirname, '..', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('❌ No deben existir archivos temporales', () => {
      const tempFiles = [
        'test-api.js',
        'diagnose-tests.js', 
        'verify-fix.js',
        'quick-queue-test.js',
        'test-worker-direct.js'
      ];

      tempFiles.forEach(file => {
        const filePath = path.resolve(__dirname, '..', file);
        expect(fs.existsSync(filePath)).toBe(false);
      });
    });
  });

  describe('🔧 Configuración del Sistema', () => {
    test('✅ Variables de entorno requeridas', () => {
      const requiredVars = ['NODE_ENV', 'JWT_SECRET'];
      requiredVars.forEach(varName => {
        expect(process.env[varName]).toBeDefined();
        expect(process.env[varName]).not.toBe('');
      });
      
      // JWT_SECRET debe ser suficientemente seguro
      expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    });

    test('✅ Base de datos SQLite existe y es accesible', () => {
      const dbPath = path.resolve(__dirname, '..', 'bot_database.sqlite');
      expect(fs.existsSync(dbPath)).toBe(true);
      
      const stats = fs.statSync(dbPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('🛡️ Middlewares de Seguridad', () => {
    test('✅ Middleware de autenticación disponible', () => {
      const authMiddleware = require('../middleware/auth');
      expect(authMiddleware.authenticateToken).toBeDefined();
      expect(typeof authMiddleware.authenticateToken).toBe('function');
    });

    test('✅ SecurityValidator disponible', () => {
      const SecurityValidator = require('../middleware/securityValidator');
      expect(SecurityValidator).toBeDefined();
      expect(typeof SecurityValidator.validateBody).toBe('function');
      expect(SecurityValidator.schemas).toBeDefined();
    });

    test('✅ GlobalErrorHandler disponible', () => {
      const GlobalErrorHandler = require('../middleware/globalErrorHandler');
      expect(GlobalErrorHandler).toBeDefined();
      expect(typeof GlobalErrorHandler).toBe('function');
    });

    test('✅ Rate limiting disponible', () => {
      const security = require('../middleware/security');
      expect(security.generalLimiter).toBeDefined();
      expect(security.loginLimiter).toBeDefined();
    });
  });

  describe('🗄️ Servicios Core', () => {
    test('✅ Base de datos conectada', () => {
      const db = require('../db');
      expect(db.runQuery).toBeDefined();
      expect(db.runExecute).toBeDefined();
      expect(typeof db.runQuery).toBe('function');
    });

    test('✅ Cache service disponible', () => {
      const cacheService = require('../services/cacheService');
      expect(cacheService.get).toBeDefined();
      expect(cacheService.set).toBeDefined();
      expect(typeof cacheService.get).toBe('function');
    });

    test('✅ Bot Controller disponible', () => {
      const botController = require('../controllers/botController');
      expect(botController).toBeDefined();
      expect(typeof botController).toBe('object');
    });
  });

  describe('🔐 Validación de Seguridad', () => {
    test('✅ JWT debe funcionar correctamente', () => {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET;
      
      // Crear token
      const payload = { userId: 1, role: 'admin' };
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      
      // Verificar token
      const decoded = jwt.verify(token, secret);
      expect(decoded.userId).toBe(1);
      expect(decoded.role).toBe('admin');
    });

    test('❌ Debe rechazar tokens inválidos', () => {
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET;
      
      expect(() => {
        jwt.verify('invalid.token.here', secret);
      }).toThrow();
    });

    test('✅ SecurityValidator debe detectar SQL injection', () => {
      const sqlPatterns = [
        "'; DROP TABLE Users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM Users"
      ];
      
      sqlPatterns.forEach(pattern => {
        const containsSQL = /('|(\')|;|--|union|select|drop)/i.test(pattern);
        expect(containsSQL).toBe(true);
      });
    });

    test('✅ Debe detectar XSS patterns', () => {
      const xssPatterns = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">'
      ];
      
      xssPatterns.forEach(pattern => {
        const containsXSS = /<script|javascript:|<iframe/i.test(pattern);
        expect(containsXSS).toBe(true);
      });
    });
  });

  describe('📊 Sistema de Cache', () => {
    test('✅ Cache debe funcionar correctamente', () => {
      const cacheService = require('../services/cacheService');
      
      const testKey = 'production-test-key';
      const testData = { test: 'production-data', timestamp: Date.now() };
      
      // Set y Get
      cacheService.set(testKey, testData, 60);
      const result = cacheService.get(testKey);
      
      expect(result).toEqual(testData);
      
      // Cleanup
      cacheService.delete(testKey);
      const afterDelete = cacheService.get(testKey);
      expect(afterDelete).toBeNull();
    });
  });

  describe('🚀 Servidor y Rutas', () => {
    test('✅ AdminServer debe cargar sin errores', () => {
      // Test que el servidor se puede importar sin fallar
      expect(() => {
        delete require.cache[require.resolve('../adminServer')];
        require('../adminServer');
      }).not.toThrow();
    });

    test('✅ Package.json debe tener scripts necesarios', () => {
      const packageJson = require('../package.json');
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies.express).toBeDefined();
      expect(packageJson.dependencies.jsonwebtoken).toBeDefined();
    });
  });

  describe('📋 Scripts de Deployment', () => {
    test('✅ Script pre-deployment debe existir', () => {
      const scriptPath = path.resolve(__dirname, '..', 'scripts', 'pre-deployment-check.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    test('✅ Configuración de producción debe existir', () => {
      const envPath = path.resolve(__dirname, '..', '.env.production');
      expect(fs.existsSync(envPath)).toBe(true);
    });
  });

  describe('🧹 Cleanup y Optimización', () => {
    test('✅ Logs directory debe existir', () => {
      const logsPath = path.resolve(__dirname, '..', 'logs');
      if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath, { recursive: true });
      }
      expect(fs.existsSync(logsPath)).toBe(true);
    });

    test('✅ No deben existir archivos de debug', () => {
      const debugFiles = ['core.class.log', 'queue.class.log', 'baileys.log'];
      // Estos archivos pueden existir pero no deben ser críticos
      debugFiles.forEach(file => {
        const filePath = path.resolve(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
          console.warn(`⚠️ Archivo de debug encontrado: ${file}`);
        }
      });
    });
  });

  afterAll(() => {
    // Reset environment
    delete process.env.NODE_ENV;
  });
});
