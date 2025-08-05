/**
 * Sistema de Rate Limiting Avanzado para Bot VJ
 * Implementa múltiples niveles de protección contra ataques
 */

const rateLimit = require('express-rate-limit');

class AdvancedRateLimiter {
  /**
   * Rate limiter general para toda la aplicación
   */
  static general() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // 100 requests por IP
      message: {
        success: false,
        error: 'Demasiadas solicitudes. Intenta nuevamente en 15 minutos.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);
        res.status(429).json({
          success: false,
          error: 'Demasiadas solicitudes',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Rate limiter estricto para login de administradores
   */
  static adminLogin() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 5, // Solo 5 intentos de login por IP cada 5 minutos
      skipSuccessfulRequests: true, // No contar requests exitosos
      message: {
        success: false,
        error: 'Demasiados intentos de login. Espera 5 minutos antes de intentar nuevamente.',
        retryAfter: '5 minutes'
      },
      handler: (req, res) => {
        console.error(`Admin login rate limit exceeded for IP: ${req.ip} - Username: ${req.body?.username} at ${new Date().toISOString()}`);
        res.status(429).json({
          success: false,
          error: 'Demasiados intentos de login',
          lockoutTime: 5 * 60, // 5 minutos en segundos
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Rate limiter para operaciones de reservas
   */
  static reservations() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutos
      max: 20, // 20 operaciones de reserva por IP cada 10 minutos
      message: {
        success: false,
        error: 'Demasiadas operaciones de reserva. Espera 10 minutos.',
        retryAfter: '10 minutes'
      },
      handler: (req, res) => {
        console.warn(`Reservations rate limit exceeded for IP: ${req.ip} at ${new Date().toISOString()}`);
        res.status(429).json({
          success: false,
          error: 'Límite de operaciones de reserva excedido',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Rate limiter para endpoints de consulta
   */
  static queries() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 30, // 30 consultas por minuto
      message: {
        success: false,
        error: 'Demasiadas consultas. Espera 1 minuto.',
        retryAfter: '1 minute'
      }
    });
  }

  /**
   * Rate limiter muy estricto para operaciones críticas
   */
  static critical() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 3, // Solo 3 operaciones críticas por minuto
      message: {
        success: false,
        error: 'Operación crítica limitada. Espera 1 minuto.',
        retryAfter: '1 minute'
      },
      handler: (req, res) => {
        console.error(`Critical operation rate limit exceeded for IP: ${req.ip} - Path: ${req.path} at ${new Date().toISOString()}`);
        res.status(429).json({
          success: false,
          error: 'Límite de operaciones críticas excedido',
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });
  }

  /**
   * Rate limiter para uploads/archivos
   */
  static uploads() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 10, // 10 uploads cada 5 minutos
      message: {
        success: false,
        error: 'Demasiados uploads. Espera 5 minutos.',
        retryAfter: '5 minutes'
      }
    });
  }

  /**
   * Rate limiter progresivo que aumenta las restricciones
   */
  static progressive() {
    const store = new Map();
    
    return (req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minuto
      
      if (!store.has(ip)) {
        store.set(ip, { count: 1, resetTime: now + windowMs, violations: 0 });
        return next();
      }
      
      const record = store.get(ip);
      
      if (now > record.resetTime) {
        // Reset window
        record.count = 1;
        record.resetTime = now + windowMs;
        record.violations = Math.max(0, record.violations - 1); // Reducir violaciones gradualmente
      } else {
        record.count++;
      }
      
      // Límite dinámico basado en violaciones previas
      const baseLimit = 30;
      const currentLimit = Math.max(5, baseLimit - (record.violations * 5));
      
      if (record.count > currentLimit) {
        record.violations++;
        console.warn(`Progressive rate limit exceeded for IP: ${ip} - Violations: ${record.violations} at ${new Date().toISOString()}`);
        
        return res.status(429).json({
          success: false,
          error: `Límite progresivo excedido. Límite actual: ${currentLimit} requests/min`,
          violations: record.violations,
          retryAfter: Math.round((record.resetTime - now) / 1000)
        });
      }
      
      store.set(ip, record);
      next();
    };
  }

  /**
   * Aplicar rate limiters específicos según la ruta
   */
  static applyToRoutes(app) {
    // Rate limiter general
    app.use(this.general());
    
    // Rate limiters específicos
    app.use('/admin/login', this.adminLogin());
    app.use('/admin/reservations', this.reservations());
    app.use('/admin/cabins', this.reservations());
    app.use('/admin/users', this.queries());
    app.use('/admin/reports', this.queries());
    app.use('/admin/backup', this.critical());
    app.use('/admin/config', this.critical());
    app.use('/uploads', this.uploads());
    
    // Rate limiter progresivo para rutas públicas
    app.use('/api', this.progressive());
    
    console.log('✅ Advanced Rate Limiting configurado');
  }
}

module.exports = AdvancedRateLimiter;
