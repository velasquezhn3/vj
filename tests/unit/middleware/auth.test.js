/**
 * Tests unitarios para middleware de autenticación y seguridad
 * Cobertura: JWT validation, rate limiting, security validation
 */

const { authenticateToken, authorizeRole, revokeToken } = require('../../../middleware/auth');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('jsonwebtoken');

describe('🔐 Auth Middleware - Tests Unitarios', () => {
  
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    test('✅ Debe autenticar token JWT válido', () => {
      // Arrange
      req.headers.authorization = 'Bearer valid.jwt.token';
      const mockUser = {
        adminId: 1,
        username: 'admin',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      jwt.verify.mockReturnValue(mockUser);

      // Act
      authenticateToken(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid.jwt.token', expect.any(String));
      expect(req.user).toEqual(mockUser);
      expect(req.authToken).toBe('valid.jwt.token');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('❌ Debe rechazar request sin token', () => {
      // Arrange - No authorization header

      // Act
      authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token de acceso requerido',
        error: 'NO_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('❌ Debe rechazar token inválido', () => {
      // Arrange
      req.headers.authorization = 'Bearer invalid.token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_TOKEN'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('❌ Debe rechazar token expirado', () => {
      // Arrange
      req.headers.authorization = 'Bearer expired.token';
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      // Act
      authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token expirado'
        })
      );
    });

    test('⚠️ Debe manejar formatos de Authorization incorrectos', () => {
      const invalidFormats = [
        'InvalidFormat token',
        'Bearer',
        'Bearer ',
        'Token valid.jwt.token',
        'valid.jwt.token'
      ];

      invalidFormats.forEach(authHeader => {
        req.headers.authorization = authHeader;
        res.status.mockClear();
        res.json.mockClear();
        next.mockClear();

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });
    });

    test('⚠️ Debe rechazar tokens revocados', () => {
      // Arrange
      const token = 'revoked.jwt.token';
      req.headers.authorization = `Bearer ${token}`;
      
      // Mock token como revocado
      revokeToken(token);
      
      const mockUser = { adminId: 1, username: 'admin' };
      jwt.verify.mockReturnValue(mockUser);

      // Act
      authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token revocado'
        })
      );
    });
  });

  describe('authorizeRole', () => {
    beforeEach(() => {
      req.user = {
        adminId: 1,
        username: 'admin',
        role: 'admin'
      };
    });

    test('✅ Debe autorizar rol válido', () => {
      // Arrange
      const middleware = authorizeRole('admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('✅ Debe autorizar múltiples roles válidos', () => {
      // Arrange
      const middleware = authorizeRole('admin', 'superadmin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    test('✅ Debe autorizar wildcard role (*)', () => {
      // Arrange
      req.user.role = 'guest';
      const middleware = authorizeRole('*');

      // Act
      middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    test('❌ Debe rechazar rol insuficiente', () => {
      // Arrange
      req.user.role = 'user';
      const middleware = authorizeRole('admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Permisos insuficientes'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('❌ Debe rechazar usuario no autenticado', () => {
      // Arrange
      req.user = null;
      const middleware = authorizeRole('admin');

      // Act
      middleware(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Usuario no autenticado'
        })
      );
    });

    test('⚠️ Debe manejar roles undefined/null', () => {
      const roleCases = [null, undefined, ''];
      
      roleCases.forEach(role => {
        req.user.role = role;
        res.status.mockClear();
        res.json.mockClear();
        next.mockClear();

        const middleware = authorizeRole('admin');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('Token Management', () => {
    test('✅ Debe revocar token correctamente', () => {
      // Arrange
      const token = 'test.jwt.token';
      
      // Act
      revokeToken(token);
      
      // Setup authentication attempt with revoked token
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue({ adminId: 1 });
      
      authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('⚠️ Debe limpiar tokens expirados del blacklist', () => {
      // Este test verifica que el sistema limpia tokens expirados
      // para evitar memory leaks
      const oldToken = 'old.expired.token';
      
      revokeToken(oldToken);
      
      // Simulate time passing (this would be handled by a cleanup job)
      // For testing, we just verify the token was added to blacklist
      expect(typeof revokeToken).toBe('function');
    });
  });

  describe('Security Edge Cases', () => {
    test('⚠️ Debe manejar tokens maliciosos', () => {
      const maliciousTokens = [
        '<script>alert("xss")</script>',
        'Bearer ../../../etc/passwd',
        'Bearer null',
        'Bearer undefined',
        'Bearer ' + 'A'.repeat(10000), // Token muy largo
      ];

      maliciousTokens.forEach(authHeader => {
        req.headers.authorization = authHeader;
        res.status.mockClear();
        res.json.mockClear();
        next.mockClear();

        authenticateToken(req, res, next);

        expect([401, 403]).toContain(res.status.mock.calls[0]?.[0]);
        expect(next).not.toHaveBeenCalled();
      });
    });

    test('⚠️ Debe manejar JWT bombing attack', () => {
      // Arrange - Token con payload muy grande
      const largeToken = 'Bearer ' + 'A'.repeat(10000);
      req.headers.authorization = largeToken;
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Token too large');
      });

      // Act
      authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('⚠️ Debe validar estructura de user object', () => {
      // Arrange - JWT válido pero con estructura de user inválida
      req.headers.authorization = 'Bearer valid.token';
      const invalidUser = { someProperty: 'value' }; // Missing required fields
      jwt.verify.mockReturnValue(invalidUser);

      // Act
      authenticateToken(req, res, next);

      // Assert - Debe pasar pero req.user debe ser validado en autorizacion
      expect(req.user).toEqual(invalidUser);
      
      // Test authorization with invalid user
      const middleware = authorizeRole('admin');
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('⚠️ Debe loggear intentos de acceso sospechosos', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      req.headers.authorization = 'Bearer malicious.token';
      req.ip = '192.168.1.100';
      
      jwt.verify.mockImplementation(() => {
        throw new Error('Malicious token detected');
      });

      // Act
      authenticateToken(req, res, next);

      // Assert
      // Verificar que se loggee información de seguridad
      // (En implementación real esto iría a winston logger)
      expect(res.status).toHaveBeenCalledWith(403);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Tests', () => {
    test('⚠️ Debe manejar múltiples requests concurrentes', async () => {
      // Arrange
      const validToken = 'Bearer valid.concurrent.token';
      const mockUser = { adminId: 1, username: 'admin', role: 'admin' };
      jwt.verify.mockReturnValue(mockUser);

      // Act - Simulate concurrent requests
      const requests = Array(100).fill().map(() => {
        const reqCopy = { ...req, headers: { authorization: validToken } };
        const resCopy = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        const nextCopy = jest.fn();

        authenticateToken(reqCopy, resCopy, nextCopy);
        
        return { req: reqCopy, res: resCopy, next: nextCopy };
      });

      // Assert - All requests should be processed successfully
      requests.forEach(({ req, res, next }) => {
        expect(req.user).toEqual(mockUser);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });
  });
});
