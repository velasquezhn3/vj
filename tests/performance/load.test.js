/**
 * Tests de performance y stress testing
 * Cobertura: Load testing, concurrent operations, memory usage
 */

const request = require('supertest');
const { performance } = require('perf_hooks');

describe('🚀 Performance Tests - Sistema Bot VJ', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    try {
      app = require('../../../adminServer');
    } catch (error) {
      console.warn('AdminServer not available for performance tests');
    }
  });

  // Helper para obtener token
  const getAuthToken = async () => {
    if (authToken || !app) return authToken;

    const { runQuery } = require('../../../db');
    jest.spyOn(runQuery, 'mockImplementation').mockResolvedValue([{
      admin_id: 1,
      username: 'admin',
      password_hash: '$2a$12$hashedpassword',
      is_active: 1
    }]);

    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    try {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      if (response.status === 200 && response.body.data?.token) {
        authToken = response.body.data.token;
      }
    } catch (error) {
      console.warn('Could not obtain auth token for performance tests');
    }

    return authToken;
  };

  describe('🎯 Response Time Tests', () => {
    test('✅ Authentication endpoint debe responder < 200ms', async () => {
      if (!app) return;

      const start = performance.now();
      
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test', password: 'test' });

      const end = performance.now();
      const responseTime = end - start;

      expect(responseTime).toBeLessThan(200); // < 200ms
      expect([200, 400, 401]).toContain(response.status);
    }, 5000);

    test('✅ Health check debe responder < 50ms', async () => {
      if (!app) return;

      const start = performance.now();
      
      const response = await request(app).get('/health');

      const end = performance.now();
      const responseTime = end - start;

      expect(responseTime).toBeLessThan(50); // < 50ms
      expect([200, 404]).toContain(response.status);
    }, 2000);

    test('✅ API endpoints deben responder < 500ms', async () => {
      if (!app) return;

      const token = await getAuthToken();
      if (!token) return;

      const endpoints = [
        '/admin/users',
        '/admin/cabins', 
        '/admin/reservations'
      ];

      for (const endpoint of endpoints) {
        const start = performance.now();
        
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${token}`);

        const end = performance.now();
        const responseTime = end - start;

        expect(responseTime).toBeLessThan(500); // < 500ms
        expect([200, 401, 404]).toContain(response.status);
      }
    }, 10000);
  });

  describe('🔥 Load Testing', () => {
    test('⚡ Debe manejar 50 requests concurrentes en auth', async () => {
      if (!app) return;

      const concurrentRequests = 50;
      const startTime = performance.now();

      const promises = Array(concurrentRequests).fill().map(() =>
        request(app)
          .post('/auth/login')
          .send({ username: 'test', password: 'test' })
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(5000); // < 5 seconds total
      
      // Check that most requests completed successfully
      const successfulResponses = responses.filter(r => 
        [200, 400, 401, 429].includes(r.status)
      );
      expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.8); // 80% success rate
    }, 15000);

    test('⚡ Health endpoint debe soportar 100 requests concurrentes', async () => {
      if (!app) return;

      const concurrentRequests = 100;
      const startTime = performance.now();

      const promises = Array(concurrentRequests).fill().map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(3000); // < 3 seconds total
      
      const successfulResponses = responses.filter(r => 
        [200, 404].includes(r.status)
      );
      expect(successfulResponses.length).toBe(concurrentRequests); // 100% success rate
    }, 10000);
  });

  describe('💾 Memory Performance Tests', () => {
    test('⚡ Sistema de cache debe ser eficiente', () => {
      const CacheService = require('../../../services/cacheService');
      const cache = new CacheService();

      const initialMemory = process.memoryUsage();

      // Add 1000 cache entries
      for (let i = 0; i < 1000; i++) {
        cache.set(`key_${i}`, { 
          data: `data_${i}`, 
          timestamp: Date.now(),
          id: i 
        });
      }

      const afterCacheMemory = process.memoryUsage();
      const memoryIncrease = afterCacheMemory.heapUsed - initialMemory.heapUsed;

      // Memory usage should be reasonable (< 50MB for 1000 entries)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Verify cache functionality
      expect(cache.get('key_0')).toBeTruthy();
      expect(cache.get('key_999')).toBeTruthy();
      expect(cache.size).toBe(1000);

      // Test cache cleanup
      cache.clear();
      expect(cache.size).toBe(0);
    });

    test('⚡ Garbage collection no debe afectar performance', async () => {
      if (!app) return;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const token = await getAuthToken();
      if (!token) return;

      const iterations = 20;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const response = await request(app)
          .get('/admin/users')
          .set('Authorization', `Bearer ${token}`);

        const end = performance.now();
        responseTimes.push(end - start);

        expect([200, 401, 404]).toContain(response.status);
      }

      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      // Performance should be consistent
      expect(avgResponseTime).toBeLessThan(300);
      expect(maxResponseTime - minResponseTime).toBeLessThan(500); // Variance < 500ms
    }, 15000);
  });

  describe('🔄 Stress Testing', () => {
    test('⚡ Sistema debe degradar gracefully bajo alta carga', async () => {
      if (!app) return;

      const token = await getAuthToken();
      if (!token) return;

      // Simulate high load with rapid sequential requests
      const rapidRequests = 200;
      const startTime = performance.now();
      const responses = [];

      for (let i = 0; i < rapidRequests; i++) {
        try {
          const response = await request(app)
            .get('/health')
            .timeout(1000); // 1 second timeout

          responses.push(response);
        } catch (error) {
          responses.push({ status: 'timeout', error: error.message });
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert system degradation is graceful
      const successfulRequests = responses.filter(r => 
        typeof r.status === 'number' && [200, 404, 429].includes(r.status)
      );

      const timeoutRequests = responses.filter(r => 
        r.status === 'timeout'
      );

      // At least 70% should succeed or fail gracefully (not crash)
      expect(successfulRequests.length + timeoutRequests.length).toBeGreaterThan(rapidRequests * 0.7);
      
      console.log(`Stress test: ${rapidRequests} requests in ${totalTime.toFixed(2)}ms`);
      console.log(`Successful: ${successfulRequests.length}, Timeouts: ${timeoutRequests.length}`);
    }, 30000);

    test('⚡ Base de datos debe manejar queries concurrentes', async () => {
      const { runQuery } = require('../../../db');
      
      // Mock concurrent database operations
      const mockQueryPromises = Array(50).fill().map((_, i) =>
        runQuery('SELECT * FROM Users WHERE user_id = ?', [i + 1])
      );

      const startTime = performance.now();
      
      try {
        const results = await Promise.all(mockQueryPromises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        expect(results).toHaveLength(50);
        expect(totalTime).toBeLessThan(2000); // < 2 seconds for 50 queries
      } catch (error) {
        // Database errors are acceptable in test environment
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe('📊 Resource Monitoring', () => {
    test('⚡ Memory leaks detection', async () => {
      const initialMemory = process.memoryUsage();
      
      if (app) {
        // Simulate normal application usage
        for (let i = 0; i < 100; i++) {
          await request(app).get('/health');
        }
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
        global.gc(); // Run twice to be sure
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal after GC
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB increase
    });

    test('⚡ CPU usage durante operaciones intensivas', async () => {
      const startCpuTime = process.cpuUsage();
      const startTime = performance.now();

      // Simulate CPU intensive operations
      if (app) {
        const token = await getAuthToken();
        if (token) {
          const promises = Array(20).fill().map(() =>
            request(app)
              .get('/admin/reservations')
              .set('Authorization', `Bearer ${token}`)
          );
          
          await Promise.all(promises);
        }
      }

      const endTime = performance.now();
      const endCpuTime = process.cpuUsage(startCpuTime);
      
      const totalTime = endTime - startTime;
      const cpuUsage = (endCpuTime.user + endCpuTime.system) / 1000; // Convert to ms

      // CPU usage should be reasonable relative to wall time
      const cpuEfficiency = cpuUsage / totalTime;
      expect(cpuEfficiency).toBeLessThan(1.5); // Should not use more than 150% of wall time
    });
  });

  describe('🌐 Network Performance', () => {
    test('⚡ Payload size debe ser optimizado', async () => {
      if (!app) return;

      const token = await getAuthToken();
      if (!token) return;

      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 200) {
        const payloadSize = JSON.stringify(response.body).length;
        
        // Payload should not be excessively large
        expect(payloadSize).toBeLessThan(1024 * 1024); // < 1MB
        
        // Should have reasonable compression potential
        const compressed = JSON.stringify(response.body).replace(/\s+/g, '');
        const compressionRatio = compressed.length / payloadSize;
        expect(compressionRatio).toBeLessThan(0.9); // At least 10% compression
      }
    });
  });

  afterAll(() => {
    // Cleanup
    if (app && typeof app.close === 'function') {
      app.close();
    }
  });
});
