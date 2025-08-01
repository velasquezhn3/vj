/**
 * Servicio para limpiar automáticamente reservas pendientes expiradas
 */

const { runExecute, runQuery } = require('../db');
const logger = require('../config/logger');

class ReservaCleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    // Intervalo de verificación: cada 30 minutos
    this.CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutos en millisegundos
    // Tiempo límite: 24 horas
    this.TIEMPO_LIMITE_HORAS = 24;
  }

  /**
   * Inicia el servicio de limpieza automática
   */
  iniciar() {
    if (this.isRunning) {
      logger.warn('El servicio de limpieza ya está ejecutándose');
      return;
    }

    logger.info('🧹 Iniciando servicio de limpieza automática de reservas pendientes');
    logger.info(`   - Intervalo de verificación: ${this.CLEANUP_INTERVAL / 60000} minutos`);
    logger.info(`   - Tiempo límite: ${this.TIEMPO_LIMITE_HORAS} horas`);

    // Ejecutar limpieza inmediatamente
    this.ejecutarLimpieza();

    // Programar limpiezas periódicas
    this.intervalId = setInterval(() => {
      this.ejecutarLimpieza();
    }, this.CLEANUP_INTERVAL);

    this.isRunning = true;
    logger.info('✅ Servicio de limpieza iniciado correctamente');
  }

  /**
   * Detiene el servicio de limpieza automática
   */
  detener() {
    if (!this.isRunning) {
      logger.warn('El servicio de limpieza no está ejecutándose');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('🛑 Servicio de limpieza detenido');
  }

  /**
   * Ejecuta la limpieza de reservas pendientes expiradas
   */
  async ejecutarLimpieza() {
    try {
      logger.info('🔍 Ejecutando limpieza de reservas pendientes...');

      // Primero, obtener las reservas que serán eliminadas para log
      const reservasAEliminar = await this.obtenerReservasExpiradas();
      
      if (reservasAEliminar.length === 0) {
        logger.info('✅ No hay reservas pendientes expiradas para eliminar');
        return;
      }

      // Log de las reservas que serán eliminadas
      logger.info(`⚠️ Se eliminarán ${reservasAEliminar.length} reservas expiradas:`);
      reservasAEliminar.forEach(reserva => {
        const horasExpiradas = this.calcularHorasExpiradas(reserva.created_at);
        logger.info(`   - ID: ${reserva.reservation_id} | Usuario: ${reserva.guest_name || 'Sin nombre'} | Expirada hace: ${horasExpiradas.toFixed(1)}h`);
      });

      // Ejecutar eliminación
      const resultado = await this.eliminarReservasExpiradas();
      
      if (resultado.changes > 0) {
        logger.info(`✅ Eliminadas ${resultado.changes} reservas pendientes expiradas`);
        
        // Opcional: notificar a administradores
        await this.notificarLimpieza(resultado.changes, reservasAEliminar);
      } else {
        logger.info('ℹ️ No se eliminaron reservas (posiblemente ya fueron procesadas)');
      }

    } catch (error) {
      logger.error('❌ Error durante la limpieza de reservas:', error);
    }
  }

  /**
   * Obtiene las reservas pendientes que han expirado
   */
  async obtenerReservasExpiradas() {
    const sql = `
      SELECT r.reservation_id, r.created_at, r.start_date, r.end_date, 
             u.name as guest_name, u.phone_number
      FROM Reservations r
      LEFT JOIN Users u ON r.user_id = u.user_id
      WHERE r.status = 'pendiente' 
      AND (
        (r.created_at IS NOT NULL AND julianday('now') - julianday(r.created_at) > ?)
        OR 
        (r.created_at IS NULL AND julianday('now') - julianday('2025-01-01') > 30)
      )
      ORDER BY r.created_at ASC
    `;
    
    const limite = this.TIEMPO_LIMITE_HORAS / 24; // Convertir horas a días para julianday
    return await runQuery(sql, [limite]);
  }

  /**
   * Elimina las reservas pendientes expiradas
   */
  async eliminarReservasExpiradas() {
    const sql = `
      DELETE FROM Reservations 
      WHERE status = 'pendiente' 
      AND (
        (created_at IS NOT NULL AND julianday('now') - julianday(created_at) > ?)
        OR 
        (created_at IS NULL AND julianday('now') - julianday('2025-01-01') > 30)
      )
    `;
    
    const limite = this.TIEMPO_LIMITE_HORAS / 24;
    return await runExecute(sql, [limite]);
  }

  /**
   * Calcula cuántas horas han pasado desde la creación
   */
  calcularHorasExpiradas(created_at) {
    if (!created_at) return 0;
    
    const ahora = new Date();
    const fechaCreacion = new Date(created_at);
    const diferenciaMs = ahora - fechaCreacion;
    return diferenciaMs / (1000 * 60 * 60); // Convertir a horas
  }

  /**
   * Notifica a los administradores sobre la limpieza (opcional)
   */
  async notificarLimpieza(cantidad, reservasEliminadas) {
    try {
      // Solo registrar en logs por ahora
      // En el futuro se podría enviar notificación al grupo de administradores
      logger.info(`📊 Resumen de limpieza: ${cantidad} reservas eliminadas`);
      
      if (cantidad > 5) {
        logger.warn(`⚠️ Se eliminaron ${cantidad} reservas - número alto, revisar si es normal`);
      }
    } catch (error) {
      logger.error('Error notificando limpieza:', error);
    }
  }

  /**
   * Ejecuta limpieza manual (para testing o uso directo)
   */
  async limpiezaManual() {
    logger.info('🔧 Ejecutando limpieza manual...');
    await this.ejecutarLimpieza();
    return this.obtenerEstadisticas();
  }

  /**
   * Obtiene estadísticas de reservas
   */
  async obtenerEstadisticas() {
    try {
      const stats = await runQuery(`
        SELECT 
          status,
          COUNT(*) as cantidad,
          MIN(created_at) as mas_antigua,
          MAX(created_at) as mas_reciente
        FROM Reservations 
        GROUP BY status
        ORDER BY cantidad DESC
      `);

      return {
        estadisticas: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Verifica el estado del servicio
   */
  getEstado() {
    return {
      ejecutandose: this.isRunning,
      intervalo_minutos: this.CLEANUP_INTERVAL / 60000,
      tiempo_limite_horas: this.TIEMPO_LIMITE_HORAS,
      proximo_cleanup: this.isRunning ? 
        new Date(Date.now() + this.CLEANUP_INTERVAL).toISOString() : 
        'No programado'
    };
  }
}

// Crear instancia singleton
const cleanupService = new ReservaCleanupService();

module.exports = cleanupService;
