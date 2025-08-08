/**
 * Tests unitarios para authService
 * Cobertura: Autenticación, autorización, JWT, validaciones
 */

const authService = require('../../../services/authService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, runExecute } = require('../../../db');

// Mock dependencies
jest.mock('../../../db');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('🔐 AuthService - Tests Unitarios', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyAdminCredentials', () => {
    test('✅ Debe verificar credenciales válidas correctamente', async () => {
      // Arrange
      const mockAdmin = {
        admin_id: 1,
        username: 'admin',
        password_hash: 'hashedPassword',
        email: 'admin@test.com',
        is_active: 1
      };
      
      runQuery.mockResolvedValue([mockAdmin]);
      bcrypt.compare.mockResolvedValue(true);
      runExecute.mockResolvedValue();

      // Act
      const result = await authService.verifyAdminCredentials('admin', 'password123');

      // Assert
      expect(result).toBeTruthy();
      expect(result.admin_id).toBe(1);
      expect(result.username).toBe('admin');
      expect(result).not.toHaveProperty('password_hash');
      expect(runQuery).toHaveBeenCalledWith(
        'SELECT * FROM Admins WHERE username = ? AND is_active = 1',
        ['admin']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
    });

    test('❌ Debe rechazar credenciales inválidas', async () => {
      // Arrange
      runQuery.mockResolvedValue([]);

      // Act
      const result = await authService.verifyAdminCredentials('admin', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
    });

    test('❌ Debe rechazar contraseña incorrecta', async () => {
      // Arrange
      const mockAdmin = {
        admin_id: 1,
        username: 'admin',
        password_hash: 'hashedPassword',
        is_active: 1
      };
      
      runQuery.mockResolvedValue([mockAdmin]);
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await authService.verifyAdminCredentials('admin', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
    });

    test('⚠️ Debe manejar errores de base de datos', async () => {
      // Arrange
      runQuery.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await authService.verifyAdminCredentials('admin', 'password123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateJWT', () => {
    test('✅ Debe generar token JWT válido', async () => {
      // Arrange
      const mockAdmin = {
        admin_id: 1,
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin'
      };
      const mockToken = 'mock.jwt.token';
      jwt.sign.mockReturnValue(mockToken);

      // Act
      const result = await authService.generateJWT(mockAdmin);

      // Assert
      expect(result).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 1,
          username: 'admin',
          role: 'admin'
        }),
        expect.any(String),
        expect.objectContaining({
          expiresIn: '24h'
        })
      );
    });

    test('⚠️ Debe manejar errores en generación de token', async () => {
      // Arrange
      jwt.sign.mockImplementation(() => {
        throw new Error('JWT Error');
      });
      const mockAdmin = { admin_id: 1, username: 'admin' };

      // Act & Assert
      await expect(authService.generateJWT(mockAdmin)).rejects.toThrow('JWT Error');
    });
  });

  describe('verifyJWT', () => {
    test('✅ Debe verificar token JWT válido', async () => {
      // Arrange
      const mockDecoded = {
        adminId: 1,
        username: 'admin',
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + 3600
      };
      jwt.verify.mockReturnValue(mockDecoded);

      // Act
      const result = await authService.verifyJWT('valid.jwt.token');

      // Assert
      expect(result).toEqual(mockDecoded);
      expect(jwt.verify).toHaveBeenCalledWith('valid.jwt.token', expect.any(String));
    });

    test('❌ Debe rechazar token inválido', async () => {
      // Arrange
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await authService.verifyJWT('invalid.token');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    test('✅ Debe hashear password correctamente', async () => {
      // Arrange
      const hashedPassword = 'hashedPassword123';
      bcrypt.hash.mockResolvedValue(hashedPassword);

      // Act
      const result = await authService.hashPassword('plainPassword');

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 12);
    });

    test('⚠️ Debe manejar errores en hashing', async () => {
      // Arrange
      bcrypt.hash.mockRejectedValue(new Error('Hashing error'));

      // Act & Assert
      await expect(authService.hashPassword('password')).rejects.toThrow('Hashing error');
    });
  });

  describe('getAdminById', () => {
    test('✅ Debe obtener admin por ID', async () => {
      // Arrange
      const mockAdmin = {
        admin_id: 1,
        username: 'admin',
        email: 'admin@test.com',
        is_active: 1
      };
      runQuery.mockResolvedValue([mockAdmin]);

      // Act
      const result = await authService.getAdminById(1);

      // Assert
      expect(result).toEqual(mockAdmin);
      expect(runQuery).toHaveBeenCalledWith(
        'SELECT * FROM Admins WHERE admin_id = ? AND is_active = 1',
        [1]
      );
    });

    test('❌ Debe retornar null si admin no existe', async () => {
      // Arrange
      runQuery.mockResolvedValue([]);

      // Act
      const result = await authService.getAdminById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validatePasswordStrength', () => {
    test('✅ Debe validar password fuerte', () => {
      const strongPasswords = [
        'Admin123!@#',
        'MyStr0ngP@ssw0rd',
        'C0mpl3x!P@ss'
      ];

      strongPasswords.forEach(password => {
        expect(authService.validatePasswordStrength(password)).toBe(true);
      });
    });

    test('❌ Debe rechazar passwords débiles', () => {
      const weakPasswords = [
        '123456',
        'password',
        'admin',
        '12345678',
        'Admin123', // Sin caracteres especiales
        'admin123!', // Sin mayúsculas suficientes
      ];

      weakPasswords.forEach(password => {
        expect(authService.validatePasswordStrength(password)).toBe(false);
      });
    });
  });

  describe('Security Edge Cases', () => {
    test('⚠️ Debe manejar inputs maliciosos', async () => {
      const maliciousInputs = [
        "'; DROP TABLE Admins; --",
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'admin\x00bypass'
      ];

      for (const input of maliciousInputs) {
        runQuery.mockResolvedValue([]);
        const result = await authService.verifyAdminCredentials(input, 'password');
        expect(result).toBeNull();
      }
    });

    test('⚠️ Debe manejar casos de concurrencia', async () => {
      // Arrange
      const mockAdmin = {
        admin_id: 1,
        username: 'admin',
        password_hash: 'hashedPassword',
        is_active: 1
      };
      
      runQuery.mockResolvedValue([mockAdmin]);
      bcrypt.compare.mockResolvedValue(true);

      // Act - Múltiples llamadas concurrentes
      const promises = Array(10).fill().map(() => 
        authService.verifyAdminCredentials('admin', 'password123')
      );
      
      const results = await Promise.all(promises);

      // Assert
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result.admin_id).toBe(1);
      });
    });
  });
});
