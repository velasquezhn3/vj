#!/usr/bin/env node
/**
 * Servidor de Dashboard de Monitoring
 * Bot VJ - Sistema de Reservas Villas Julie
 */

const MonitoringDashboard = require('./services/monitoringDashboard');
const logger = require('./config/logger');

// Configuración
const PORT = process.env.MONITORING_PORT || 4000;

// Crear e iniciar dashboard
const dashboard = new MonitoringDashboard();

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando dashboard de monitoring...');
  dashboard.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando dashboard de monitoring...');
  dashboard.stop();
  process.exit(0);
});

// Iniciar dashboard
dashboard.start(PORT);

logger.info('Dashboard de monitoring iniciado', { 
  port: PORT,
  url: `http://localhost:${PORT}`
});
