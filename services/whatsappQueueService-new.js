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
      
      this.messageQueue = new Queue('whatsapp-messages', {
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
