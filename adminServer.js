const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Importar configuración de Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Importar middlewares de seguridad
// Rutas de huéspedes (usuarios normales)
const usersRoutes = require('./routes/users');
const { helmetConfig, generalLimiter, securityLogger, sanitizeInput, attackDetection } = require('./middleware/security');
const { authenticateToken, authorizeRole, rateLimitByUser } = require('./middleware/auth');
const { advancedSecurityMiddleware, enhancedValidationHandler } = require('./middleware/advancedValidation');
const { 
  validateUserCreation, 
  validateUserUpdate, 
  validateReservationCreation, 
  validateReservationUpdate,
  validateId,
  validateLogin,
  validateDateQuery,
  validateSearchQuery,
  validatePagination,
  sanitizeInput: validationSanitize
} = require('./middleware/validation');

// Importar validaciones avanzadas
const { 
  advancedUserValidation, 
  advancedReservationValidation 
} = require('./middleware/advancedValidation');

const db = require('./db');
const { runQuery, runExecute } = require('./db');
const usersService = require('./services/usersService');
const alojamientosService = require('./services/alojamientosService');
const actividadesService = require('./services/actividadesService');
const backupService = require('./services/backupService');

const app = express();
const PORT = 4000;

// ============================================================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================================================

// Headers de seguridad
app.use(helmetConfig);

// Logging de seguridad
app.use(securityLogger);

// Rate limiting general - DESACTIVADO PARA DESARROLLO
// app.use('/admin', generalLimiter);

// CORS configurado
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parseo de body
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Sanitización de entrada
app.use(sanitizeInput);

// Sanitización adicional para validación
app.use(validationSanitize);

// Detección de ataques
app.use(attackDetection);

// Validación de seguridad avanzada (NUEVO)
app.use(advancedSecurityMiddleware);

// Rate limiting específico para usuarios autenticados en rutas admin - DESACTIVADO PARA DESARROLLO

// Rutas de huéspedes (usuarios normales, no admins)
app.use('/users', usersRoutes);
// app.use('/admin', rateLimitByUser(200, 15 * 60 * 1000)); // 200 requests por 15 min

// Serve static files for simple frontend UI
const path = require('path');
app.use('/comprobantes', express.static(path.join(__dirname, 'public/comprobantes')));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// DOCUMENTACIÓN SWAGGER
// ============================================================================

/**
 * @swagger
 * components:
 *   parameters:
 *     LimitParam:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *       description: Número máximo de resultados a retornar
 *     OffsetParam:
 *       in: query
 *       name: offset
 *       schema:
 *         type: integer
 *         minimum: 0
 *         default: 0
 *       description: Número de resultados a omitir
 *     SearchParam:
 *       in: query
 *       name: search
 *       schema:
 *         type: string
 *         maxLength: 100
 *       description: Término de búsqueda para filtrar resultados
 */

// Configurar Swagger UI
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Bot Villas Julie - API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list'
  }
}));

// ============================================================================
// RUTAS DE AUTENTICACIÓN (SIN PROTECCIÓN)
// ============================================================================

// Rutas de autenticación
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check del servidor
 *     description: Verifica que el servidor esté funcionando correctamente
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Servidor funcionando correctamente
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-08-04T22:42:21.105Z
 *     security: []
 */
// Health check endpoint (sin autenticación)
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString() 
  });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Cerrar sesión
 *     description: Revoca el token JWT actual del usuario autenticado
 *     responses:
 *       200:
 *         description: Logout exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout exitoso
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
// Logout endpoint (requiere autenticación)
app.post('/auth/logout', authenticateToken, (req, res) => {
  try {
    const { revokeToken } = require('./middleware/auth');
    const token = req.authToken;
    
    if (token) {
      revokeToken(token);
    }
    
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('[AUTH] Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error en logout'
    });
  }
});

// Security testing endpoint (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.post('/dev/security-test', (req, res) => {
    const { detectSecurityThreats } = require('./middleware/advancedValidation');
    
    const testData = req.body.testData || '';
    const threats = detectSecurityThreats(testData, req);
    
    res.json({
      success: true,
      input: testData,
      threatsDetected: threats.length,
      threats: threats,
      message: threats.length > 0 ? 'Amenazas detectadas' : 'Input seguro'
    });
  });
}

// ============================================================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ============================================================================

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuarios del sistema
 *     description: Obtiene la lista de todos los usuarios registrados con paginación y búsqueda
 *     parameters:
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/OffsetParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationParams'
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
// Users routes (PROTEGIDAS)
app.get('/admin/users', authenticateToken, validatePagination, validateSearchQuery, async (req, res) => {
  try {
    const users = await usersService.listUsers();
    res.json(users);
  } catch (error) {
    console.error('[ADMIN] Error obteniendo usuarios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo usuarios',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

/**
 * @swagger
 * /admin/users:
 *   post:
 *     tags: [Users]
 *     summary: Crear nuevo usuario
 *     description: Crea un nuevo usuario en el sistema (requiere permisos de admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       200:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 userId:
 *                   type: integer
 *                   example: 123
 *                 message:
 *                   type: string
 *                   example: Usuario creado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
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
 *       403:
 *         description: Permisos insuficientes
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
app.post('/admin/users', authenticateToken, authorizeRole('admin', 'superadmin'), advancedUserValidation, async (req, res) => {
  try {
    const userId = await usersService.createUser(req.body);
    res.json({ 
      success: !!userId, 
      userId,
      message: userId ? 'Usuario creado exitosamente' : 'Error creando usuario'
    });
  } catch (error) {
    console.error('[ADMIN] Error creando usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creando usuario',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

app.put('/admin/users/:id', authenticateToken, authorizeRole('admin', 'superadmin'), advancedUserValidation, async (req, res) => {
  try {
    const success = await usersService.updateUser(parseInt(req.params.id), req.body);
    res.json({ 
      success,
      message: success ? 'Usuario actualizado exitosamente' : 'Error actualizando usuario'
    });
  } catch (error) {
    console.error('[ADMIN] Error actualizando usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error actualizando usuario',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

const adminCabinsController = require('./controllers/adminCabinsController');

// Cabins routes (PROTEGIDAS)
app.get('/admin/cabins', authenticateToken, adminCabinsController.getAllCabanas);

// Get occupied dates for a specific cabin
app.get('/admin/cabins/:id/occupied-dates', authenticateToken, validateId, async (req, res) => {
  try {
    const cabinId = parseInt(req.params.id);
    
    const query = `
      SELECT start_date, end_date 
      FROM Reservations 
      WHERE cabin_id = ? AND status IN ('confirmada', 'confirmado', 'pendiente')
    `;
    
    db.all(query, [cabinId], (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Error consultando fechas ocupadas' });
      }
      
      const occupiedDates = [];
      rows.forEach(reservation => {
        const start = new Date(reservation.start_date);
        const end = new Date(reservation.end_date);
        
        // Add all dates between start and end (inclusive)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          occupiedDates.push(d.toISOString().split('T')[0]);
        }
      });
      
      res.json({ success: true, data: occupiedDates });
    });
  } catch (error) {
    console.error('Error in occupied dates endpoint:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

app.post('/admin/cabins', authenticateToken, upload.single('photo'), adminCabinsController.createCabana);

app.put('/admin/cabins/:id', authenticateToken, upload.single('photo'), adminCabinsController.updateCabana);

app.delete('/admin/cabins/:id', authenticateToken, validateId, adminCabinsController.deleteCabana);

const adminReservationsRoutes = require('./routes/adminReservations');

// Reservations routes (PROTEGIDAS)
// Aplicar autenticación a todas las rutas de reservas
app.use('/admin/reservations', authenticateToken, adminReservationsRoutes);

const conversationStatesService = require('./services/conversationStatesService');

const adminDashboardRoutes = require('./routes/adminDashboard');
const adminCabinTypesRoutes = require('./routes/adminCabinTypes');
const adminUsersRoutes = require('./routes/adminUsers');

// Dashboard, Cabin Types y Admin Users routes (PROTEGIDAS)
app.use('/admin/dashboard', authenticateToken, adminDashboardRoutes);
app.use('/admin/cabin-types', authenticateToken, adminCabinTypesRoutes);
app.use('/admin/admin-users', authenticateToken, adminUsersRoutes);

// Activities routes (PROTEGIDAS)
const fs = require('fs');

app.get('/admin/activities', authenticateToken, async (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'actividades.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const activities = JSON.parse(rawData);
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('[ADMIN] Error reading activities JSON:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error cargando actividades',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

app.post('/admin/activities', authenticateToken, async (req, res) => {
  try {
    const activity = req.body;
    const newId = await actividadesService.createActivity(activity);
    if (newId) {
      res.json({ 
        success: true, 
        activityId: newId,
        message: 'Actividad creada exitosamente'
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Error creando actividad' 
      });
    }
  } catch (error) {
    console.error('[ADMIN] Error creando actividad:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno creando actividad',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

app.put('/admin/activities/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const activity = req.body;
    const success = await actividadesService.updateActivity(id, activity);
    if (success) {
      res.json({ 
        success: true,
        message: 'Actividad actualizada exitosamente'
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Error actualizando actividad' 
      });
    }
  } catch (error) {
    console.error('[ADMIN] Error actualizando actividad:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno actualizando actividad',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

app.delete('/admin/activities/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await actividadesService.deleteActivity(id);
    if (success) {
      res.json({ 
        success: true,
        message: 'Actividad eliminada exitosamente'
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Error eliminando actividad' 
      });
    }
  } catch (error) {
    console.error('[ADMIN] Error eliminando actividad:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno eliminando actividad',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

// Conversation States routes (PROTEGIDAS)
app.get('/admin/conversation-states', authenticateToken, async (req, res) => {
  try {
    const states = await conversationStatesService.getAllStates();
    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    console.error('[ADMIN] Error obteniendo states:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo conversation states',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

app.post('/admin/conversation-states', authenticateToken, async (req, res) => {
  try {
    const success = await conversationStatesService.createState(req.body);
    res.json({ 
      success,
      message: success ? 'Estado creado exitosamente' : 'Error creando estado'
    });
  } catch (error) {
    console.error('[ADMIN] Error creando state:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno creando estado',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

app.put('/admin/conversation-states/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await conversationStatesService.updateState(id, req.body);
    res.json({ 
      success,
      message: success ? 'Estado actualizado exitosamente' : 'Error actualizando estado'
    });
  } catch (error) {
    console.error('[ADMIN] Error actualizando state:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno actualizando estado',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

app.delete('/admin/conversation-states/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await conversationStatesService.deleteState(id);
    res.json({ 
      success,
      message: success ? 'Estado eliminado exitosamente' : 'Error eliminando estado'
    });
  } catch (error) {
    console.error('[ADMIN] Error eliminando state:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno eliminando estado',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

/**
 * @swagger
 * /admin/calendar-occupancy:
 *   get:
 *     tags: [Calendar]
 *     summary: Obtener calendario de ocupación
 *     description: Retorna el estado de ocupación de todas las cabañas para un mes específico
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2030
 *           example: 2024
 *         description: Año del calendario (por defecto año actual)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           example: 8
 *         description: Mes del calendario (1-12, por defecto mes actual)
 *     responses:
 *       200:
 *         description: Calendario de ocupación obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CalendarOccupancy'
 *       400:
 *         description: Parámetros de fecha inválidos
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
// Calendar/Ocupacion endpoint (PROTEGIDO)
app.get('/admin/calendar-occupancy', authenticateToken, validateDateQuery, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Obtener todas las cabañas
    const cabinsSQL = 'SELECT * FROM Cabins ORDER BY cabin_id';
    const cabins = await runQuery(cabinsSQL);
    
    // Obtener reservas del mes especificado
    const reservationsSQL = `
      SELECT r.*, c.name as cabin_name
      FROM Reservations r
      LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
      WHERE strftime('%Y', r.start_date) = ? AND strftime('%m', r.start_date) = ?
         OR strftime('%Y', r.end_date) = ? AND strftime('%m', r.end_date) = ?
         OR (r.start_date <= ? AND r.end_date >= ?)
    `;
    
    const yearStr = year || new Date().getFullYear().toString();
    const monthStr = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
    const firstDay = `${yearStr}-${monthStr}-01`;
    const lastDay = `${yearStr}-${monthStr}-31`;
    
    const reservations = await runQuery(reservationsSQL, [
      yearStr, monthStr, yearStr, monthStr, lastDay, firstDay
    ]);
    
    // Crear objeto de ocupación
    const ocupacion = {};
    
    reservations.forEach(reservation => {
      const cabinId = reservation.cabin_id;
      if (!ocupacion[cabinId]) ocupacion[cabinId] = {};
      
      const startDate = new Date(reservation.start_date);
      const endDate = new Date(reservation.end_date);
      
      // Marcar todos los días entre start_date y end_date
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        ocupacion[cabinId][dateStr] = reservation.status;
      }
    });
    
    res.json({
      success: true,
      data: {
        cabanas: cabins.map(cabin => ({
          id: cabin.cabin_id,
          nombre: cabin.name,
          capacidad: cabin.capacity,
          descripcion: cabin.description
        })),
        ocupacion,
        year: parseInt(yearStr),
        month: parseInt(monthStr)
      }
    });
    
  } catch (error) {
    console.error('[ADMIN] Error fetching calendar occupancy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo datos del calendario',
      error: 'INTERNAL_SERVER_ERROR' 
    });
  }
});

// ============================================================================
// RUTAS DE BACKUP (PROTEGIDAS)
// ============================================================================

/**
 * @swagger
 * /admin/backup/status:
 *   get:
 *     tags: [Backup]
 *     summary: Estado del servicio de backup
 *     description: Obtiene estadísticas y estado actual del sistema de backup automático
 *     responses:
 *       200:
 *         description: Estado del backup obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BackupStatus'
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

// GET /admin/backup/status - Estado del servicio de backup
app.get('/admin/backup/status', authenticateToken, async (req, res) => {
  try {
    const stats = backupService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[BACKUP] Error obteniendo estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado del backup',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /admin/backup/list:
 *   get:
 *     tags: [Backup]
 *     summary: Listar backups disponibles
 *     description: Obtiene la lista de todos los archivos de backup disponibles para restauración
 *     responses:
 *       200:
 *         description: Lista de backups obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BackupFile'
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
// GET /admin/backup/list - Listar backups disponibles
app.get('/admin/backup/list', authenticateToken, async (req, res) => {
  try {
    const backups = backupService.listBackups();
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('[BACKUP] Error listando backups:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando backups',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /admin/backup/create:
 *   post:
 *     tags: [Backup]
 *     summary: Crear backup manual
 *     description: Crea un backup manual de la base de datos inmediatamente
 *     responses:
 *       200:
 *         description: Backup creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Backup creado exitosamente
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
// POST /admin/backup/create - Crear backup manual
app.post('/admin/backup/create', authenticateToken, async (req, res) => {
  try {
    console.log('[BACKUP] Backup manual solicitado por admin');
    const success = await backupService.createBackup();
    
    res.json({
      success,
      message: success ? 'Backup creado exitosamente' : 'Error creando backup'
    });
  } catch (error) {
    console.error('[BACKUP] Error en backup manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando backup manual',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * @swagger
 * /admin/backup/restore:
 *   post:
 *     tags: [Backup]
 *     summary: Restaurar backup
 *     description: Restaura la base de datos desde un archivo de backup específico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *                 example: backup_2024-08-04_143025.sql
 *                 description: Nombre del archivo de backup a restaurar
 *     responses:
 *       200:
 *         description: Backup restaurado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Backup restaurado exitosamente
 *       400:
 *         description: Nombre de archivo requerido
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
// POST /admin/backup/restore - Restaurar backup
app.post('/admin/backup/restore', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de archivo requerido'
      });
    }
    
    console.log(`[BACKUP] Restauración solicitada: ${filename}`);
    const success = await backupService.restoreBackup(filename);
    
    res.json({
      success,
      message: success ? 'Backup restaurado exitosamente' : 'Error restaurando backup'
    });
  } catch (error) {
    console.error('[BACKUP] Error en restauración:', error);
    res.status(500).json({
      success: false,
      message: 'Error restaurando backup',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Admin server running at http://localhost:${PORT}`);
  
  // Iniciar servicio de backup automático
  console.log('🔄 Iniciando servicio de backup automático...');
  backupService.start();
});
