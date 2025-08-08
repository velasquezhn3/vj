/**
 * Configuración optimizada para evitar bloqueos de WhatsApp
 * Implementa mejores prácticas y límites conservadores
 */

module.exports = {
  // 🔄 Configuración de Reconexión
  connection: {
    maxReconnectAttempts: 3,
    reconnectDelay: 30000,  // 30 segundos entre intentos
    keepAliveInterval: 25000, // 25 segundos
    connectTimeoutMs: 60000,  // 60 segundos timeout
    
    // Configuración de sessión más estable
    browser: ['Bot VJ', 'Chrome', '110.0.5481.77'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    
    // Reducir carga de mensajes iniciales
    getMessage: async () => undefined
  },

  // 📨 Límites de Mensajes (MUY IMPORTANTE)
  messaging: {
    // Límites por minuto
    maxMessagesPerMinute: 20,
    maxMessagesPerHour: 800,
    maxMessagesPerDay: 15000,
    
    // Delays entre mensajes
    minDelayBetweenMessages: 3000,  // 3 segundos mínimo
    randomDelayRange: [2000, 8000], // 2-8 segundos aleatorio
    
    // Límites por chat
    maxMessagesPerChatPerHour: 50,
    maxMessagesPerChatPerDay: 200,
    
    // Cooldown después de muchos mensajes
    cooldownAfter: 100,  // Después de 100 mensajes
    cooldownDuration: 300000  // 5 minutos de cooldown
  },

  // 👥 Gestión de Grupos
  groups: {
    maxGroupsToJoin: 5,
    delayBetweenGroupActions: 10000,  // 10 segundos
    maxMembersToAddPerAction: 3,
    
    // Evitar spam en grupos
    maxGroupMessagesPerHour: 30,
    respectGroupAdminSettings: true
  },

  // 🔒 Configuración de Seguridad
  security: {
    // User Agent consistente
    userAgent: 'WhatsApp/2.2316.4 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.77 Safari/537.36',
    
    // Headers seguros
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    
    // Evitar patrones de bot
    humanLikeBehavior: true,
    randomResponseDelays: true,
    varyMessageTimings: true
  },

  // ⏱️ Horarios de Funcionamiento (Simular humano)
  schedule: {
    // Horarios activos (GMT-5, América/Bogotá)
    activeHours: {
      start: 6,   // 6:00 AM
      end: 23     // 11:00 PM
    },
    
    // Días de la semana (0 = Domingo)
    activeDays: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
    
    // Pause nocturno
    nightModePause: true,
    nightModeStart: 23,  // 11:00 PM
    nightModeEnd: 6,     // 6:00 AM
    
    // Breaks regulares
    regularBreaks: {
      enabled: true,
      every: 120,      // Cada 2 horas
      duration: 15     // 15 minutos de pausa
    }
  },

  // 🚨 Monitoreo de Bloqueos
  blockingPrevention: {
    // Detección temprana
    enableBanDetection: true,
    enableRateLimitDetection: true,
    
    // Acciones automáticas
    autoSlowdownOnWarning: true,
    autoPauseOnSuspicion: true,
    
    // Backoff exponencial
    backoffMultiplier: 2,
    maxBackoffDelay: 300000,  // 5 minutos máximo
    
    // Métricas a vigilar
    watchMetrics: {
      messageDeliveryRate: true,
      connectionDrops: true,
      errorRates: true,
      responseLatency: true
    }
  },

  // 📊 Logging para Análisis
  logging: {
    logAllMessages: true,
    logRateLimits: true,
    logConnectionIssues: true,
    logBlockingIndicators: true,
    
    // Archivo específico para WhatsApp
    whatsappLogFile: './logs/whatsapp-activity.log'
  }
};
