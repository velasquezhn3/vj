/**
 * Sistema de Rate Limiting Avanzado
 * Bot VJ - Sistema de Reservas Villas Julie
 */

const logger = require('../config/logger');

class AdvancedRateLimiter {
  constructor(options = {}) {
    this.windows = options.windows || {
      '1m': { limit: 60, window: 60 * 1000 },
      '1h': { limit: 1000, window: 60 * 60 * 1000 },
      '1d': { limit: 10000, window: 24 * 60 * 60 * 1000 }
    };
    
    this.storage = new Map();
    this.whitelist = new Set(options.whitelist || []);
    this.blacklist = new Set(options.blacklist || []);
    
    this.endpointConfig = {
      '/api/auth/login': {
        '1m': { limit: 5, window: 60 * 1000 },
        '1h': { limit: 20, window: 60 * 60 * 1000 }
      },
      '/api/reservations': {
        '1m': { limit: 10, window: 60 * 1000 },
        '1h': { limit: 100, window: 60 * 60 * 1000 }
      }
    };

    this.roleConfig = {
      'admin': { multiplier: 5, skipLimits: ['/api/admin/*'] },
      'premium': { multiplier: 2, skipLimits: [] },
      'cliente': { multiplier: 1, skipLimits: [] }
    };

    this.setupCleanup();
  }

  setupCleanup() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, data] of this.storage.entries()) {
      const oldestWindow = Math.max(...Object.values(this.windows).map(w => w.window));
      if (now - data.firstSeen > oldestWindow * 2) {
        this.storage.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Rate limiter cleanup: ${cleaned} entries removed`);
    }
  }

  getClientId(req) {
    if (req.headers['x-api-key']) return `api:${req.headers['x-api-key']}`;
    if (req.user && req.user.user_id) return `user:${req.user.user_id}`;
    
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
    return `ip:${ip}`;
  }

  isAllowed(clientId, endpoint, userRole = 'cliente') {
    const now = Date.now();
    const config = this.endpointConfig[endpoint] || this.windows;
    const multiplier = this.roleConfig[userRole]?.multiplier || 1;

    if (!this.storage.has(clientId)) {
      this.storage.set(clientId, {
        requests: {},
        firstSeen: now,
        totalRequests: 0
      });
    }

    const clientData = this.storage.get(clientId);
    clientData.totalRequests++;

    for (const [windowName, windowConfig] of Object.entries(config)) {
      const { limit, window } = windowConfig;
      const adjustedLimit = Math.floor(limit * multiplier);
      
      if (!clientData.requests[windowName]) {
        clientData.requests[windowName] = [];
      }

      const windowRequests = clientData.requests[windowName];
      const cutoff = now - window;
      
      while (windowRequests.length > 0 && windowRequests[0] < cutoff) {
        windowRequests.shift();
      }

      if (windowRequests.length >= adjustedLimit) {
        const resetTime = windowRequests[0] + window;
        
        logger.warn('Rate limit exceeded', {
          clientId, endpoint, window: windowName,
          current: windowRequests.length, limit: adjustedLimit
        });

        return {
          allowed: false,
          window: windowName,
          current: windowRequests.length,
          limit: adjustedLimit,
          resetTime
        };
      }

      windowRequests.push(now);
    }

    return { allowed: true };
  }

  middleware() {
    return (req, res, next) => {
      try {
        const clientId = this.getClientId(req);
        const endpoint = req.route?.path || req.path;
        const userRole = req.user?.role || 'cliente';
        const ip = req.ip || req.connection.remoteAddress;

        if (this.blacklist.has(ip)) {
          logger.security('Blacklisted IP attempt', { ip, endpoint });
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }

        if (this.whitelist.has(ip)) {
          return next();
        }

        const result = this.isAllowed(clientId, endpoint, userRole);
        
        if (!result.allowed) {
          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
          
          res.set({
            'X-RateLimit-Limit': result.limit,
            'X-RateLimit-Remaining': Math.max(0, result.limit - result.current),
            'Retry-After': retryAfter
          });

          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limiter error:', error);
        next(); // Fail open
      }
    };
  }

  getStats() {
    let totalRequests = 0;
    for (const data of this.storage.values()) {
      totalRequests += data.totalRequests;
    }

    return {
      totalClients: this.storage.size,
      totalRequests,
      whitelistedIps: this.whitelist.size,
      blacklistedIps: this.blacklist.size
    };
  }
}

module.exports = { AdvancedRateLimiter };
