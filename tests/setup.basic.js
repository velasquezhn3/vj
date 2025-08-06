/**
 * Setup simple para tests básicos
 * Bot VJ - Sistema de Reservas Villas Julie
 */

// Configurar timeout global para tests
jest.setTimeout(30000);

// Variables globales para tests
global.testConfig = {
  database: {
    timeout: 5000
  },
  api: {
    timeout: 10000
  }
};

console.log('✅ Setup de tests básicos cargado');
