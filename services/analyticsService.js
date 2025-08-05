/**
 * Servicio de Analytics Avanzado
 * Bot Villas Julie - Métricas y análisis de negocio
 */

const { runQuery } = require('../db');
const { startOfMonth, endOfMonth, subMonths, format, parseISO } = require('date-fns');

class AnalyticsService {
  
  /**
   * Obtener métricas generales del dashboard
   */
  async getDashboardMetrics() {
    try {
      const queries = await Promise.all([
        this.getTotalUsers(),
        this.getTotalReservations(),
        this.getTotalRevenue(),
        this.getActiveReservations(),
        this.getOccupancyRate(),
        this.getAverageReservationValue(),
        this.getNewUsersThisMonth(),
        this.getRevenueGrowth()
      ]);

      return {
        totalUsers: queries[0],
        totalReservations: queries[1],
        totalRevenue: queries[2],
        activeReservations: queries[3],
        occupancyRate: queries[4],
        averageReservationValue: queries[5],
        newUsersThisMonth: queries[6],
        revenueGrowth: queries[7],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Análisis de ingresos por período
   */
  async getRevenueAnalysis(period = 'monthly', months = 12) {
    try {
      let sql;
      let dateFormat;
      
      switch (period) {
        case 'daily':
          sql = `
            SELECT 
              DATE(start_date) as period_date,
              COUNT(*) as reservations_count,
              SUM(total_price) as total_revenue,
              AVG(total_price) as avg_reservation_value
            FROM Reservations 
            WHERE status IN ('confirmado', 'completado')
              AND start_date >= date('now', '-30 days')
            GROUP BY DATE(start_date)
            ORDER BY period_date ASC
          `;
          dateFormat = 'yyyy-MM-dd';
          break;
          
        case 'weekly':
          sql = `
            SELECT 
              strftime('%Y-W%W', start_date) as period_date,
              COUNT(*) as reservations_count,
              SUM(total_price) as total_revenue,
              AVG(total_price) as avg_reservation_value
            FROM Reservations 
            WHERE status IN ('confirmado', 'completado')
              AND start_date >= date('now', '-12 weeks')
            GROUP BY strftime('%Y-W%W', start_date)
            ORDER BY period_date ASC
          `;
          dateFormat = 'yyyy-\\WW';
          break;
          
        default: // monthly
          sql = `
            SELECT 
              strftime('%Y-%m', start_date) as period_date,
              COUNT(*) as reservations_count,
              SUM(total_price) as total_revenue,
              AVG(total_price) as avg_reservation_value,
              COUNT(DISTINCT user_id) as unique_customers
            FROM Reservations 
            WHERE status IN ('confirmado', 'completado')
              AND start_date >= date('now', '-${months} months')
            GROUP BY strftime('%Y-%m', start_date)
            ORDER BY period_date ASC
          `;
          dateFormat = 'yyyy-MM';
          break;
      }

      const results = await runQuery(sql);
      
      return {
        period,
        data: results.map(row => ({
          date: row.period_date,
          reservations: row.reservations_count || 0,
          revenue: parseFloat(row.total_revenue || 0),
          averageValue: parseFloat(row.avg_reservation_value || 0),
          uniqueCustomers: row.unique_customers || 0
        })),
        summary: {
          totalRevenue: results.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0),
          totalReservations: results.reduce((sum, row) => sum + (row.reservations_count || 0), 0),
          averagePeriodRevenue: results.length > 0 ? 
            results.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0) / results.length : 0
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting revenue analysis:', error);
      throw error;
    }
  }

  /**
   * Análisis de ocupación por cabaña
   */
  async getCabinOccupancyAnalysis(startDate = null, endDate = null) {
    try {
      // Si no se especifican fechas, usar últimos 3 meses
      const start = startDate || format(subMonths(new Date(), 3), 'yyyy-MM-dd');
      const end = endDate || format(new Date(), 'yyyy-MM-dd');

      const sql = `
        SELECT 
          c.cabin_id,
          c.name as cabin_name,
          c.capacity,
          c.price,
          COUNT(r.reservation_id) as total_reservations,
          SUM(julianday(r.end_date) - julianday(r.start_date)) as total_nights_booked,
          SUM(r.total_price) as total_revenue,
          AVG(r.total_price) as avg_reservation_value,
          COUNT(DISTINCT r.user_id) as unique_guests,
          
          -- Calcular tasa de ocupación
          ROUND(
            (SUM(julianday(r.end_date) - julianday(r.start_date)) * 100.0) / 
            (julianday(?) - julianday(?)), 2
          ) as occupancy_rate
          
        FROM Cabins c
        LEFT JOIN Reservations r ON c.cabin_id = r.cabin_id 
          AND r.status IN ('confirmado', 'completado')
          AND r.start_date >= ?
          AND r.end_date <= ?
        WHERE c.is_active = 1
        GROUP BY c.cabin_id, c.name, c.capacity, c.price
        ORDER BY total_revenue DESC
      `;

      const results = await runQuery(sql, [end, start, start, end]);
      
      return {
        period: { start, end },
        cabins: results.map(row => ({
          cabinId: row.cabin_id,
          name: row.cabin_name,
          capacity: row.capacity,
          pricePerNight: parseFloat(row.price || 0),
          totalReservations: row.total_reservations || 0,
          totalNightsBooked: row.total_nights_booked || 0,
          totalRevenue: parseFloat(row.total_revenue || 0),
          averageReservationValue: parseFloat(row.avg_reservation_value || 0),
          uniqueGuests: row.unique_guests || 0,
          occupancyRate: parseFloat(row.occupancy_rate || 0)
        })),
        summary: {
          totalCabins: results.length,
          averageOccupancyRate: results.length > 0 ? 
            results.reduce((sum, row) => sum + parseFloat(row.occupancy_rate || 0), 0) / results.length : 0,
          bestPerformingCabin: results[0] || null,
          totalRevenueAllCabins: results.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0)
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting cabin occupancy analysis:', error);
      throw error;
    }
  }

  /**
   * Análisis de comportamiento de usuarios
   */
  async getUserBehaviorAnalysis() {
    try {
      const queries = await Promise.all([
        // Usuarios más activos
        runQuery(`
          SELECT 
            u.user_id,
            u.name,
            u.phone_number,
            COUNT(r.reservation_id) as total_reservations,
            SUM(r.total_price) as lifetime_value,
            MAX(r.created_at) as last_reservation_date,
            AVG(r.total_price) as avg_reservation_value
          FROM Users u
          LEFT JOIN Reservations r ON u.user_id = r.user_id
          WHERE r.status IN ('confirmado', 'completado')
          GROUP BY u.user_id, u.name, u.phone_number
          HAVING total_reservations > 0
          ORDER BY lifetime_value DESC
          LIMIT 20
        `),
        
        // Análisis de nuevos vs recurrentes
        runQuery(`
          SELECT 
            'new_customers' as customer_type,
            COUNT(DISTINCT u.user_id) as count,
            SUM(r.total_price) as revenue
          FROM Users u
          JOIN Reservations r ON u.user_id = r.user_id
          WHERE u.created_at >= date('now', '-30 days')
            AND r.status IN ('confirmado', 'completado')
          
          UNION ALL
          
          SELECT 
            'returning_customers' as customer_type,
            COUNT(DISTINCT u.user_id) as count,
            SUM(r.total_price) as revenue
          FROM Users u
          JOIN Reservations r ON u.user_id = r.user_id
          WHERE u.created_at < date('now', '-30 days')
            AND r.status IN ('confirmado', 'completado')
            AND r.created_at >= date('now', '-30 days')
        `),

        // Análisis de cancelaciones
        runQuery(`
          SELECT 
            COUNT(*) as total_cancellations,
            AVG(julianday(updated_at) - julianday(created_at)) as avg_days_to_cancel,
            strftime('%Y-%m', created_at) as month
          FROM Reservations
          WHERE status = 'cancelado'
            AND created_at >= date('now', '-6 months')
          GROUP BY strftime('%Y-%m', created_at)
          ORDER BY month ASC
        `)
      ]);

      return {
        topCustomers: queries[0].map(row => ({
          userId: row.user_id,
          name: row.name,
          phoneNumber: row.phone_number,
          totalReservations: row.total_reservations,
          lifetimeValue: parseFloat(row.lifetime_value || 0),
          lastReservation: row.last_reservation_date,
          averageReservationValue: parseFloat(row.avg_reservation_value || 0)
        })),
        customerSegmentation: queries[1].map(row => ({
          type: row.customer_type,
          count: row.count,
          revenue: parseFloat(row.revenue || 0)
        })),
        cancellationAnalysis: queries[2].map(row => ({
          month: row.month,
          totalCancellations: row.total_cancellations,
          averageDaysToCancel: parseFloat(row.avg_days_to_cancel || 0)
        }))
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting user behavior analysis:', error);
      throw error;
    }
  }

  /**
   * Predicciones y tendencias
   */
  async getPredictionsAndTrends() {
    try {
      // Análisis de tendencias de reservas por día de la semana
      const weekdayTrends = await runQuery(`
        SELECT 
          CASE strftime('%w', start_date)
            WHEN '0' THEN 'Domingo'
            WHEN '1' THEN 'Lunes'
            WHEN '2' THEN 'Martes'
            WHEN '3' THEN 'Miércoles'
            WHEN '4' THEN 'Jueves'
            WHEN '5' THEN 'Viernes'
            WHEN '6' THEN 'Sábado'
          END as day_of_week,
          COUNT(*) as reservations_count,
          AVG(total_price) as avg_price,
          strftime('%w', start_date) as day_number
        FROM Reservations
        WHERE status IN ('confirmado', 'completado')
          AND start_date >= date('now', '-3 months')
        GROUP BY strftime('%w', start_date)
        ORDER BY day_number
      `);

      // Tendencias estacionales
      const seasonalTrends = await runQuery(`
        SELECT 
          strftime('%m', start_date) as month_number,
          CASE strftime('%m', start_date)
            WHEN '01' THEN 'Enero'
            WHEN '02' THEN 'Febrero'
            WHEN '03' THEN 'Marzo'
            WHEN '04' THEN 'Abril'
            WHEN '05' THEN 'Mayo'
            WHEN '06' THEN 'Junio'
            WHEN '07' THEN 'Julio'
            WHEN '08' THEN 'Agosto'
            WHEN '09' THEN 'Septiembre'
            WHEN '10' THEN 'Octubre'
            WHEN '11' THEN 'Noviembre'
            WHEN '12' THEN 'Diciembre'
          END as month_name,
          COUNT(*) as reservations_count,
          AVG(total_price) as avg_revenue,
          SUM(total_price) as total_revenue
        FROM Reservations
        WHERE status IN ('confirmado', 'completado')
        GROUP BY strftime('%m', start_date)
        ORDER BY month_number
      `);

      return {
        weekdayTrends: weekdayTrends.map(row => ({
          dayOfWeek: row.day_of_week,
          dayNumber: parseInt(row.day_number),
          reservationsCount: row.reservations_count,
          averagePrice: parseFloat(row.avg_price || 0)
        })),
        seasonalTrends: seasonalTrends.map(row => ({
          month: row.month_name,
          monthNumber: parseInt(row.month_number),
          reservationsCount: row.reservations_count,
          averageRevenue: parseFloat(row.avg_revenue || 0),
          totalRevenue: parseFloat(row.total_revenue || 0)
        }))
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting predictions and trends:', error);
      throw error;
    }
  }

  // Métodos auxiliares
  async getTotalUsers() {
    const result = await runQuery('SELECT COUNT(*) as count FROM Users');
    return result[0]?.count || 0;
  }

  async getTotalReservations() {
    const result = await runQuery('SELECT COUNT(*) as count FROM Reservations');
    return result[0]?.count || 0;
  }

  async getTotalRevenue() {
    const result = await runQuery(`
      SELECT SUM(total_price) as total 
      FROM Reservations 
      WHERE status IN ('confirmado', 'completado')
    `);
    return parseFloat(result[0]?.total || 0);
  }

  async getActiveReservations() {
    const result = await runQuery(`
      SELECT COUNT(*) as count 
      FROM Reservations 
      WHERE status = 'confirmado' 
        AND start_date >= date('now')
    `);
    return result[0]?.count || 0;
  }

  async getOccupancyRate() {
    const result = await runQuery(`
      SELECT 
        ROUND(
          (COUNT(DISTINCT r.reservation_id) * 100.0) / 
          (COUNT(DISTINCT c.cabin_id) * 30), 2
        ) as rate
      FROM Cabins c
      LEFT JOIN Reservations r ON c.cabin_id = r.cabin_id 
        AND r.status IN ('confirmado', 'completado')
        AND r.start_date >= date('now', '-30 days')
      WHERE c.is_active = 1
    `);
    return parseFloat(result[0]?.rate || 0);
  }

  async getAverageReservationValue() {
    const result = await runQuery(`
      SELECT AVG(total_price) as avg 
      FROM Reservations 
      WHERE status IN ('confirmado', 'completado')
    `);
    return parseFloat(result[0]?.avg || 0);
  }

  async getNewUsersThisMonth() {
    const result = await runQuery(`
      SELECT COUNT(*) as count 
      FROM Users 
      WHERE created_at >= date('now', 'start of month')
    `);
    return result[0]?.count || 0;
  }

  async getRevenueGrowth() {
    const results = await runQuery(`
      SELECT 
        strftime('%Y-%m', start_date) as month,
        SUM(total_price) as revenue
      FROM Reservations 
      WHERE status IN ('confirmado', 'completado')
        AND start_date >= date('now', '-2 months')
      GROUP BY strftime('%Y-%m', start_date)
      ORDER BY month DESC
      LIMIT 2
    `);

    if (results.length >= 2) {
      const currentMonth = parseFloat(results[0]?.revenue || 0);
      const previousMonth = parseFloat(results[1]?.revenue || 0);
      
      if (previousMonth > 0) {
        return ((currentMonth - previousMonth) / previousMonth) * 100;
      }
    }
    
    return 0;
  }
}

module.exports = new AnalyticsService();
