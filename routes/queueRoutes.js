/**
 * Rutas API para el dashboard de colas de WhatsApp
 */

const express = require('express');
const router = express.Router();
const { getQueueManager } = require('../services/whatsappQueueService');
const { authenticateToken } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

/**
 * GET /api/bot/queue-stats
 * Obtener estadísticas básicas de la cola
 */
router.get('/queue-stats', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    
    if (!queueManager || !queueManager.isInitialized) {
      return res.json({
        success: true,
        data: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          available: false,
          message: 'Sistema de colas no inicializado (modo fallback)'
        }
      });
    }

    const stats = await queueManager.getQueueStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        available: true
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de cola:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/bot/queue-status
 * Obtener estado general del sistema de colas
 */
router.get('/queue-status', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    
    const status = {
      isInitialized: queueManager ? queueManager.isInitialized : false,
      redisConnected: false,
      isPaused: false,
      systemMode: 'fallback'
    };

    if (queueManager && queueManager.isInitialized) {
      try {
        // Verificar conexión Redis de forma más robusta
        let redisConnected = false;
        if (queueManager.redis) {
          try {
            // Intentar hacer ping a Redis para verificar conexión
            await queueManager.redis.ping();
            redisConnected = true;
          } catch (pingError) {
            console.error('Redis ping failed:', pingError.message);
            redisConnected = false;
          }
        }
        
        status.redisConnected = redisConnected;
        status.isPaused = queueManager.messageQueue ? await queueManager.messageQueue.isPaused() : false;
        status.systemMode = status.redisConnected ? 'queue' : 'fallback';
      } catch (error) {
        console.error('Error verificando estado de cola:', error);
      }
    }

    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Error obteniendo estado del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/bot/queue-jobs
 * Obtener trabajos en cola con filtros
 */
router.get('/queue-jobs', async (req, res) => {
  try {
    const { status = 'all', limit = 100 } = req.query;
    const queueManager = getQueueManager();
    
    if (!queueManager || !queueManager.isInitialized || !queueManager.messageQueue) {
      return res.json({
        success: true,
        data: [],
        message: 'Cola no disponible'
      });
    }

    let jobs = [];
    
    try {
      if (status === 'all') {
        const [waiting, active, completed, failed] = await Promise.all([
          queueManager.messageQueue.getWaiting(0, Math.floor(limit / 4)),
          queueManager.messageQueue.getActive(0, Math.floor(limit / 4)),
          queueManager.messageQueue.getCompleted(0, Math.floor(limit / 4)),
          queueManager.messageQueue.getFailed(0, Math.floor(limit / 4))
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
      } else {
        switch (status) {
          case 'waiting':
            jobs = await queueManager.messageQueue.getWaiting(0, limit);
            break;
          case 'active':
            jobs = await queueManager.messageQueue.getActive(0, limit);
            break;
          case 'completed':
            jobs = await queueManager.messageQueue.getCompleted(0, limit);
            break;
          case 'failed':
            jobs = await queueManager.messageQueue.getFailed(0, limit);
            break;
          default:
            jobs = [];
        }
      }

      // Formatear datos de trabajos con información más completa
      const formattedJobs = jobs.map(job => {
        const jobStatus = status === 'all' ? getJobStatus(job) : status;
        const messageData = job.data?.messageData || job.data || {};
        
        return {
          id: job.id,
          status: jobStatus,
          data: {
            sender: messageData.sender || 'Sistema',
            text: messageData.text || job.data?.message || 'Mensaje del sistema',
            messageType: messageData.messageType || 'text',
            // Información adicional útil
            phone: messageData.sender ? messageData.sender.replace('@c.us', '') : null
          },
          timestamp: job.timestamp || job.createdAt || Date.now(),
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade || 0,
          failedReason: job.failedReason,
          opts: {
            attempts: job.opts?.attempts || 3,
            delay: job.opts?.delay || 2000
          },
          // Información de rendimiento
          duration: job.finishedOn && job.processedOn ? 
            job.finishedOn - job.processedOn : null
        };
      });

      res.json({
        success: true,
        data: formattedJobs,
        total: formattedJobs.length
      });
      
    } catch (queueError) {
      console.error('Error accediendo a trabajos de cola:', queueError);
      res.json({
        success: true,
        data: [],
        message: 'Error accediendo a trabajos: ' + queueError.message
      });
    }
    
  } catch (error) {
    console.error('Error obteniendo trabajos de cola:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * POST /api/bot/queue-pause
 * Pausar la cola de mensajes
 */
router.post('/queue-pause', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    
    if (!queueManager || !queueManager.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de colas no disponible'
      });
    }

    await queueManager.pauseQueue();
    
    res.json({
      success: true,
      message: 'Cola pausada exitosamente'
    });
    
  } catch (error) {
    console.error('Error pausando cola:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausando cola',
      error: error.message
    });
  }
});

/**
 * POST /api/bot/queue-resume
 * Reanudar la cola de mensajes
 */
router.post('/queue-resume', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    
    if (!queueManager || !queueManager.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de colas no disponible'
      });
    }

    await queueManager.resumeQueue();
    
    res.json({
      success: true,
      message: 'Cola reanudada exitosamente'
    });
    
  } catch (error) {
    console.error('Error reanudando cola:', error);
    res.status(500).json({
      success: false,
      message: 'Error reanudando cola',
      error: error.message
    });
  }
});

/**
 * POST /api/bot/queue-clear
 * Limpiar la cola de mensajes
 */
router.post('/queue-clear', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    
    if (!queueManager || !queueManager.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de colas no disponible'
      });
    }

    await queueManager.clearQueue();
    
    res.json({
      success: true,
      message: 'Cola limpiada exitosamente'
    });
    
  } catch (error) {
    console.error('Error limpiando cola:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando cola',
      error: error.message
    });
  }
});

/**
 * POST /api/bot/queue-retry/:jobId
 * Reintentar un trabajo fallido
 */
router.post('/queue-retry/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const queueManager = getQueueManager();
    
    if (!queueManager || !queueManager.isInitialized || !queueManager.messageQueue) {
      return res.status(400).json({
        success: false,
        message: 'Sistema de colas no disponible'
      });
    }

    // Obtener el trabajo fallido
    const job = await queueManager.messageQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Trabajo no encontrado'
      });
    }

    // Reintentar el trabajo
    await job.retry();
    
    res.json({
      success: true,
      message: 'Trabajo reintentado exitosamente'
    });
    
  } catch (error) {
    console.error('Error reintentando trabajo:', error);
    res.status(500).json({
      success: false,
      message: 'Error reintentando trabajo',
      error: error.message
    });
  }
});

/**
 * GET /api/bot/queue-config
 * Obtener configuración actual de la cola
 */
router.get('/queue-config', async (req, res) => {
  try {
    const queueManager = getQueueManager();
    
    const config = {
      delay: parseInt(process.env.BOT_QUEUE_DELAY) || 2000,
      concurrency: parseInt(process.env.BOT_QUEUE_CONCURRENCY) || 1,
      maxRetries: parseInt(process.env.BOT_QUEUE_MAX_RETRIES) || 3,
      backoffDelay: parseInt(process.env.BOT_QUEUE_BACKOFF_DELAY) || 5000,
      removeOnComplete: parseInt(process.env.BOT_QUEUE_REMOVE_ON_COMPLETE) || 50,
      removeOnFail: parseInt(process.env.BOT_QUEUE_REMOVE_ON_FAIL) || 100,
      redisHost: process.env.REDIS_HOST || 'localhost',
      redisPort: parseInt(process.env.REDIS_PORT) || 6379,
      available: queueManager ? queueManager.isInitialized : false
    };

    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/bot/queue-metrics
 * Obtener métricas de rendimiento
 */
router.get('/queue-metrics', async (req, res) => {
  try {
    const { range = '1h' } = req.query;
    const queueManager = getQueueManager();
    
    if (!queueManager || !queueManager.isInitialized) {
      return res.json({
        success: true,
        data: {
          available: false,
          message: 'Métricas no disponibles - cola no inicializada'
        }
      });
    }

    // Métricas básicas (se podrían expandir con más datos históricos)
    const stats = await queueManager.getQueueStats();
    const metrics = {
      current: stats,
      performance: {
        averageProcessingTime: 0, // Se podría calcular desde logs
        throughput: 0, // Mensajes por minuto
        errorRate: stats.failed / (stats.completed + stats.failed + 1) * 100
      },
      system: {
        redisConnected: queueManager.redis ? queueManager.redis.status === 'ready' : false,
        queueHealthy: stats.failed < stats.completed,
        uptime: process.uptime()
      },
      timeRange: range,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Función auxiliar para determinar el estado de un trabajo
function getJobStatus(job) {
  if (job.finishedOn && job.returnvalue) return 'completed';
  if (job.failedReason) return 'failed';
  if (job.processedOn && !job.finishedOn) return 'active';
  return 'waiting';
}

module.exports = router;
