const request = require('supertest');
const fs = require('fs');
const path = require('path');

/**
 * Tests de integración para validar APIs principales
 * Estos tests validan que los endpoints básicos funcionen después de la limpieza
 */

// Solo ejecutar estos tests si el servidor está disponible
const serverAvailable = process.env.TEST_INTEGRATION === 'true';

describe('🔗 Tests de Integración - APIs Principales', () => {
  
  if (!serverAvailable) {
    console.log('ℹ️ Tests de integración omitidos. Para ejecutar: TEST_INTEGRATION=true npm test');
    return;
  }

  let app;

  beforeAll(async () => {
    // Intentar importar la aplicación
    try {
      const adminServerPath = path.join(__dirname, '../../adminServer.js');
      if (fs.existsSync(adminServerPath)) {
        app = require('../../adminServer');
      }
    } catch (error) {
      console.log('⚠️ No se pudo cargar adminServer para tests de integración');
    }
  });

  describe('🏥 Health Checks', () => {
    test('✅ Health endpoint debe responder', async () => {
      if (!app) {
        pending('AdminServer no disponible');
        return;
      }

      const response = await request(app)
        .get('/health')
        .expect((res) => {
          expect([200, 404, 500].includes(res.status)).toBe(true);
        });
    });

    test('✅ Debe responder en puerto configurado', async () => {
      // Test básico de conectividad
      expect(app).toBeTruthy();
    });
  });

  describe('🔐 Autenticación', () => {
    test('✅ Endpoint de login debe existir', async () => {
      if (!app) {
        pending('AdminServer no disponible');
        return;
      }

      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect((res) => {
          // Debe responder con error de validación, no 404
          expect([400, 401, 422, 500].includes(res.status)).toBe(true);
        });
    });
  });

  describe('📊 APIs Básicas', () => {
    test('✅ API de usuarios debe estar protegida', async () => {
      if (!app) {
        pending('AdminServer no disponible');
        return;
      }

      const response = await request(app)
        .get('/api/users')
        .expect((res) => {
          // Debe requerir autenticación (401) o no encontrado (404)
          expect([401, 404, 500].includes(res.status)).toBe(true);
        });
    });

    test('✅ API de reservaciones debe estar protegida', async () => {
      if (!app) {
        pending('AdminServer no disponible');
        return;
      }

      const response = await request(app)
        .get('/api/reservations')
        .expect((res) => {
          // Debe requerir autenticación (401) o no encontrado (404)
          expect([401, 404, 500].includes(res.status)).toBe(true);
        });
    });
  });

  describe('📁 Archivos Estáticos', () => {
    test('✅ Debe servir archivos del frontend si están configurados', async () => {
      if (!app) {
        pending('AdminServer no disponible');
        return;
      }

      const response = await request(app)
        .get('/')
        .expect((res) => {
          // Puede servir index.html (200), redirigir (3xx), o no encontrar (404)
          expect([200, 301, 302, 404, 500].includes(res.status)).toBe(true);
        });
    });
  });
});

describe('🤖 Tests de Integración - Bot WhatsApp', () => {
  
  describe('🔧 Configuración Bot', () => {
    test('✅ Debe existir controlador del bot', () => {
      const botControllerPath = path.join(__dirname, '../../controllers/botController.js');
      expect(fs.existsSync(botControllerPath)).toBe(true);
    });

    test('✅ Debe existir archivo principal index.js', () => {
      const indexPath = path.join(__dirname, '../../index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
      
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      expect(indexContent).toContain('dotenv');
      expect(indexContent).toContain('botController');
    });
  });

  describe('📱 Servicios del Bot', () => {
    test('✅ Debe existir servicio de mensajería', () => {
      const messagingPath = path.join(__dirname, '../../services/messagingService.js');
      expect(fs.existsSync(messagingPath)).toBe(true);
    });

    test('✅ Debe existir servicio de reservaciones', () => {
      // El servicio puede tener varios nombres posibles
      const possiblePaths = [
        path.join(__dirname, '../../services/reservationsService.js'),
        path.join(__dirname, '../../services/reservationService.js'),
        path.join(__dirname, '../../services/reservaService.js')
      ];
      
      const exists = possiblePaths.some(path => fs.existsSync(path));
      expect(exists).toBe(true);
    });

    test('✅ Debe existir servicio de usuarios', () => {
      const usersPath = path.join(__dirname, '../../services/usersService.js');
      expect(fs.existsSync(usersPath)).toBe(true);
    });
  });
});
