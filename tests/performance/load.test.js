/**
 * Tests de Performance y Load Testing
 * Bot VJ - Sistema de Reservas Villas Julie
 */

const { runQuery, runExecute } = require('../../db');
const cacheService = require('../../services/cacheService');
const cabinsDataService = require('../../services/cabinsDataService');

describe('🚀 Performance & Load Tests', () => {
  
  describe('📊 Database Performance', () => {
    test('Complex queries should execute under 50ms', async () => {
      const queries = [
        'SELECT COUNT(*) FROM Reservations WHERE start_date >= date("now")',
        'SELECT * FROM Cabins WHERE capacity >= 4 ORDER BY price',
        `SELECT r.*, c.name, u.name as user_name 
         FROM Reservations r 
         JOIN Cabins c ON r.cabin_id = c.cabin_id 
         JOIN Users u ON r.user_id = u.user_id 
         WHERE r.status = 'confirmada' LIMIT 10`,
        'SELECT cabin_id, COUNT(*) as bookings FROM Reservations GROUP BY cabin_id'
      ];

      for (const query of queries) {
        const start = Date.now();
        await runQuery(query);
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(50);
      }
    });

    test('Bulk operations should be efficient', async () => {
      const start = Date.now();
      
      // Simular inserción de múltiples registros
      const insertPromises = Array(50).fill().map((_, i) => 
        runQuery(`
          SELECT * FROM Cabins 
          WHERE capacity >= ${Math.floor(Math.random() * 8) + 1} 
          LIMIT 1
        `)
      );
      
      await Promise.all(insertPromises);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // 1 segundo para 50 consultas
    });

    test('Index usage should be optimal', async () => {
      // Verificar que los índices se están usando
      const explain = await runQuery(`
        EXPLAIN QUERY PLAN 
        SELECT * FROM Reservations 
        WHERE start_date >= '2025-08-01' 
        AND status = 'confirmada'
      `);
      
      const usesIndex = explain.some(row => 
        row.detail && row.detail.includes('INDEX')
      );
      
      expect(usesIndex).toBe(true);
    });
  });

  describe('🗄️ Cache Performance', () => {
    test('Cache hit ratio should be high under load', async () => {
      // Limpiar cache para test limpio
      cacheService.clear();
      
      // Primera ronda - llenar cache
      await Promise.all(Array(20).fill().map(() => 
        cabinsDataService.getAllCabins()
      ));
      
      // Segunda ronda - debería venir del cache
      const promises = Array(50).fill().map(() => 
        cabinsDataService.getAllCabins()
      );
      
      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;
      
      const stats = cacheService.getStats();
      
      expect(stats.hitRatio).toBeGreaterThan(80); // 80% hit ratio mínimo
      expect(duration).toBeLessThan(500); // 500ms para 50 llamadas
    });

    test('Cache memory usage should be reasonable', async () => {
      // Llenar cache con datos
      for (let i = 0; i < 100; i++) {
        cacheService.set(`test:key:${i}`, {
          data: `test data ${i}`,
          timestamp: Date.now(),
          complex: { nested: { value: i * 2 } }
        }, 30000);
      }
      
      const stats = cacheService.getStats();
      const memoryUsage = process.memoryUsage();
      
      expect(stats.size).toBe(100);
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // < 100MB
    });

    test('Cache TTL should work under concurrent access', async () => {
      const key = 'concurrent:test';
      const shortTTL = 100; // 100ms
      
      // Set con TTL corto
      cacheService.set(key, { value: 'test' }, shortTTL);
      
      // Múltiples accesos concurrentes
      const accessPromises = Array(20).fill().map(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return cacheService.get(key);
      });
      
      const results = await Promise.all(accessPromises);
      
      // Esperar expiración
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const expiredValue = cacheService.get(key);
      expect(expiredValue).toBeNull();
    });
  });

  describe('🔄 Concurrent Operations', () => {
    test('Should handle concurrent database operations', async () => {
      const operations = [];
      
      // Mix de operaciones concurrentes
      for (let i = 0; i < 20; i++) {
        operations.push(runQuery('SELECT COUNT(*) FROM Users'));
        operations.push(runQuery('SELECT COUNT(*) FROM Cabins'));
        operations.push(runQuery('SELECT COUNT(*) FROM Reservations'));
      }
      
      const start = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(60);
      expect(duration).toBeLessThan(2000); // 2 segundos para 60 operaciones
      expect(results.every(result => result !== undefined)).toBe(true);
    });

    test('Should handle concurrent cache operations', async () => {
      const operations = [];
      
      // Mix de operaciones de cache concurrentes
      for (let i = 0; i < 50; i++) {
        operations.push(
          cacheService.wrap(
            `concurrent:${i}`,
            () => Promise.resolve({ data: `value ${i}` }),
            1000
          )
        );
      }
      
      const start = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // 1 segundo
      expect(results.every(result => result.data)).toBe(true);
    });
  });

  describe('📈 Scalability Tests', () => {
    test('System should handle 100 concurrent users simulation', async () => {
      const userOperations = [];
      
      // Simular 100 usuarios haciendo operaciones típicas
      for (let i = 0; i < 100; i++) {
        userOperations.push(async () => {
          // Operación típica de usuario
          await cabinsDataService.getAllCabins();
          await runQuery('SELECT COUNT(*) FROM Reservations WHERE start_date >= date("now")');
          return { userId: i, completed: true };
        });
      }
      
      const start = Date.now();
      const results = await Promise.all(userOperations.map(op => op()));
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // 5 segundos para 100 usuarios
      expect(results.every(result => result.completed)).toBe(true);
    });

    test('Memory usage should remain stable under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generar carga de trabajo
      const workload = Array(200).fill().map(async (_, i) => {
        await cabinsDataService.getAllCabins();
        await runQuery(`SELECT * FROM Cabins WHERE capacity >= ${(i % 8) + 1}`);
        
        // Operaciones de cache
        cacheService.set(`load:test:${i}`, { 
          data: `heavy data ${i}`.repeat(10),
          index: i 
        }, 5000);
        
        return cacheService.get(`load:test:${i}`);
      });
      
      await Promise.all(workload);
      
      // Forzar garbage collection si está disponible
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // El aumento de memoria no debería ser excesivo
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
    });

    test('Response times should degrade gracefully under load', async () => {
      const responseTimes = [];
      
      // Test con cargas incrementales
      for (const load of [10, 25, 50, 100]) {
        const operations = Array(load).fill().map(async () => {
          const start = Date.now();
          await cabinsDataService.getAllCabins();
          return Date.now() - start;
        });
        
        const times = await Promise.all(operations);
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        
        responseTimes.push({ load, avgTime });
      }
      
      // Verificar que la degradación sea razonable
      for (let i = 1; i < responseTimes.length; i++) {
        const current = responseTimes[i];
        const previous = responseTimes[i - 1];
        
        // El tiempo no debería incrementar más del 200%
        expect(current.avgTime).toBeLessThan(previous.avgTime * 2);
      }
    });
  });
});
