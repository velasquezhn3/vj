const express = require('express');
const router = express.Router();
const db = require('../db');
const analyticsService = require('../services/analyticsService');

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Métricas generales del dashboard
 *     description: Obtiene todas las métricas principales del sistema de gestión
 *     responses:
 *       200:
 *         description: Métricas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 */
// GET / (ruta raíz del dashboard - /admin/dashboard)
router.get('/', async (req, res) => {
  try {
    const metrics = await analyticsService.getDashboardMetrics();
    
    res.json({
      success: true,
      data: metrics,
      message: 'Dashboard metrics retrieved successfully'
    });
  } catch (error) {
    console.error('[DASHBOARD] Error fetching dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard data',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /admin/dashboard/revenue:
 *   get:
 *     tags: [Dashboard]
 *     summary: Análisis de ingresos por período
 *     description: Obtiene análisis detallado de ingresos con gráficos temporales
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: monthly
 *         description: Período de análisis
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 24
 *           default: 12
 *         description: Número de períodos a analizar
 *     responses:
 *       200:
 *         description: Análisis de ingresos obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       example: monthly
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             example: 2024-08
 *                           reservations:
 *                             type: integer
 *                             example: 15
 *                           revenue:
 *                             type: number
 *                             example: 4500.00
 *                           averageValue:
 *                             type: number
 *                             example: 300.00
 *                           uniqueCustomers:
 *                             type: integer
 *                             example: 12
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                           example: 54000.00
 *                         totalReservations:
 *                           type: integer
 *                           example: 180
 *                         averagePeriodRevenue:
 *                           type: number
 *                           example: 4500.00
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 */
// GET /revenue - Análisis de ingresos
router.get('/revenue', async (req, res) => {
  try {
    const { period = 'monthly', months = 12 } = req.query;
    
    // Validar parámetros
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Período inválido. Use: daily, weekly, monthly',
        error: 'INVALID_PERIOD'
      });
    }

    const monthsNum = parseInt(months);
    if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
      return res.status(400).json({
        success: false,
        message: 'Número de meses debe estar entre 1 y 24',
        error: 'INVALID_MONTHS'
      });
    }

    const analysis = await analyticsService.getRevenueAnalysis(period, monthsNum);
    
    res.json({
      success: true,
      data: analysis,
      message: 'Revenue analysis retrieved successfully'
    });
  } catch (error) {
    console.error('[DASHBOARD] Error getting revenue analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting revenue analysis',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /admin/dashboard/occupancy:
 *   get:
 *     tags: [Dashboard]
 *     summary: Análisis de ocupación de cabañas
 *     description: Obtiene análisis detallado de ocupación por cabaña con métricas de rendimiento
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *           example: 2024-05-01
 *         description: Fecha de inicio del análisis (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *           example: 2024-08-01
 *         description: Fecha de fin del análisis (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Análisis de ocupación obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date
 *                           example: 2024-05-01
 *                         end:
 *                           type: string
 *                           format: date
 *                           example: 2024-08-01
 *                     cabins:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           cabinId:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: Cabaña Romántica
 *                           capacity:
 *                             type: integer
 *                             example: 2
 *                           pricePerNight:
 *                             type: number
 *                             example: 150.00
 *                           totalReservations:
 *                             type: integer
 *                             example: 25
 *                           totalNightsBooked:
 *                             type: number
 *                             example: 45
 *                           totalRevenue:
 *                             type: number
 *                             example: 6750.00
 *                           occupancyRate:
 *                             type: number
 *                             example: 75.5
 *                           uniqueGuests:
 *                             type: integer
 *                             example: 20
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalCabins:
 *                           type: integer
 *                           example: 8
 *                         averageOccupancyRate:
 *                           type: number
 *                           example: 68.2
 *                         bestPerformingCabin:
 *                           type: object
 *                         totalRevenueAllCabins:
 *                           type: number
 *                           example: 45600.00
 *       400:
 *         description: Fechas inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 */
// GET /occupancy - Análisis de ocupación por cabaña
router.get('/occupancy', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Validar fechas si se proporcionan
    if (start_date && isNaN(Date.parse(start_date))) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de inicio inválida. Use formato YYYY-MM-DD',
        error: 'INVALID_START_DATE'
      });
    }

    if (end_date && isNaN(Date.parse(end_date))) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de fin inválida. Use formato YYYY-MM-DD',
        error: 'INVALID_END_DATE'
      });
    }

    const analysis = await analyticsService.getCabinOccupancyAnalysis(start_date, end_date);
    
    res.json({
      success: true,
      data: analysis,
      message: 'Occupancy analysis retrieved successfully'
    });
  } catch (error) {
    console.error('[DASHBOARD] Error getting occupancy analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting occupancy analysis',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /admin/dashboard/users:
 *   get:
 *     tags: [Dashboard]
 *     summary: Análisis de comportamiento de usuarios
 *     description: Obtiene análisis detallado del comportamiento de usuarios y segmentación de clientes
 *     responses:
 *       200:
 *         description: Análisis de usuarios obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     topCustomers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: integer
 *                             example: 5
 *                           name:
 *                             type: string
 *                             example: María González
 *                           phoneNumber:
 *                             type: string
 *                             example: +50412345678
 *                           totalReservations:
 *                             type: integer
 *                             example: 8
 *                           lifetimeValue:
 *                             type: number
 *                             example: 2400.00
 *                           lastReservation:
 *                             type: string
 *                             format: date-time
 *                           averageReservationValue:
 *                             type: number
 *                             example: 300.00
 *                     customerSegmentation:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: new_customers
 *                           count:
 *                             type: integer
 *                             example: 25
 *                           revenue:
 *                             type: number
 *                             example: 7500.00
 *                     cancellationAnalysis:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             example: 2024-08
 *                           totalCancellations:
 *                             type: integer
 *                             example: 3
 *                           averageDaysToCancel:
 *                             type: number
 *                             example: 5.2
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 */
// GET /users - Análisis de comportamiento de usuarios
router.get('/users', async (req, res) => {
  try {
    const analysis = await analyticsService.getUserBehaviorAnalysis();
    
    res.json({
      success: true,
      data: analysis,
      message: 'User behavior analysis retrieved successfully'
    });
  } catch (error) {
    console.error('[DASHBOARD] Error getting user behavior analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user behavior analysis',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /admin/dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Predicciones y análisis de tendencias
 *     description: Obtiene análisis de tendencias estacionales y predicciones de demanda
 *     responses:
 *       200:
 *         description: Análisis de tendencias obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     weekdayTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           dayOfWeek:
 *                             type: string
 *                             example: Viernes
 *                           dayNumber:
 *                             type: integer
 *                             example: 5
 *                           reservationsCount:
 *                             type: integer
 *                             example: 45
 *                           averagePrice:
 *                             type: number
 *                             example: 320.00
 *                     seasonalTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             example: Agosto
 *                           monthNumber:
 *                             type: integer
 *                             example: 8
 *                           reservationsCount:
 *                             type: integer
 *                             example: 65
 *                           averageRevenue:
 *                             type: number
 *                             example: 350.00
 *                           totalRevenue:
 *                             type: number
 *                             example: 22750.00
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 */
// GET /trends - Predicciones y tendencias
router.get('/trends', async (req, res) => {
  try {
    const analysis = await analyticsService.getPredictionsAndTrends();
    
    res.json({
      success: true,
      data: analysis,
      message: 'Trends analysis retrieved successfully'
    });
  } catch (error) {
    console.error('[DASHBOARD] Error getting trends analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting trends analysis',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

module.exports = router;
