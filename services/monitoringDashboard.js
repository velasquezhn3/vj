/**
 * Dashboard de Monitoring en Tiempo Real
 * Bot VJ - Sistema de Reservas Villas Julie
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { runQuery } = require('../db');
const cacheService = require('../services/cacheService');
const logger = require('../config/logger');

class MonitoringDashboard {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.metrics = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      lastError: null,
      performance: {
        avgResponseTime: 0,
        responseTimes: []
      }
    };
  }

  setupMiddleware() {
    // Middleware para tracking de requests
    this.app.use((req, res, next) => {
      const start = Date.now();
      this.metrics.requests++;
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.updatePerformanceMetrics(duration);
        
        if (res.statusCode >= 400) {
          this.metrics.errors++;
          this.metrics.lastError = {
            path: req.path,
            method: req.method,
            status: res.statusCode,
            timestamp: new Date()
          };
        }
      });
      
      next();
    });

    // Servir archivos estáticos
    this.app.use('/static', express.static(path.join(__dirname, '../public/monitoring')));
    this.app.use(express.json());
  }

  setupRoutes() {
    // Dashboard principal
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });

    // API de métricas del sistema
    this.app.get('/api/metrics/system', async (req, res) => {
      try {
        const metrics = await this.getSystemMetrics();
        res.json({ success: true, data: metrics });
      } catch (error) {
        logger.error('Error obteniendo métricas del sistema:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API de métricas de base de datos
    this.app.get('/api/metrics/database', async (req, res) => {
      try {
        const metrics = await this.getDatabaseMetrics();
        res.json({ success: true, data: metrics });
      } catch (error) {
        logger.error('Error obteniendo métricas de BD:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API de métricas de cache
    this.app.get('/api/metrics/cache', (req, res) => {
      try {
        const metrics = this.getCacheMetrics();
        res.json({ success: true, data: metrics });
      } catch (error) {
        logger.error('Error obteniendo métricas de cache:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API de logs recientes
    this.app.get('/api/logs/recent', (req, res) => {
      try {
        const logs = this.getRecentLogs();
        res.json({ success: true, data: logs });
      } catch (error) {
        logger.error('Error obteniendo logs:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API de alertas activas
    this.app.get('/api/alerts', async (req, res) => {
      try {
        const alerts = await this.getActiveAlerts();
        res.json({ success: true, data: alerts });
      } catch (error) {
        logger.error('Error obteniendo alertas:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API de performance en tiempo real
    this.app.get('/api/performance/realtime', (req, res) => {
      try {
        const performance = this.getRealTimePerformance();
        res.json({ success: true, data: performance });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // WebSocket para updates en tiempo real
    this.app.get('/api/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const sendUpdate = () => {
        const data = {
          timestamp: Date.now(),
          metrics: this.metrics,
          cache: this.getCacheMetrics(),
          memory: process.memoryUsage()
        };
        res.write(`data: ${JSON.stringify(data)}\\n\\n`);
      };

      const interval = setInterval(sendUpdate, 5000); // Update cada 5 segundos
      
      req.on('close', () => {
        clearInterval(interval);
      });
    });
  }

  async getSystemMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const memory = process.memoryUsage();
    
    return {
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024),
        total: Math.round(memory.heapTotal / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024)
      },
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
      lastError: this.metrics.lastError,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    };
  }

  async getDatabaseMetrics() {
    try {
      const [userCount, cabinCount, reservationCount, activeReservations] = await Promise.all([
        runQuery('SELECT COUNT(*) as count FROM Users'),
        runQuery('SELECT COUNT(*) as count FROM Cabins'),
        runQuery('SELECT COUNT(*) as count FROM Reservations'),
        runQuery('SELECT COUNT(*) as count FROM Reservations WHERE start_date >= date("now")')
      ]);

      // Test de performance de BD
      const start = Date.now();
      await runQuery('SELECT COUNT(*) FROM Reservations r JOIN Users u ON r.user_id = u.user_id LIMIT 10');
      const queryTime = Date.now() - start;

      return {
        counts: {
          users: userCount[0].count,
          cabins: cabinCount[0].count,
          reservations: reservationCount[0].count,
          activeReservations: activeReservations[0].count
        },
        performance: {
          queryTime: queryTime,
          status: queryTime < 50 ? 'excellent' : queryTime < 100 ? 'good' : 'warning'
        }
      };
    } catch (error) {
      throw new Error(`Error en métricas de BD: ${error.message}`);
    }
  }

  getCacheMetrics() {
    const stats = cacheService.getStats();
    return {
      ...stats,
      efficiency: stats.hitRatio > 80 ? 'excellent' : stats.hitRatio > 60 ? 'good' : 'warning'
    };
  }

  getRecentLogs() {
    try {
      const logDir = path.join(__dirname, '../logs');
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(logDir, `combined-${today}.log`);
      
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf-8');
        const lines = content.split('\\n').filter(line => line.trim())
          .slice(-50) // Últimas 50 líneas
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return { message: line, timestamp: new Date() };
            }
          });
        
        return lines.reverse(); // Más recientes primero
      }
      
      return [];
    } catch (error) {
      logger.error('Error leyendo logs:', error);
      return [];
    }
  }

  async getActiveAlerts() {
    const alerts = [];
    const memory = process.memoryUsage();
    const memoryUsageMB = memory.heapUsed / 1024 / 1024;
    
    // Alert por uso de memoria
    if (memoryUsageMB > 100) {
      alerts.push({
        type: 'warning',
        category: 'memory',
        message: `Uso de memoria alto: ${Math.round(memoryUsageMB)}MB`,
        timestamp: new Date()
      });
    }

    // Alert por error rate
    const errorRate = this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100) : 0;
    if (errorRate > 5) {
      alerts.push({
        type: 'error',
        category: 'performance',
        message: `Error rate alto: ${errorRate.toFixed(2)}%`,
        timestamp: new Date()
      });
    }

    // Alert por performance de cache
    const cacheStats = cacheService.getStats();
    if (cacheStats.hitRatio < 50 && cacheStats.requests > 10) {
      alerts.push({
        type: 'warning',
        category: 'cache',
        message: `Cache hit ratio bajo: ${cacheStats.hitRatio}%`,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  getRealTimePerformance() {
    return {
      avgResponseTime: this.metrics.performance.avgResponseTime,
      recentResponseTimes: this.metrics.performance.responseTimes.slice(-20),
      requestsPerMinute: this.calculateRequestsPerMinute(),
      status: this.getPerformanceStatus()
    };
  }

  updatePerformanceMetrics(duration) {
    this.metrics.performance.responseTimes.push({
      time: duration,
      timestamp: Date.now()
    });

    // Mantener solo últimos 100 registros
    if (this.metrics.performance.responseTimes.length > 100) {
      this.metrics.performance.responseTimes = this.metrics.performance.responseTimes.slice(-100);
    }

    // Calcular promedio
    const times = this.metrics.performance.responseTimes.map(r => r.time);
    this.metrics.performance.avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
  }

  calculateRequestsPerMinute() {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.metrics.performance.responseTimes.filter(
      r => r.timestamp > oneMinuteAgo
    );
    return recentRequests.length;
  }

  getPerformanceStatus() {
    const avg = this.metrics.performance.avgResponseTime;
    if (avg < 100) return 'excellent';
    if (avg < 300) return 'good';
    if (avg < 1000) return 'warning';
    return 'critical';
  }

  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  }

  getDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot VJ - Dashboard de Monitoring</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            text-align: center; 
            color: white; 
            margin-bottom: 30px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .metric-card { 
            background: white; 
            border-radius: 15px; 
            padding: 25px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.3s ease;
        }
        .metric-card:hover { transform: translateY(-5px); }
        .metric-title { 
            font-size: 1.2em; 
            font-weight: bold; 
            margin-bottom: 15px; 
            color: #555;
        }
        .metric-value { 
            font-size: 2em; 
            font-weight: bold; 
            margin-bottom: 10px;
        }
        .status-excellent { color: #4CAF50; }
        .status-good { color: #2196F3; }
        .status-warning { color: #FF9800; }
        .status-critical { color: #F44336; }
        .logs-container { 
            background: white; 
            border-radius: 15px; 
            padding: 25px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            max-height: 400px; 
            overflow-y: auto;
        }
        .log-entry { 
            padding: 10px; 
            border-bottom: 1px solid #eee; 
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .log-info { color: #2196F3; }
        .log-warn { color: #FF9800; }
        .log-error { color: #F44336; }
        .refresh-btn { 
            background: #4CAF50; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
            transition: background 0.3s ease;
        }
        .refresh-btn:hover { background: #45a049; }
        .alert { 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px; 
            border-left: 5px solid;
        }
        .alert-warning { background: #fff3cd; border-color: #FF9800; }
        .alert-error { background: #f8d7da; border-color: #F44336; }
        .chart-container { height: 200px; margin: 20px 0; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Bot VJ - Dashboard de Monitoring</h1>
            <p>Sistema de Reservas Villas Julie - Monitoreo en Tiempo Real</p>
        </div>
        
        <button class="refresh-btn" onclick="loadMetrics()">🔄 Actualizar Métricas</button>
        
        <div class="metrics-grid" id="metricsGrid">
            <!-- Métricas se cargan dinámicamente -->
        </div>
        
        <div id="alerts"></div>
        
        <div class="logs-container">
            <h3>📝 Logs Recientes</h3>
            <div id="logs">Cargando logs...</div>
        </div>
    </div>

    <script>
        // Cargar métricas automáticamente
        loadMetrics();
        setInterval(loadMetrics, 30000); // Actualizar cada 30 segundos
        
        async function loadMetrics() {
            try {
                const [system, database, cache, logs, alerts] = await Promise.all([
                    fetch('/api/metrics/system').then(r => r.json()),
                    fetch('/api/metrics/database').then(r => r.json()),
                    fetch('/api/metrics/cache').then(r => r.json()),
                    fetch('/api/logs/recent').then(r => r.json()),
                    fetch('/api/alerts').then(r => r.json())
                ]);
                
                displayMetrics(system.data, database.data, cache.data);
                displayLogs(logs.data);
                displayAlerts(alerts.data);
            } catch (error) {
                console.error('Error cargando métricas:', error);
            }
        }
        
        function displayMetrics(system, database, cache) {
            const grid = document.getElementById('metricsGrid');
            grid.innerHTML = \`
                <div class="metric-card">
                    <div class="metric-title">🖥️ Sistema</div>
                    <div class="metric-value status-\${system.memory.used > 100 ? 'warning' : 'good'}">
                        \${system.memory.used}MB
                    </div>
                    <div>Memoria utilizada</div>
                    <div>Uptime: \${system.uptimeFormatted}</div>
                    <div>Requests: \${system.requests}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">🗄️ Base de Datos</div>
                    <div class="metric-value status-\${database.performance.status}">
                        \${database.performance.queryTime}ms
                    </div>
                    <div>Tiempo de consulta</div>
                    <div>Usuarios: \${database.counts.users}</div>
                    <div>Reservas: \${database.counts.reservations}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">💾 Cache</div>
                    <div class="metric-value status-\${cache.efficiency}">
                        \${cache.hitRatio}%
                    </div>
                    <div>Hit Ratio</div>
                    <div>Entradas: \${cache.size}</div>
                    <div>Requests: \${cache.requests}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">⚡ Performance</div>
                    <div class="metric-value status-\${system.errorRate > 5 ? 'warning' : 'good'}">
                        \${system.errorRate}%
                    </div>
                    <div>Error Rate</div>
                    <div>Errores: \${system.errors}</div>
                </div>
            \`;
        }
        
        function displayLogs(logs) {
            const logsDiv = document.getElementById('logs');
            logsDiv.innerHTML = logs.slice(0, 20).map(log => \`
                <div class="log-entry log-\${log.level || 'info'}">
                    [\${new Date(log.timestamp).toLocaleTimeString()}] 
                    \${log.level ? log.level.toUpperCase() : 'INFO'}: 
                    \${log.message}
                </div>
            \`).join('');
        }
        
        function displayAlerts(alerts) {
            const alertsDiv = document.getElementById('alerts');
            if (alerts.length === 0) {
                alertsDiv.innerHTML = '<div class="alert alert-good">✅ No hay alertas activas</div>';
                return;
            }
            
            alertsDiv.innerHTML = alerts.map(alert => \`
                <div class="alert alert-\${alert.type}">
                    <strong>\${alert.category.toUpperCase()}:</strong> \${alert.message}
                    <small>(\${new Date(alert.timestamp).toLocaleTimeString()})</small>
                </div>
            \`).join('');
        }
    </script>
</body>
</html>
    `;
  }

  start(port = 4000) {
    this.server = this.app.listen(port, () => {
      logger.info(`📊 Dashboard de monitoring iniciado en puerto ${port}`);
      console.log(`🌐 Dashboard disponible en: http://localhost:${port}`);
    });
    
    return this.server;
  }

  stop() {
    if (this.server) {
      this.server.close();
      logger.info('📊 Dashboard de monitoring detenido');
    }
  }
}

module.exports = MonitoringDashboard;
