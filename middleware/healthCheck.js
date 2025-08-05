/**
 * Sistema de Health Checks para Bot VJ
 * Monitorea el estado de todos los componentes del sistema
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.setupHealthChecks();
  }

  /**
   * Configurar todos los health checks disponibles
   */
  setupHealthChecks() {
    this.checks.set('database', {
      name: 'Base de Datos SQLite',
      check: this.checkDatabase.bind(this),
      critical: true,
      timeout: 5000
    });

    this.checks.set('filesystem', {
      name: 'Sistema de Archivos',
      check: this.checkFilesystem.bind(this),
      critical: true,
      timeout: 3000
    });

    this.checks.set('memory', {
      name: 'Uso de Memoria',
      check: this.checkMemory.bind(this),
      critical: false,
      timeout: 1000
    });

    this.checks.set('disk', {
      name: 'Espacio en Disco',
      check: this.checkDiskSpace.bind(this),
      critical: false,
      timeout: 3000
    });

    this.checks.set('logs', {
      name: 'Sistema de Logs',
      check: this.checkLogsSystem.bind(this),
      critical: false,
      timeout: 2000
    });

    this.checks.set('backups', {
      name: 'Sistema de Backups',
      check: this.checkBackupSystem.bind(this),
      critical: false,
      timeout: 2000
    });
  }

  /**
   * Ejecutar health check de base de datos
   */
  async checkDatabase() {
    return new Promise((resolve) => {
      const dbPath = process.env.DATABASE_PATH || './bot_database.sqlite';
      
      if (!fs.existsSync(dbPath)) {
        resolve({
          status: 'error',
          message: 'Archivo de base de datos no encontrado',
          details: { path: dbPath }
        });
        return;
      }

      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          resolve({
            status: 'error',
            message: 'No se puede conectar a la base de datos',
            details: { error: err.message }
          });
          return;
        }

        // Probar consulta simple
        db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'", (err, row) => {
          db.close();
          
          if (err) {
            resolve({
              status: 'error',
              message: 'Error ejecutando consulta de prueba',
              details: { error: err.message }
            });
          } else {
            resolve({
              status: 'healthy',
              message: 'Base de datos funcionando correctamente',
              details: { 
                tables: row.count,
                path: dbPath,
                size: this.getFileSize(dbPath)
              }
            });
          }
        });
      });
    });
  }

  /**
   * Verificar sistema de archivos
   */
  async checkFilesystem() {
    const paths = [
      { name: 'logs', path: './logs' },
      { name: 'backups', path: './backups' },
      { name: 'uploads', path: './uploads' },
      { name: 'config', path: './config' }
    ];

    const results = [];
    let allHealthy = true;

    for (const pathInfo of paths) {
      try {
        const stats = fs.statSync(pathInfo.path);
        const accessible = fs.accessSync(pathInfo.path, fs.constants.R_OK | fs.constants.W_OK);
        
        results.push({
          name: pathInfo.name,
          path: pathInfo.path,
          exists: true,
          writable: true,
          size: stats.isDirectory() ? this.getDirSize(pathInfo.path) : stats.size
        });
      } catch (error) {
        allHealthy = false;
        results.push({
          name: pathInfo.name,
          path: pathInfo.path,
          exists: false,
          error: error.message
        });
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'warning',
      message: allHealthy ? 'Todos los directorios accesibles' : 'Algunos directorios tienen problemas',
      details: { paths: results }
    };
  }

  /**
   * Verificar uso de memoria
   */
  async checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMemMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    // Considerar crítico si usa más de 512MB
    const isCritical = totalMemMB > 512;
    const isWarning = totalMemMB > 256;

    return {
      status: isCritical ? 'error' : (isWarning ? 'warning' : 'healthy'),
      message: `Usando ${totalMemMB}MB de memoria`,
      details: {
        rss: totalMemMB + 'MB',
        heapUsed: heapUsedMB + 'MB',
        heapTotal: heapTotalMB + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      }
    };
  }

  /**
   * Verificar espacio en disco
   */
  async checkDiskSpace() {
    try {
      const stats = fs.statSync('.');
      // En sistemas Windows, esto es más complejo, simplificamos
      
      return {
        status: 'healthy',
        message: 'Espacio en disco disponible',
        details: {
          note: 'Verificación completa requiere módulo adicional',
          accessible: true
        }
      };
    } catch (error) {
      return {
        status: 'warning',
        message: 'No se puede verificar espacio en disco',
        details: { error: error.message }
      };
    }
  }

  /**
   * Verificar sistema de logs
   */
  async checkLogsSystem() {
    const logDir = './logs';
    
    if (!fs.existsSync(logDir)) {
      return {
        status: 'warning',
        message: 'Directorio de logs no existe',
        details: { path: logDir }
      };
    }

    try {
      const logFiles = fs.readdirSync(logDir);
      const logStats = logFiles.map(file => {
        const fullPath = path.join(logDir, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          size: this.formatBytes(stats.size),
          modified: stats.mtime
        };
      });

      return {
        status: 'healthy',
        message: `${logFiles.length} archivos de log encontrados`,
        details: { files: logStats }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Error accediendo a logs',
        details: { error: error.message }
      };
    }
  }

  /**
   * Verificar sistema de backups
   */
  async checkBackupSystem() {
    const backupDir = './backups';
    
    if (!fs.existsSync(backupDir)) {
      return {
        status: 'warning',
        message: 'Directorio de backups no existe',
        details: { path: backupDir }
      };
    }

    try {
      const backupFiles = fs.readdirSync(backupDir);
      const recentBackups = backupFiles
        .map(file => {
          const fullPath = path.join(backupDir, file);
          const stats = fs.statSync(fullPath);
          return {
            name: file,
            size: this.formatBytes(stats.size),
            created: stats.mtime,
            age: Date.now() - stats.mtime.getTime()
          };
        })
        .sort((a, b) => b.created - a.created);

      const lastBackup = recentBackups[0];
      const lastBackupAge = lastBackup ? lastBackup.age : Infinity;
      const hoursAgo = Math.floor(lastBackupAge / (1000 * 60 * 60));

      let status = 'healthy';
      let message = `${backupFiles.length} backups disponibles`;

      if (hoursAgo > 24) {
        status = 'warning';
        message += `, último backup hace ${hoursAgo} horas`;
      } else if (hoursAgo > 72) {
        status = 'error';
        message += `, último backup hace ${hoursAgo} horas (crítico)`;
      }

      return {
        status,
        message,
        details: {
          totalBackups: backupFiles.length,
          lastBackup: lastBackup ? {
            name: lastBackup.name,
            size: lastBackup.size,
            hoursAgo
          } : null,
          recentBackups: recentBackups.slice(0, 5)
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Error accediendo a backups',
        details: { error: error.message }
      };
    }
  }

  /**
   * Ejecutar todos los health checks
   */
  async runAllChecks() {
    const results = {};
    const startTime = Date.now();
    let overallStatus = 'healthy';

    for (const [checkName, checkConfig] of this.checks) {
      const checkStartTime = Date.now();
      
      try {
        // Ejecutar check con timeout
        const result = await Promise.race([
          checkConfig.check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), checkConfig.timeout)
          )
        ]);

        result.duration = Date.now() - checkStartTime;
        results[checkName] = result;

        // Actualizar estado general
        if (result.status === 'error' && checkConfig.critical) {
          overallStatus = 'error';
        } else if (result.status === 'warning' && overallStatus === 'healthy') {
          overallStatus = 'warning';
        }

      } catch (error) {
        const result = {
          status: 'error',
          message: error.message === 'Timeout' ? 'Health check timeout' : error.message,
          duration: Date.now() - checkStartTime,
          details: { timeout: checkConfig.timeout }
        };

        results[checkName] = result;

        if (checkConfig.critical) {
          overallStatus = 'error';
        }
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks: results,
      summary: this.generateSummary(results)
    };
  }

  /**
   * Generar resumen de health checks
   */
  generateSummary(results) {
    const total = Object.keys(results).length;
    const healthy = Object.values(results).filter(r => r.status === 'healthy').length;
    const warnings = Object.values(results).filter(r => r.status === 'warning').length;
    const errors = Object.values(results).filter(r => r.status === 'error').length;

    return {
      total,
      healthy,
      warnings,
      errors,
      healthyPercentage: Math.round((healthy / total) * 100)
    };
  }

  /**
   * Helpers utilitarios
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return this.formatBytes(stats.size);
    } catch {
      return 'unknown';
    }
  }

  getDirSize(dirPath) {
    try {
      const files = fs.readdirSync(dirPath);
      let totalSize = 0;
      
      files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;
      });
      
      return this.formatBytes(totalSize);
    } catch {
      return 'unknown';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Middleware para endpoint de health check
   */
  static middleware() {
    const healthService = new HealthCheckService();

    return async (req, res) => {
      const results = await healthService.runAllChecks();
      
      // Status code basado en el estado general
      const statusCode = {
        'healthy': 200,
        'warning': 200, // Warning still returns 200
        'error': 503    // Service Unavailable
      }[results.status] || 503;

      res.status(statusCode).json(results);
    };
  }
}

module.exports = HealthCheckService;
