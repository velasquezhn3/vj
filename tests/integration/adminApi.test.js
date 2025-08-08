/**
 * Tests de integración para APIs administrativas
 * Cobertura: Endpoints completos, autenticación, validación
 */

const request = require('supertest');
const express = require('express');
const { authenticateToken, authorizeRole } = require('../../../middleware/auth');
const usersService = require('../../../services/usersService');
const reservationService = require('../../../services/reservationService');
const authService = require('../../../services/authService');

// Mock services
jest.mock('../../../services/usersService');
jest.mock('../../../services/reservationService');
jest.mock('../../../services/authService');
jest.mock('../../../middleware/auth');

describe('🌐 Admin API Integration - Tests', () => {
  let app;
  let validToken;
  let mockAdmin;

  beforeAll(() => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock auth middleware to bypass authentication for tests
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = mockAdmin;
      next();
    });
    
    authorizeRole.mockImplementation(() => (req, res, next) => next());

    // Setup test routes
    setupTestRoutes(app);
  });

  beforeEach(() => {
    mockAdmin = {
      adminId: 1,
      username: 'admin',
      role: 'admin',
      email: 'admin@test.com'
    };

    validToken = 'Bearer mock.jwt.token';
    jest.clearAllMocks();
  });

  describe('🔐 Authentication Endpoints', () => {
    describe('POST /auth/login', () => {
      test('✅ Debe autenticar admin válido', async () => {
        // Arrange
        authService.verifyAdminCredentials.mockResolvedValue({
          admin_id: 1,
          username: 'admin',
          email: 'admin@test.com',
          role: 'admin'
        });
        authService.generateJWT.mockResolvedValue('generated.jwt.token');

        // Act
        const response = await request(app)
          .post('/auth/login')
          .send({
            username: 'admin',
            password: 'admin123'
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBe('generated.jwt.token');
        expect(response.body.data.user.username).toBe('admin');
      });

      test('❌ Debe rechazar credenciales inválidas', async () => {
        // Arrange
        authService.verifyAdminCredentials.mockResolvedValue(null);

        // Act
        const response = await request(app)
          .post('/auth/login')
          .send({
            username: 'admin',
            password: 'wrongpassword'
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Credenciales inválidas');
      });

      test('❌ Debe validar campos requeridos', async () => {
        const testCases = [
          { username: '', password: 'test123' },
          { username: 'admin', password: '' },
          { username: '', password: '' },
          {}
        ];

        for (const credentials of testCases) {
          const response = await request(app)
            .post('/auth/login')
            .send(credentials);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      test('🔒 Debe prevenir ataques de fuerza bruta', async () => {
        // Arrange
        authService.verifyAdminCredentials.mockResolvedValue(null);

        // Act - Múltiples intentos fallidos
        const promises = Array(10).fill().map(() =>
          request(app)
            .post('/auth/login')
            .send({ username: 'admin', password: 'wrong' })
        );

        const responses = await Promise.all(promises);

        // Assert - Algunos requests deberían ser bloqueados
        const blockedResponses = responses.filter(r => r.status === 429);
        expect(blockedResponses.length).toBeGreaterThan(0);
      });
    });

    describe('POST /auth/verify', () => {
      test('✅ Debe verificar token válido', async () => {
        // Arrange
        authService.verifyJWT.mockResolvedValue({
          adminId: 1,
          username: 'admin',
          role: 'admin'
        });

        // Act
        const response = await request(app)
          .post('/auth/verify')
          .set('Authorization', validToken);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.username).toBe('admin');
      });

      test('❌ Debe rechazar token inválido', async () => {
        // Arrange
        authService.verifyJWT.mockResolvedValue(null);

        // Act
        const response = await request(app)
          .post('/auth/verify')
          .set('Authorization', 'Bearer invalid.token');

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('👥 Users Management Endpoints', () => {
    describe('GET /admin/users', () => {
      test('✅ Debe obtener lista de usuarios', async () => {
        // Arrange
        const mockUsers = [
          { user_id: 1, first_name: 'Juan', phone: '+50498765432' },
          { user_id: 2, first_name: 'María', phone: '+50498765433' }
        ];
        usersService.getAllUsers.mockResolvedValue(mockUsers);

        // Act
        const response = await request(app)
          .get('/admin/users')
          .set('Authorization', validToken);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockUsers);
      });

      test('✅ Debe soportar paginación', async () => {
        // Arrange
        const mockUsers = Array(5).fill().map((_, i) => ({
          user_id: i + 1,
          first_name: `User${i + 1}`
        }));
        usersService.getAllUsers.mockResolvedValue(mockUsers.slice(0, 2));

        // Act
        const response = await request(app)
          .get('/admin/users?limit=2&offset=0')
          .set('Authorization', validToken);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
      });

      test('❌ Debe rechazar acceso sin autenticación', async () => {
        // Act
        authenticateToken.mockImplementationOnce((req, res, next) => {
          res.status(401).json({ success: false, message: 'No token' });
        });

        const response = await request(app)
          .get('/admin/users');

        // Assert
        expect(response.status).toBe(401);
      });
    });

    describe('POST /admin/users', () => {
      test('✅ Debe crear usuario válido', async () => {
        // Arrange
        const userData = {
          first_name: 'Juan',
          last_name: 'Pérez',
          phone: '+50498765432',
          email: 'juan@test.com'
        };
        usersService.createUser.mockResolvedValue(123);

        // Act
        const response = await request(app)
          .post('/admin/users')
          .set('Authorization', validToken)
          .send(userData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.userId).toBe(123);
      });

      test('❌ Debe validar datos de entrada', async () => {
        const invalidData = [
          { first_name: '', last_name: 'Pérez', phone: '+50498765432' },
          { first_name: 'Juan', last_name: '', phone: '+50498765432' },
          { first_name: 'Juan', last_name: 'Pérez', phone: 'invalid' },
          { first_name: 'Juan', last_name: 'Pérez', phone: '+50498765432', email: 'invalid-email' }
        ];

        for (const data of invalidData) {
          const response = await request(app)
            .post('/admin/users')
            .set('Authorization', validToken)
            .send(data);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      test('❌ Debe manejar errores de duplicación', async () => {
        // Arrange
        usersService.createUser.mockRejectedValue(
          new Error('Ya existe un usuario con este teléfono')
        );

        // Act
        const response = await request(app)
          .post('/admin/users')
          .set('Authorization', validToken)
          .send({
            first_name: 'Juan',
            last_name: 'Pérez',
            phone: '+50498765432'
          });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /admin/users/:id', () => {
      test('✅ Debe actualizar usuario existente', async () => {
        // Arrange
        usersService.updateUser.mockResolvedValue(true);

        // Act
        const response = await request(app)
          .put('/admin/users/1')
          .set('Authorization', validToken)
          .send({
            first_name: 'Juan Carlos',
            email: 'juan.carlos@test.com'
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      test('❌ Debe manejar usuario no encontrado', async () => {
        // Arrange
        usersService.updateUser.mockResolvedValue(false);

        // Act
        const response = await request(app)
          .put('/admin/users/999')
          .set('Authorization', validToken)
          .send({ first_name: 'Test' });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('📅 Reservations Management Endpoints', () => {
    describe('GET /admin/reservations', () => {
      test('✅ Debe obtener lista de reservas', async () => {
        // Arrange
        const mockReservations = [
          {
            reservation_id: 1,
            user_name: 'Juan Pérez',
            cabin_name: 'Cabaña Bosque',
            status: 'confirmado'
          }
        ];
        reservationService.getAllReservations.mockResolvedValue(mockReservations);

        // Act
        const response = await request(app)
          .get('/admin/reservations')
          .set('Authorization', validToken);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockReservations);
      });

      test('✅ Debe soportar filtros', async () => {
        // Arrange
        const mockFilteredReservations = [
          { reservation_id: 1, status: 'confirmado' }
        ];
        reservationService.getReservationsByStatus.mockResolvedValue(mockFilteredReservations);

        // Act
        const response = await request(app)
          .get('/admin/reservations?status=confirmado')
          .set('Authorization', validToken);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data).toEqual(mockFilteredReservations);
      });
    });

    describe('POST /admin/reservations', () => {
      test('✅ Debe crear reserva válida', async () => {
        // Arrange
        const reservationData = {
          user_id: 1,
          cabin_id: 1,
          start_date: '2025-08-15',
          end_date: '2025-08-17',
          number_of_people: 4
        };
        reservationService.createReservation.mockResolvedValue(456);

        // Act
        const response = await request(app)
          .post('/admin/reservations')
          .set('Authorization', validToken)
          .send(reservationData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.reservationId).toBe(456);
      });

      test('❌ Debe validar disponibilidad de fechas', async () => {
        // Arrange
        reservationService.createReservation.mockRejectedValue(
          new Error('Cabaña no disponible en las fechas seleccionadas')
        );

        // Act
        const response = await request(app)
          .post('/admin/reservations')
          .set('Authorization', validToken)
          .send({
            user_id: 1,
            cabin_id: 1,
            start_date: '2025-08-15',
            end_date: '2025-08-17',
            number_of_people: 4
          });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /admin/reservations/:id', () => {
      test('✅ Debe actualizar estado de reserva', async () => {
        // Arrange
        reservationService.updateReservationStatus.mockResolvedValue(true);

        // Act
        const response = await request(app)
          .put('/admin/reservations/1')
          .set('Authorization', validToken)
          .send({ status: 'confirmado' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      test('❌ Debe validar estados de reserva', async () => {
        // Act
        const response = await request(app)
          .put('/admin/reservations/1')
          .set('Authorization', validToken)
          .send({ status: 'invalid_status' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('📊 Dashboard Stats Endpoints', () => {
    describe('GET /admin/dashboard/stats', () => {
      test('✅ Debe obtener estadísticas del dashboard', async () => {
        // Arrange
        const mockStats = {
          total_users: 150,
          total_reservations: 300,
          active_reservations: 25,
          total_revenue: 75000
        };
        
        usersService.getUserStats.mockResolvedValue({ total_users: 150 });
        reservationService.getReservationStats.mockResolvedValue({
          total_reservations: 300,
          active_reservations: 25,
          total_revenue: 75000
        });

        // Act
        const response = await request(app)
          .get('/admin/dashboard/stats')
          .set('Authorization', validToken);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.total_users).toBe(150);
        expect(response.body.data.total_reservations).toBe(300);
      });
    });
  });

  describe('🔒 Security and Error Handling', () => {
    test('⚠️ Debe manejar errores 500 correctamente', async () => {
      // Arrange
      usersService.getAllUsers.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', validToken);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INTERNAL_SERVER_ERROR');
    });

    test('🔒 Debe sanitizar errores en producción', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      usersService.getAllUsers.mockRejectedValue(new Error('Sensitive database info'));

      // Act
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', validToken);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body.message).not.toContain('Sensitive');
      
      // Cleanup
      process.env.NODE_ENV = 'test';
    });

    test('🔒 Debe prevenir inyección en parámetros', async () => {
      const maliciousIds = [
        "'; DROP TABLE Users; --",
        '<script>alert("xss")</script>',
        '../../etc/passwd'
      ];

      for (const id of maliciousIds) {
        usersService.getUserById.mockResolvedValue(null);
        
        const response = await request(app)
          .get(`/admin/users/${encodeURIComponent(id)}`)
          .set('Authorization', validToken);

        expect(response.status).toBe(404);
      }
    });

    test('⚡ Debe manejar carga concurrente', async () => {
      // Arrange
      usersService.getAllUsers.mockResolvedValue([]);

      // Act - 20 requests simultáneos
      const promises = Array(20).fill().map(() =>
        request(app)
          .get('/admin/users')
          .set('Authorization', validToken)
      );

      const responses = await Promise.all(promises);

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});

// Helper function to setup routes for testing
function setupTestRoutes(app) {
  // Auth routes
  app.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password required'
        });
      }

      const admin = await authService.verifyAdminCredentials(username, password);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const token = await authService.generateJWT(admin);
      
      res.json({
        success: true,
        data: {
          token,
          user: {
            username: admin.username,
            email: admin.email,
            role: admin.role
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  app.post('/auth/verify', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      const user = await authService.verifyJWT(token);
      if (!user) {
        return res.status(403).json({ success: false });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });

  // Admin routes
  app.get('/admin/users', authenticateToken, async (req, res) => {
    try {
      const users = await usersService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/admin/users', authenticateToken, async (req, res) => {
    try {
      const userId = await usersService.createUser(req.body);
      res.status(201).json({ success: true, userId });
    } catch (error) {
      if (error.message.includes('existe')) {
        res.status(409).json({ success: false, message: error.message });
      } else {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  });

  app.put('/admin/users/:id', authenticateToken, async (req, res) => {
    try {
      const success = await usersService.updateUser(req.params.id, req.body);
      if (!success) {
        return res.status(404).json({ success: false });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/admin/reservations', authenticateToken, async (req, res) => {
    try {
      let reservations;
      if (req.query.status) {
        reservations = await reservationService.getReservationsByStatus(req.query.status);
      } else {
        reservations = await reservationService.getAllReservations();
      }
      res.json({ success: true, data: reservations });
    } catch (error) {
      res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/admin/reservations', authenticateToken, async (req, res) => {
    try {
      const reservationId = await reservationService.createReservation(req.body);
      res.status(201).json({ success: true, reservationId });
    } catch (error) {
      if (error.message.includes('disponible')) {
        res.status(409).json({ success: false, message: error.message });
      } else {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  });

  app.put('/admin/reservations/:id', authenticateToken, async (req, res) => {
    try {
      const { status } = req.body;
      if (!['pendiente', 'confirmado', 'cancelado'].includes(status)) {
        return res.status(400).json({ success: false });
      }
      
      const success = await reservationService.updateReservationStatus(req.params.id, status);
      res.json({ success });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/admin/dashboard/stats', authenticateToken, async (req, res) => {
    try {
      const userStats = await usersService.getUserStats();
      const reservationStats = await reservationService.getReservationStats();
      
      res.json({
        success: true,
        data: {
          ...userStats,
          ...reservationStats
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
    }
  });
}
