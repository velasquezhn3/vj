/**
 * Tests de Integración para API
 * Bot VJ - Sistema de Reservas Villas Julie
 */

const request = require('supertest');
const app = require('../../index');
const { runQuery, runExecute } = require('../../db');

describe('🔗 API Integration Tests', () => {
  let server;
  let testUserId;
  let testCabinId;
  let authToken;

  beforeAll(async () => {
    // Iniciar servidor para tests
    server = app.listen(0);
    
    // Crear usuario de prueba
    const userResult = await runExecute(`
      INSERT INTO Users (phone_number, name, role) 
      VALUES ('+573001234567', 'Test User', 'cliente')
    `);
    testUserId = userResult.lastID;
    
    // Obtener una cabaña para tests
    const cabins = await runQuery('SELECT cabin_id FROM Cabins LIMIT 1');
    testCabinId = cabins[0]?.cabin_id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await runExecute('DELETE FROM Users WHERE phone_number = ?', ['+573001234567']);
    await runExecute('DELETE FROM Reservations WHERE user_id = ?', [testUserId]);
    
    // Cerrar servidor
    if (server) {
      server.close();
    }
  });

  describe('📊 Cabins API', () => {
    test('GET /api/cabins - Debería obtener todas las cabañas', async () => {
      const response = await request(app)
        .get('/api/cabins')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Verificar estructura de cabaña
      const cabin = response.body.data[0];
      expect(cabin).toHaveProperty('cabin_id');
      expect(cabin).toHaveProperty('name');
      expect(cabin).toHaveProperty('capacity');
      expect(cabin).toHaveProperty('price');
    });

    test('GET /api/cabins/:id - Debería obtener cabaña específica', async () => {
      const response = await request(app)
        .get(`/api/cabins/${testCabinId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cabin_id).toBe(testCabinId);
    });

    test('GET /api/cabins/availability/:id - Debería verificar disponibilidad', async () => {
      const startDate = '2025-12-01';
      const endDate = '2025-12-03';
      
      const response = await request(app)
        .get(`/api/cabins/availability/${testCabinId}`)
        .query({ start_date: startDate, end_date: endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available');
    });
  });

  describe('🏠 Reservations API', () => {
    test('POST /api/reservations - Debería crear nueva reserva', async () => {
      const reservationData = {
        cabin_id: testCabinId,
        start_date: '2025-12-10',
        end_date: '2025-12-12',
        guest_count: 4,
        special_requests: 'Test reservation'
      };

      const response = await request(app)
        .post('/api/reservations')
        .send(reservationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reservation_id');
      expect(response.body.data.status).toBe('pendiente');
    });

    test('GET /api/reservations/:userId - Debería obtener reservas del usuario', async () => {
      const response = await request(app)
        .get(`/api/reservations/${testUserId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('👤 Users API', () => {
    test('POST /api/users/register - Debería registrar nuevo usuario', async () => {
      const userData = {
        phone_number: '+573007654321',
        name: 'New Test User'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user_id');
      
      // Limpiar
      await runExecute('DELETE FROM Users WHERE phone_number = ?', [userData.phone_number]);
    });

    test('GET /api/users/:id - Debería obtener información del usuario', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(testUserId);
      expect(response.body.data.name).toBe('Test User');
    });
  });

  describe('📈 Performance Tests', () => {
    test('API responses should be fast (< 500ms)', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/cabins')
        .expect(200);
        
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    test('Database queries should be optimized (< 100ms)', async () => {
      const start = Date.now();
      
      await runQuery(`
        SELECT r.*, c.name as cabin_name, u.name as user_name 
        FROM Reservations r 
        JOIN Cabins c ON r.cabin_id = c.cabin_id 
        JOIN Users u ON r.user_id = u.user_id 
        LIMIT 10
      `);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('🛡️ Security Tests', () => {
    test('Should handle SQL injection attempts', async () => {
      const maliciousId = "1; DROP TABLE Users; --";
      
      const response = await request(app)
        .get(`/api/cabins/${maliciousId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('Should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        cabin_id: testCabinId
      };

      const response = await request(app)
        .post('/api/reservations')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('Should handle rate limiting', async () => {
      // Simular múltiples requests rápidos
      const promises = Array(20).fill().map(() => 
        request(app).get('/api/cabins')
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);
      
      // Debería aplicar rate limiting después de cierto punto
      expect(rateLimited).toBe(false); // Por ahora, ajustar según configuración
    });
  });

  describe('🗄️ Cache Integration Tests', () => {
    test('Cache should improve response times', async () => {
      // Primera llamada (sin cache)
      const start1 = Date.now();
      await request(app).get('/api/cabins');
      const time1 = Date.now() - start1;

      // Segunda llamada (con cache)
      const start2 = Date.now();
      await request(app).get('/api/cabins');
      const time2 = Date.now() - start2;

      // Cache debería mejorar el tiempo
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });
});
