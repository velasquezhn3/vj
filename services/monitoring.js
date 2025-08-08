/**
 * Sistema de monitoreo avanzado para Bot VJ
 * Detecta problemas antes de que afecten al bot
 */

const fs = require('fs');
const path = require('path');
const { runQuery } = require('../db');

class BotMonitoring {
  constructor() {
    this.metrics = {
      messages: {
        sent: 0,
        delivered: 0,
        failed: 0,
        rateLimited: 0
      },
      connections: {
        established: 0,
        dropped: 0,
        errors: 0,
        lastConnected: null
      },
      performance: {
        avgResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        uptime: 0
      },
      health: {
        status: 'unknown',
        lastHealthCheck: null,
        consecutiveErrors: 0,
        isBlocked: false
      }
    };
    
    this.alerts = [];
    this.startTime = Date.now();
    
    // Iniciar monitoreo automático
    this.startMonitoring();
  }

  // 📊 Recolectar métricas cada minuto
  startMonitoring() {
    setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.saveMetrics();
    }, 60000); // Cada minuto

    // Health check cada 5 minutos
    setInterval(() => {
      this.performHealthCheck();
    }, 300000); // Cada 5 minutos

    console.log('🔍 Sistema de monitoreo iniciado');
  }

  // 📈 Recolectar métricas del sistema
  async collectMetrics() {
    try {
      // Métricas de sistema
      const memUsage = process.memoryUsage();
      this.metrics.performance.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
      this.metrics.performance.uptime = Math.round((Date.now() - this.startTime) / 1000 / 60); // minutos

      // Métricas de base de datos
      const messageStats = await this.getMessageStats();
      this.metrics.messages = { ...this.metrics.messages, ...messageStats };

      // Verificar estado de archivos críticos
      await this.checkCriticalFiles();
      
    } catch (error) {
      console.error('❌ Error recolectando métricas:', error.message);
      this.metrics.health.consecutiveErrors++;
    }
  }

  // 📊 Obtener estadísticas de mensajes
  async getMessageStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [sentToday] = await runQuery(`
        SELECT COUNT(*) as count 
        FROM message_queue 
        WHERE DATE(created_at) = ? AND status = 'sent'
      `, [today]);

      const [failedToday] = await runQuery(`
        SELECT COUNT(*) as count 
        FROM message_queue 
        WHERE DATE(created_at) = ? AND status = 'failed'
      `, [today]);

      return {
        sentToday: sentToday?.count || 0,
        failedToday: failedToday?.count || 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo stats de mensajes:', error);
      return {};
    }
  }

  // 🔍 Verificar archivos críticos
  async checkCriticalFiles() {
    const criticalFiles = [
      './bot_database.sqlite',
      './logs/app.log',
      './.wwebjs_auth',
      './adminServer.js'
    ];

    const missingFiles = [];
    
    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      this.addAlert('critical', `Archivos críticos faltantes: ${missingFiles.join(', ')}`);
    }
  }

  // 🚨 Sistema de alertas
  checkAlerts() {
    // Alerta: Muchos errores consecutivos
    if (this.metrics.health.consecutiveErrors >= 5) {
      this.addAlert('critical', `${this.metrics.health.consecutiveErrors} errores consecutivos detectados`);
    }

    // Alerta: Alto uso de memoria
    if (this.metrics.performance.memoryUsage > 400) { // 400MB
      this.addAlert('warning', `Alto uso de memoria: ${this.metrics.performance.memoryUsage}MB`);
    }

    // Alerta: Muchos mensajes fallidos
    if (this.metrics.messages.failedToday > 50) {
      this.addAlert('critical', `Muchos mensajes fallidos hoy: ${this.metrics.messages.failedToday}`);
    }

    // Alerta: Posible bloqueo
    const failureRate = this.metrics.messages.failedToday / Math.max(this.metrics.messages.sentToday, 1);
    if (failureRate > 0.3) { // 30% de fallos
      this.addAlert('critical', `Alta tasa de fallos: ${Math.round(failureRate * 100)}% - Posible bloqueo`);
      this.metrics.health.isBlocked = true;
    }
  }

  // 🔔 Agregar alerta
  addAlert(level, message) {
    const alert = {
      level,
      message,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };

    this.alerts.push(alert);
    
    // Mantener solo las últimas 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log críticas inmediatamente
    if (level === 'critical') {
      console.error(`🚨 ALERTA CRÍTICA: ${message}`);
    } else if (level === 'warning') {
      console.warn(`⚠️ ADVERTENCIA: ${message}`);
    }
  }

  // 💾 Guardar métricas
  saveMetrics() {
    const metricsData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      alerts: this.alerts.slice(-10) // Últimas 10 alertas
    };

    const metricsFile = path.join('./logs', 'metrics.json');
    fs.writeFileSync(metricsFile, JSON.stringify(metricsData, null, 2));
  }

  // 🏥 Health check completo
  async performHealthCheck() {
    console.log('🔍 Realizando health check...');
    
    try {
      // Verificar conexión a DB
      await runQuery('SELECT 1 as test');
      
      // Verificar espacio en disco
      const stats = fs.statSync('./');
      
      // Verificar logs recientes
      const logFile = './logs/app.log';
      if (fs.existsSync(logFile)) {
        const logStats = fs.statSync(logFile);
        const logAge = Date.now() - logStats.mtime.getTime();
        
        if (logAge > 300000) { // 5 minutos sin logs
          this.addAlert('warning', 'No hay logs recientes - posible problema');
        }
      }

      this.metrics.health.status = 'healthy';
      this.metrics.health.lastHealthCheck = new Date().toISOString();
      this.metrics.health.consecutiveErrors = 0;
      
      console.log('✅ Health check completado - Sistema saludable');
      
    } catch (error) {
      this.metrics.health.status = 'unhealthy';
      this.metrics.health.consecutiveErrors++;
      this.addAlert('critical', `Health check falló: ${error.message}`);
    }
  }

  // 📋 Obtener reporte de estado
  getStatusReport() {
    return {
      status: this.metrics.health.status,
      uptime: this.metrics.performance.uptime,
      memory: this.metrics.performance.memoryUsage,
      messages: {
        sent: this.metrics.messages.sentToday,
        failed: this.metrics.messages.failedToday,
        failureRate: Math.round((this.metrics.messages.failedToday / Math.max(this.metrics.messages.sentToday, 1)) * 100)
      },
      alerts: this.alerts.slice(-5),
      isBlocked: this.metrics.health.isBlocked,
      lastCheck: this.metrics.health.lastHealthCheck
    };
  }

  // 🧹 Limpiar logs antiguos
  cleanupLogs() {
    const logsDir = './logs';
    const retentionDays = 7;
    const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    try {
      const files = fs.readdirSync(logsDir);
      let cleaned = 0;

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffDate && file.endsWith('.log')) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      });

      console.log(`🧹 Limpieza de logs completada: ${cleaned} archivos eliminados`);
    } catch (error) {
      console.error('❌ Error limpiando logs:', error.message);
    }
  }
}

module.exports = BotMonitoring;
