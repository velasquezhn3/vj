/**
 * Tests unitarios para usersService
 * Cobertura: CRUD usuarios, validaciones, búsquedas
 */

const usersService = require('../../../services/usersService');
const { runQuery, runExecute } = require('../../../db');

// Mock dependencies
jest.mock('../../../db');

describe('👥 UsersService - Tests Unitarios', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('✅ Debe crear usuario válido correctamente', async () => {
      // Arrange
      const userData = {
        name: 'Juan Pérez',
        phone: '+50412345678',
        email: 'juan@test.com'
      };

      runQuery.mockResolvedValue([]); // No user exists
      runExecute.mockResolvedValue({ insertId: 456 });

      // Act
      const result = await usersService.createUser(userData);

      // Assert
      expect(result).toBe(456);
      expect(runExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Users'),
        expect.arrayContaining(['Juan Pérez', '+50412345678', 'juan@test.com'])
      );
    });

    test('❌ Debe rechazar usuario duplicado por teléfono', async () => {
      // Arrange
      const userData = {
        name: 'Juan Pérez',
        phone: '+50412345678',
        email: 'juan@test.com'
      };

      runQuery.mockResolvedValue([{ id: 999, phone: '+50412345678' }]); // User exists

      // Act & Assert
      await expect(usersService.createUser(userData))
        .rejects.toThrow('Usuario ya existe con este teléfono');
    });

    test('❌ Debe validar formato de teléfono', async () => {
      const invalidPhones = [
        '123456789',      // Muy corto
        'notaphone',      // No numérico
        '12345678901234567890', // Muy largo
        '+1234',          // Muy corto con código
        ''                // Vacío
      ];

      for (const phone of invalidPhones) {
        const userData = { name: 'Test', phone, email: 'test@test.com' };
        await expect(usersService.createUser(userData))
          .rejects.toThrow('Formato de teléfono inválido');
      }
    });

    test('❌ Debe validar formato de email', async () => {
      const invalidEmails = [
        'notanemail',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
        ''
      ];

      for (const email of invalidEmails) {
        const userData = { name: 'Test', phone: '+50412345678', email };
        await expect(usersService.createUser(userData))
          .rejects.toThrow('Formato de email inválido');
      }
    });

    test('❌ Debe validar nombre requerido', async () => {
      const invalidNames = ['', '   ', null, undefined];

      for (const name of invalidNames) {
        const userData = { name, phone: '+50412345678', email: 'test@test.com' };
        await expect(usersService.createUser(userData))
          .rejects.toThrow('Nombre es requerido');
      }
    });
  });

  describe('getUserById', () => {
    test('✅ Debe obtener usuario por ID', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        name: 'Juan Pérez',
        phone: '+50412345678',
        email: 'juan@test.com',
        is_active: 1
      };
      runQuery.mockResolvedValue([mockUser]);

      // Act
      const result = await usersService.getUserById(1);

      // Assert
      expect(result).toEqual(mockUser);
      expect(runQuery).toHaveBeenCalledWith(
        'SELECT * FROM Users WHERE user_id = ?',
        [1]
      );
    });

    test('❌ Debe retornar null si usuario no existe', async () => {
      // Arrange
      runQuery.mockResolvedValue([]);

      // Act
      const result = await usersService.getUserById(999);

      // Assert
      expect(result).toBeNull();
    });

    test('⚠️ Debe validar ID como número', async () => {
      const invalidIds = ['abc', null, undefined, -1, 0];

      for (const id of invalidIds) {
        await expect(usersService.getUserById(id))
          .rejects.toThrow('ID de usuario inválido');
      }
    });
  });

  describe('getUserByPhone', () => {
    test('✅ Debe obtener usuario por teléfono', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        name: 'Juan Pérez',
        phone: '+50412345678'
      };
      runQuery.mockResolvedValue([mockUser]);

      // Act
      const result = await usersService.getUserByPhone('+50412345678');

      // Assert
      expect(result).toEqual(mockUser);
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE phone = ?'),
        ['+50412345678']
      );
    });

    test('⚠️ Debe normalizar formato de teléfono', async () => {
      // Arrange
      const mockUser = { user_id: 1, phone: '+50412345678' };
      runQuery.mockResolvedValue([mockUser]);

      // Act - Diferentes formatos del mismo número
      const formats = [
        '50412345678',
        '+504 1234 5678',
        '(504) 1234-5678',
        '+504-1234-5678'
      ];

      for (const format of formats) {
        await usersService.getUserByPhone(format);
        expect(runQuery).toHaveBeenCalledWith(
          expect.any(String),
          ['+50412345678'] // Normalizado
        );
      }
    });
  });

  describe('updateUser', () => {
    test('✅ Debe actualizar usuario correctamente', async () => {
      // Arrange
      const updateData = {
        name: 'Juan Carlos Pérez',
        email: 'juan.carlos@test.com'
      };
      
      runQuery.mockResolvedValue([{ user_id: 1, name: 'Juan Pérez' }]); // User exists
      runExecute.mockResolvedValue({ changes: 1 });

      // Act
      const result = await usersService.updateUser(1, updateData);

      // Assert
      expect(result).toBe(true);
      expect(runExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Users SET'),
        expect.arrayContaining(['Juan Carlos Pérez', 'juan.carlos@test.com', 1])
      );
    });

    test('❌ Debe fallar si usuario no existe', async () => {
      // Arrange
      runQuery.mockResolvedValue([]); // User doesn't exist

      // Act & Assert
      await expect(usersService.updateUser(999, { name: 'Test' }))
        .rejects.toThrow('Usuario no encontrado');
    });

    test('⚠️ Debe validar datos de actualización', async () => {
      // Arrange
      runQuery.mockResolvedValue([{ user_id: 1 }]); // User exists

      const invalidUpdates = [
        { email: 'invalid-email' },
        { phone: '123' },
        { name: '' }
      ];

      for (const updateData of invalidUpdates) {
        await expect(usersService.updateUser(1, updateData))
          .rejects.toThrow();
      }
    });
  });

  describe('searchUsers', () => {
    test('✅ Debe buscar usuarios por término', async () => {
      // Arrange
      const mockUsers = [
        { user_id: 1, name: 'Juan Pérez', phone: '+50412345678' },
        { user_id: 2, name: 'Juan Carlos', phone: '+50498765432' }
      ];
      runQuery.mockResolvedValue(mockUsers);

      // Act
      const result = await usersService.searchUsers('Juan');

      // Assert
      expect(result).toEqual(mockUsers);
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (name LIKE ? OR phone LIKE ? OR email LIKE ?)'),
        ['%Juan%', '%Juan%', '%Juan%']
      );
    });

    test('⚠️ Debe manejar términos de búsqueda vacíos', async () => {
      // Arrange
      runQuery.mockResolvedValue([]);

      // Act
      const result = await usersService.searchUsers('');

      // Assert
      expect(result).toEqual([]);
    });

    test('⚠️ Debe limitar resultados de búsqueda', async () => {
      // Arrange
      const manyUsers = Array(100).fill().map((_, i) => ({ user_id: i + 1, name: `User ${i}` }));
      runQuery.mockResolvedValue(manyUsers);

      // Act
      const result = await usersService.searchUsers('User', { limit: 10 });

      // Assert
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        expect.arrayContaining([10])
      );
    });
  });

  describe('getUserStats', () => {
    test('✅ Debe obtener estadísticas de usuario', async () => {
      // Arrange
      const mockStats = [
        { total_reservations: 5, active_reservations: 2, total_spent: 2500.00 }
      ];
      runQuery.mockResolvedValue(mockStats);

      // Act
      const result = await usersService.getUserStats(1);

      // Assert
      expect(result).toEqual(mockStats[0]);
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(r.id) as total_reservations'),
        [1]
      );
    });

    test('❌ Debe manejar usuario sin reservas', async () => {
      // Arrange
      runQuery.mockResolvedValue([{ 
        total_reservations: 0, 
        active_reservations: 0, 
        total_spent: 0 
      }]);

      // Act
      const result = await usersService.getUserStats(999);

      // Assert
      expect(result.total_reservations).toBe(0);
    });
  });

  describe('deactivateUser', () => {
    test('✅ Debe desactivar usuario correctamente', async () => {
      // Arrange
      runQuery.mockResolvedValue([{ user_id: 1, is_active: 1 }]); // Active user exists
      runExecute.mockResolvedValue({ changes: 1 });

      // Act
      const result = await usersService.deactivateUser(1, 'Inactivo por solicitud');

      // Assert
      expect(result).toBe(true);
      expect(runExecute).toHaveBeenCalledWith(
        'UPDATE Users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [1]
      );
    });

    test('❌ Debe rechazar desactivación de usuario con reservas activas', async () => {
      // Arrange
      runQuery
        .mockResolvedValueOnce([{ user_id: 1, is_active: 1 }]) // User exists
        .mockResolvedValueOnce([{ id: 123, status: 'confirmed' }]); // Has active reservation

      // Act & Assert
      await expect(usersService.deactivateUser(1))
        .rejects.toThrow('No se puede desactivar usuario con reservas activas');
    });
  });

  describe('validateUserData', () => {
    test('✅ Debe validar datos correctos', () => {
      const validUsers = [
        {
          name: 'Juan Pérez',
          phone: '+50412345678',
          email: 'juan@test.com'
        },
        {
          name: 'María García López',
          phone: '+50498765432',
          email: 'maria.garcia@example.com'
        }
      ];

      validUsers.forEach(user => {
        expect(() => usersService.validateUserData(user)).not.toThrow();
      });
    });

    test('❌ Debe rechazar datos inválidos', () => {
      const invalidUsers = [
        { name: '', phone: '+50412345678', email: 'test@test.com' },
        { name: 'Test', phone: 'invalid', email: 'test@test.com' },
        { name: 'Test', phone: '+50412345678', email: 'invalid' }
      ];

      invalidUsers.forEach(user => {
        expect(() => usersService.validateUserData(user)).toThrow();
      });
    });
  });

  describe('Edge Cases and Security', () => {
    test('⚠️ Debe manejar inputs maliciosos', async () => {
      const maliciousInputs = [
        "'; DROP TABLE Users; --",
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'test\x00bypass'
      ];

      runQuery.mockResolvedValue([]);

      for (const input of maliciousInputs) {
        await expect(usersService.searchUsers(input))
          .not.toThrow(); // Debe sanitizar, no fallar
        
        // Verificar que el input fue sanitizado
        expect(runQuery).toHaveBeenCalledWith(
          expect.any(String),
          expect.not.arrayContaining([input]) // Input original no debe aparecer
        );
      }
    });

    test('⚠️ Debe manejar concurrencia en creación', async () => {
      // Arrange - Simular race condition
      const userData = {
        name: 'Concurrent User',
        phone: '+50412345678',
        email: 'concurrent@test.com'
      };

      // Primera llamada: no existe usuario
      // Segunda llamada: usuario ya existe (creado por thread paralelo)
      runQuery
        .mockResolvedValueOnce([]) // No exists
        .mockResolvedValueOnce([{ user_id: 999, phone: '+50412345678' }]); // Exists

      runExecute.mockRejectedValue(new Error('UNIQUE constraint failed'));

      // Act & Assert
      await expect(usersService.createUser(userData))
        .rejects.toThrow('UNIQUE constraint failed');
    });

    test('⚠️ Debe manejar límites de datos', () => {
      const extremeCases = [
        {
          name: 'A'.repeat(256), // Nombre muy largo
          phone: '+50412345678',
          email: 'test@test.com'
        },
        {
          name: 'Test User',
          phone: '+50412345678',
          email: 'a'.repeat(200) + '@' + 'b'.repeat(200) + '.com' // Email muy largo
        }
      ];

      extremeCases.forEach(user => {
        expect(() => usersService.validateUserData(user)).toThrow();
      });
    });

    test('⚠️ Debe manejar errores de base de datos', async () => {
      // Arrange
      runQuery.mockRejectedValue(new Error('Database connection lost'));

      // Act & Assert
      await expect(usersService.getUserById(1))
        .rejects.toThrow('Database connection lost');
    });
  });
});
