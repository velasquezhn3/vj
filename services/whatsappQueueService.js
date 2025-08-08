const Bull = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');

class WhatsAppQueueManager {
  constructor() {
    this.redis = null;
    this.messageQueue = null;
    this.isInitialized = false;
    this.currentBotInstance = null;
    
    this.config = {
      redisHost: 'localhost',
      redisPort: 6379,
      concurrency: 1,
      maxRetries: 3,
      queueDelay: 2000
    };
  }

  setBotInstance(botInstance) {
    this.currentBotInstance = botInstance;
    logger.info('🤖 Bot instance actualizada');
  }

  async init() {
    try {
      logger.info('🚀 Inicializando sistema de colas...');
      
      // Primero intentar conectar Redis directamente para verificar
      this.redis = new Redis({
        host: this.config.redisHost,
        port: this.config.redisPort,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      // Verificar conexión Redis
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error('Redis no responde correctamente');
      }
      
      logger.info('✅ Redis conectado correctamente');

      // Inicializar cola Bull
      this.messageQueue = new Bull('whatsapp-messages', {
        redis: {
          host: this.config.redisHost,
          port: this.config.redisPort
        }
      });

      this.messageQueue.process('process-message', this.config.concurrency, async (job) => {
        const { messageData } = job.data;
        
        if (!this.currentBotInstance || !messageData) {
          throw new Error('Bot instance o messageData no disponible');
        }

        const { procesarMensaje } = require('../controllers/flows/messageProcessor');
        await procesarMensaje(
          this.currentBotInstance,
          messageData.sender,
          messageData.text,
          messageData.originalMessage
        );

        return { success: true };
      });

      this.isInitialized = true;
      logger.info('✅ Sistema de colas inicializado');

    } catch (error) {
      logger.error('❌ Error inicializando colas:', error);
      this.isInitialized = false;
      
      // Limpiar conexiones fallidas
      if (this.redis) {
        try {
          await this.redis.quit();
        } catch (e) {
          // Ignorar error de desconexión
        }
        this.redis = null;
      }
      
      throw error;
    }
  }

  async addMessageToQueue(botInstance, sender, text, originalMessage, messageType = 'text') {
    if (!this.isInitialized) {
      return this.processMessageDirect(botInstance, sender, text, originalMessage);
    }

    try {
      this.setBotInstance(botInstance);
      
      const messageData = {
        sender,
        text,
        originalMessage,
        messageType,
        timestamp: Date.now()
      };

      await this.messageQueue.add('process-message', { messageData });
      logger.info('📥 Mensaje agregado a cola');

    } catch (error) {
      logger.error('❌ Error en cola, procesando directo:', error);
      return this.processMessageDirect(botInstance, sender, text, originalMessage);
    }
  }

  async processMessageDirect(botInstance, sender, text, originalMessage) {
    const { procesarMensaje } = require('../controllers/flows/messageProcessor');
    return await procesarMensaje(botInstance, sender, text, originalMessage);
  }

  // Métodos para estadísticas y management
  async getQueueStats() {
    if (!this.messageQueue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        available: false
      };
    }

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.messageQueue.getWaiting().then(jobs => jobs.length),
        this.messageQueue.getActive().then(jobs => jobs.length),
        this.messageQueue.getCompleted().then(jobs => jobs.length),
        this.messageQueue.getFailed().then(jobs => jobs.length)
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        available: true
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        available: false,
        error: error.message
      };
    }
  }

  async pauseQueue() {
    if (!this.messageQueue) {
      throw new Error('Cola no disponible');
    }
    await this.messageQueue.pause();
    logger.info('⏸️ Cola pausada');
  }

  async resumeQueue() {
    if (!this.messageQueue) {
      throw new Error('Cola no disponible');
    }
    await this.messageQueue.resume();
    logger.info('▶️ Cola reanudada');
  }

  async clearQueue() {
    if (!this.messageQueue) {
      throw new Error('Cola no disponible');
    }
    await this.messageQueue.empty();
    logger.info('🧹 Cola limpiada');
  }
}

let queueManager = null;

function getQueueManager() {
  if (!queueManager) {
    queueManager = new WhatsAppQueueManager();
  }
  return queueManager;
}

module.exports = {
  WhatsAppQueueManager,
  getQueueManager
};
