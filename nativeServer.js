// Servidor HTTP nativo con SQLite - SIN EXPRESS
const http = require('http');
const url = require('url');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const PORT = 3000;
const JWT_SECRET = 'your-secret-key-here';

// Conectar a la base de datos SQLite
const dbPath = path.join(__dirname, 'bot_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a SQLite:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
    console.log(`📁 Archivo: ${dbPath}`);
  }
});

// Función helper para promisificar consultas SQLite
function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('SQL Error:', err.message);
        console.error('Query:', sql);
        console.error('Params:', params);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Función para parsear JSON del body
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Función para enviar respuesta JSON
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Permitir cualquier origen por ahora
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.end(JSON.stringify(data));
}

// Función para verificar token JWT
function verifyToken(authHeader) {
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Crear servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;

  console.log(`${new Date().toISOString()} - ${method} ${path}`);

  try {
    // Manejar preflight OPTIONS
    if (method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      });
      res.end();
      return;
    }

    // ========================================================================
    // RUTA DE PRUEBA
    // ========================================================================
    if (path === '/test' && method === 'GET') {
      // Probar conexión a base de datos
      try {
        const testResult = await dbQuery('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
        sendJSON(res, {
          success: true,
          message: 'Servidor HTTP nativo funcionando',
          timestamp: new Date().toISOString(),
          database: 'SQLite conectado',
          dbPath: dbPath,
          tables: testResult[0].count
        });
      } catch (dbError) {
        sendJSON(res, {
          success: false,
          message: 'Error de base de datos',
          error: dbError.message
        }, 500);
      }
      return;
    }

    // ========================================================================
    // LOGIN
    // ========================================================================
    if (path === '/auth/login' && method === 'POST') {
      const body = await parseJSONBody(req);
      const { username, password } = body;
      
      if (!username || !password) {
        sendJSON(res, {
          success: false,
          message: 'Usuario y contraseña requeridos'
        }, 400);
        return;
      }

      try {
        // Verificar si existe tabla admin_users
        let users = [];
        try {
          users = await dbQuery('SELECT * FROM admin_users WHERE username = ? AND is_active = 1', [username]);
        } catch (error) {
          // Si la tabla no existe, crear y usuario admin por defecto
          if (username === 'admin' && password === 'admin123') {
            console.log('📝 Creando tabla admin_users y usuario admin...');
            
            await dbQuery(`
              CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                role TEXT DEFAULT 'admin',
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `);
            
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await dbQuery(
              'INSERT OR REPLACE INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
              [username, hashedPassword, 'admin@example.com', 'admin']
            );
            
            users = await dbQuery('SELECT * FROM admin_users WHERE username = ?', [username]);
          }
        }

        if (users.length === 0) {
          sendJSON(res, {
            success: false,
            message: 'Credenciales inválidas'
          }, 401);
          return;
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
          sendJSON(res, {
            success: false,
            message: 'Credenciales inválidas'
          }, 401);
          return;
        }

        // Generar token
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        console.log(`✅ Login exitoso: ${user.username}`);

        sendJSON(res, {
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error en login:', error);
        sendJSON(res, {
          success: false,
          message: 'Error interno del servidor'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // VERIFICAR TOKEN (/auth/me)
    // ========================================================================
    if (path === '/auth/me' && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token inválido' }, 401);
        return;
      }

      try {
        // Buscar información completa del usuario
        const users = await dbQuery('SELECT * FROM admin_users WHERE id = ? AND is_active = 1', [user.id]);
        
        if (users.length === 0) {
          sendJSON(res, { success: false, message: 'Usuario no encontrado' }, 404);
          return;
        }

        const userData = users[0];
        sendJSON(res, {
          success: true,
          user: {
            id: userData.id,
            username: userData.username,
            role: userData.role,
            email: userData.email
          }
        });
      } catch (error) {
        console.error('Error verificando usuario:', error);
        sendJSON(res, {
          success: false,
          message: 'Error interno del servidor'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // RESERVAS UPCOMING
    // ========================================================================
    if (path === '/admin/reservations/upcoming' && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const sql = `
          SELECT 
            r.reservation_id, 
            r.cabin_id, 
            r.user_id, 
            r.start_date, 
            r.end_date, 
            r.status, 
            r.total_price,
            r.personas,
            u.name AS user_name,
            u.phone_number AS phone_number,
            c.name AS cabin_name,
            c.capacity AS cabin_capacity,
            CASE 
              WHEN date(r.start_date) BETWEEN date('now') AND date('now', '+3 days') THEN 'check_in'
              WHEN date(r.end_date) BETWEEN date('now') AND date('now', '+3 days') THEN 'check_out'
              ELSE 'other'
            END as event_type,
            CASE 
              WHEN date(r.start_date) = date('now') OR date(r.end_date) = date('now') THEN 'today'
              WHEN date(r.start_date) = date('now', '+1 day') OR date(r.end_date) = date('now', '+1 day') THEN 'tomorrow'
              ELSE 'later'
            END as urgency
          FROM Reservations r
          LEFT JOIN Users u ON r.user_id = u.user_id
          LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
          WHERE 
            (date(r.start_date) BETWEEN date('now') AND date('now', '+3 days') 
             OR date(r.end_date) BETWEEN date('now') AND date('now', '+3 days'))
            AND r.status IN ('confirmado', 'pendiente', 'confirmada')
          ORDER BY r.start_date ASC
          LIMIT 20
        `;
        
        const reservations = await dbQuery(sql);
        
        console.log(`📅 Reservas próximas: ${reservations.length}`);
        
        sendJSON(res, {
          success: true,
          data: reservations,
          metadata: { total: reservations.length }
        });
      } catch (error) {
        console.error('Error consultando reservas próximas:', error);
        sendJSON(res, {
          success: false,
          message: 'Error consultando reservas próximas'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // RESERVAS GENERALES
    // ========================================================================
    if (path.startsWith('/admin/reservations') && method === 'GET' && path !== '/admin/reservations/upcoming') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const limit = parseInt(query.limit) || 50;
        const offset = parseInt(query.offset) || 0;
        
        const sql = `
          SELECT 
            r.reservation_id, 
            r.cabin_id, 
            r.user_id, 
            r.start_date, 
            r.end_date, 
            r.status, 
            r.total_price,
            r.personas,
            u.name AS user_name,
            u.phone_number AS phone_number,
            c.name AS cabin_name,
            c.capacity AS cabin_capacity
          FROM Reservations r
          LEFT JOIN Users u ON r.user_id = u.user_id
          LEFT JOIN Cabins c ON r.cabin_id = c.cabin_id
          ORDER BY r.reservation_id DESC
          LIMIT ? OFFSET ?
        `;
        
        const reservations = await dbQuery(sql, [limit, offset]);
        const countResult = await dbQuery('SELECT COUNT(*) as total FROM Reservations');
        
        console.log(`📋 Reservas generales: ${reservations.length} de ${countResult[0].total}`);
        
        sendJSON(res, {
          success: true,
          data: reservations,
          pagination: {
            limit,
            offset,
            total: countResult[0].total
          }
        });
      } catch (error) {
        console.error('Error consultando reservas:', error);
        sendJSON(res, {
          success: false,
          message: 'Error consultando reservas'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // DASHBOARD
    // ========================================================================
    if (path === '/admin/dashboard' && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const usersResult = await dbQuery('SELECT COUNT(*) as total FROM Users');
        const reservationsResult = await dbQuery('SELECT COUNT(*) as total FROM Reservations');
        const revenueResult = await dbQuery('SELECT SUM(total_price) as total FROM Reservations WHERE status IN ("confirmado", "confirmada")');
        const cabinsResult = await dbQuery('SELECT COUNT(*) as total FROM Cabins');

        sendJSON(res, {
          success: true,
          data: {
            users: usersResult[0].total,
            reservations: reservationsResult[0].total,
            revenue: revenueResult[0].total || 0,
            cabins: cabinsResult[0].total
          }
        });
      } catch (error) {
        console.error('Error dashboard:', error);
        sendJSON(res, {
          success: false,
          message: 'Error obteniendo métricas'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // DASHBOARD REVENUE
    // ========================================================================
    if (path.startsWith('/admin/dashboard/revenue') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const period = query.period || 'monthly';
        
        // Consulta de ingresos por período
        let sql = '';
        if (period === 'monthly') {
          sql = `
            SELECT 
              strftime('%Y-%m', start_date) as period,
              SUM(total_price) as revenue,
              COUNT(*) as reservations
            FROM Reservations 
            WHERE status IN ('confirmado', 'confirmada')
              AND start_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', start_date)
            ORDER BY period ASC
          `;
        } else {
          sql = `
            SELECT 
              date(start_date) as period,
              SUM(total_price) as revenue,
              COUNT(*) as reservations
            FROM Reservations 
            WHERE status IN ('confirmado', 'confirmada')
              AND start_date >= date('now', '-30 days')
            GROUP BY date(start_date)
            ORDER BY period ASC
          `;
        }
        
        const revenueData = await dbQuery(sql);
        
        sendJSON(res, {
          success: true,
          data: revenueData
        });
      } catch (error) {
        console.error('Error revenue analytics:', error);
        sendJSON(res, {
          success: false,
          message: 'Error obteniendo datos de ingresos'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // DASHBOARD OCCUPANCY
    // ========================================================================
    if (path.startsWith('/admin/dashboard/occupancy') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const occupancyData = await dbQuery(`
          SELECT 
            c.name as cabin_name,
            COUNT(r.reservation_id) as total_reservations,
            AVG(julianday(r.end_date) - julianday(r.start_date)) as avg_stay_days
          FROM Cabins c
          LEFT JOIN Reservations r ON c.cabin_id = r.cabin_id 
            AND r.status IN ('confirmado', 'confirmada')
            AND r.start_date >= date('now', '-3 months')
          GROUP BY c.cabin_id, c.name
          ORDER BY total_reservations DESC
        `);
        
        sendJSON(res, {
          success: true,
          data: occupancyData
        });
      } catch (error) {
        console.error('Error occupancy analytics:', error);
        sendJSON(res, {
          success: false,
          message: 'Error obteniendo datos de ocupación'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // DASHBOARD USERS
    // ========================================================================
    if (path.startsWith('/admin/dashboard/users') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const usersData = await dbQuery(`
          SELECT 
            strftime('%Y-%m', created_at) as period,
            COUNT(*) as new_users
          FROM Users 
          WHERE created_at >= date('now', '-12 months')
          GROUP BY strftime('%Y-%m', created_at)
          ORDER BY period ASC
        `);
        
        const topUsers = await dbQuery(`
          SELECT 
            u.name,
            u.phone_number,
            COUNT(r.reservation_id) as total_reservations,
            SUM(r.total_price) as total_spent
          FROM Users u
          LEFT JOIN Reservations r ON u.user_id = r.user_id
            AND r.status IN ('confirmado', 'confirmada')
          GROUP BY u.user_id
          ORDER BY total_reservations DESC
          LIMIT 10
        `);
        
        sendJSON(res, {
          success: true,
          data: {
            growth: usersData,
            topUsers: topUsers
          }
        });
      } catch (error) {
        console.error('Error users analytics:', error);
        sendJSON(res, {
          success: false,
          message: 'Error obteniendo datos de usuarios'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // DASHBOARD TRENDS
    // ========================================================================
    if (path.startsWith('/admin/dashboard/trends') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const trends = await dbQuery(`
          SELECT 
            'reservations' as metric,
            COUNT(*) as current_month,
            (SELECT COUNT(*) FROM Reservations 
             WHERE start_date >= date('now', 'start of month', '-1 month') 
               AND start_date < date('now', 'start of month')
               AND status IN ('confirmado', 'confirmada')
            ) as previous_month
          FROM Reservations 
          WHERE start_date >= date('now', 'start of month')
            AND status IN ('confirmado', 'confirmada')
          
          UNION ALL
          
          SELECT 
            'revenue' as metric,
            SUM(total_price) as current_month,
            (SELECT SUM(total_price) FROM Reservations 
             WHERE start_date >= date('now', 'start of month', '-1 month') 
               AND start_date < date('now', 'start of month')
               AND status IN ('confirmado', 'confirmada')
            ) as previous_month
          FROM Reservations 
          WHERE start_date >= date('now', 'start of month')
            AND status IN ('confirmado', 'confirmada')
        `);
        
        sendJSON(res, {
          success: true,
          data: trends
        });
      } catch (error) {
        console.error('Error trends analytics:', error);
        sendJSON(res, {
          success: false,
          message: 'Error obteniendo tendencias'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // CALENDAR OCCUPANCY
    // ========================================================================
    if (path.startsWith('/admin/calendar-occupancy') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();
        const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;

        console.log(`📅 Calendar occupancy para ${year}-${month.toString().padStart(2, '0')}`);

        // Obtener todas las cabañas
        const cabanas = await dbQuery(`
          SELECT 
            cabin_id as id,
            name as nombre,
            capacity as capacidad
          FROM Cabins 
          ORDER BY cabin_id
        `);

        // Obtener reservas del mes especificado
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = month === 12 
          ? `${year + 1}-01-01` 
          : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

        const reservations = await dbQuery(`
          SELECT 
            cabin_id,
            start_date,
            end_date,
            status
          FROM Reservations 
          WHERE (start_date < ? AND end_date >= ?)
            OR (start_date >= ? AND start_date < ?)
          ORDER BY start_date
        `, [endDate, startDate, startDate, endDate]);

        // Crear mapa de ocupación
        const ocupacion = {};
        
        reservations.forEach(reservation => {
          const cabinId = reservation.cabin_id;
          const startDate = new Date(reservation.start_date);
          const endDate = new Date(reservation.end_date);
          
          if (!ocupacion[cabinId]) {
            ocupacion[cabinId] = {};
          }
          
          // Iterar por cada día de la reserva
          const currentDate = new Date(startDate);
          while (currentDate < endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            ocupacion[cabinId][dateStr] = reservation.status;
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });

        console.log(`📋 Calendar: ${cabanas.length} cabañas, ${reservations.length} reservas`);
        
        sendJSON(res, {
          success: true,
          data: {
            cabanas,
            ocupacion,
            year,
            month
          }
        });
      } catch (error) {
        console.error('Error calendar occupancy:', error);
        sendJSON(res, {
          success: false,
          message: 'Error obteniendo calendario de ocupación'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // USERS MANAGEMENT
    // ========================================================================
    if (path.startsWith('/admin/users') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const limit = parseInt(query.limit) || 50;
        const offset = parseInt(query.offset) || 0;
        
        const users = await dbQuery(`
          SELECT 
            user_id,
            name,
            phone_number,
            role,
            is_active,
            created_at
          FROM Users 
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `, [limit, offset]);
        
        const countResult = await dbQuery('SELECT COUNT(*) as total FROM Users');
        
        console.log(`👥 Usuarios: ${users.length} de ${countResult[0].total}`);
        
        sendJSON(res, {
          success: true,
          data: users,
          pagination: {
            limit,
            offset,
            total: countResult[0].total
          }
        });
      } catch (error) {
        console.error('Error consultando usuarios:', error);
        sendJSON(res, {
          success: false,
          message: 'Error consultando usuarios'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // CABINS MANAGEMENT
    // ========================================================================
    if (path.startsWith('/admin/cabins') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const cabins = await dbQuery(`
          SELECT 
            cabin_id,
            name,
            capacity,
            price,
            description,
            type,
            is_active,
            created_at
          FROM Cabins 
          ORDER BY cabin_id ASC
        `);
        
        console.log(`🏠 Cabañas: ${cabins.length} encontradas`);
        
        sendJSON(res, {
          success: true,
          data: cabins
        });
      } catch (error) {
        console.error('Error consultando cabañas:', error);
        sendJSON(res, {
          success: false,
          message: 'Error consultando cabañas'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // CABIN TYPES MANAGEMENT
    // ========================================================================
    if (path.startsWith('/admin/cabin-types') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const cabinTypes = await dbQuery(`
          SELECT 
            type_id,
            type_key,
            nombre as type_name,
            tipo as description,
            capacidad as max_guests,
            habitaciones as bedrooms,
            baños as bathrooms,
            precio_noche as base_price,
            moneda as currency,
            fotos as photos,
            comodidades as amenities,
            ubicacion as location,
            descripcion as full_description,
            activo as is_active,
            created_at,
            updated_at
          FROM CabinTypes 
          WHERE activo = 1
          ORDER BY type_id ASC
        `);
        
        console.log(`🏠 Tipos de cabañas: ${cabinTypes.length} encontrados`);
        
        sendJSON(res, {
          success: true,
          data: cabinTypes
        });
      } catch (error) {
        console.error('Error consultando tipos de cabañas:', error);
        sendJSON(res, {
          success: false,
          message: 'Error consultando tipos de cabañas'
        }, 500);
      }
      return;
    }

    // ========================================================================
    // ADMIN USERS MANAGEMENT
    // ========================================================================
    if (path.startsWith('/admin/admin-users') && method === 'GET') {
      const user = verifyToken(req.headers.authorization);
      if (!user) {
        sendJSON(res, { success: false, message: 'Token requerido' }, 401);
        return;
      }

      try {
        const adminUsers = await dbQuery(`
          SELECT 
            id,
            username,
            email,
            role,
            is_active,
            created_at
          FROM admin_users 
          ORDER BY created_at DESC
        `);
        
        console.log(`👨‍💼 Administradores: ${adminUsers.length} encontrados`);
        
        sendJSON(res, {
          success: true,
          data: adminUsers
        });
      } catch (error) {
        console.error('Error consultando administradores:', error);
        sendJSON(res, {
          success: false,
          message: 'Error consultando administradores'
        }, 500);
      }
      return;
    }

    // Endpoints de prueba para el bot
    if (path === '/api/test-date-parser' && method === 'POST') {
      try {
        const { parseDateRange } = require('./utils/dateRangeParser');
        const { dateInput } = JSON.parse(body);
        
        const result = parseDateRange(dateInput);
        
        if (result.error) {
          sendJSON(res, {
            success: false,
            error: result.error
          });
        } else {
          const [diaEnt, mesEnt, añoEnt] = result.entrada.split('/');
          const [diaSal, mesSal, añoSal] = result.salida.split('/');
          const fechaEntrada = new Date(añoEnt, mesEnt - 1, diaEnt);
          const fechaSalida = new Date(añoSal, mesSal - 1, diaSal);
          const noches = Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
          
          sendJSON(res, {
            success: true,
            entrada: result.entrada,
            salida: result.salida,
            noches: noches,
            originalInput: dateInput
          });
        }
      } catch (error) {
        sendJSON(res, {
          success: false,
          error: error.message
        }, 500);
      }
      return;
    }

    if (path === '/api/test-price-calculation' && method === 'POST') {
      try {
        const { calcularPrecioTotal } = require('./services/reservaPriceService');
        const { cabinType, startDate, nights } = JSON.parse(body);
        
        const totalPrice = calcularPrecioTotal(cabinType, startDate, nights);
        
        sendJSON(res, {
          success: true,
          cabinType: cabinType,
          startDate: startDate,
          nights: nights,
          totalPrice: totalPrice
        });
      } catch (error) {
        sendJSON(res, {
          success: false,
          error: error.message
        }, 500);
      }
      return;
    }

    // 404
    sendJSON(res, {
      success: false,
      message: 'Endpoint no encontrado',
      path: path
    }, 404);

  } catch (error) {
    console.error('Error en servidor:', error);
    sendJSON(res, {
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP nativo ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Base de datos: ${dbPath}`);
  console.log('📋 Endpoints disponibles:');
  console.log('  GET  /test');
  console.log('  POST /auth/login');
  console.log('  GET  /auth/me');
  console.log('  GET  /admin/reservations/upcoming');
  console.log('  GET  /admin/reservations');
  console.log('  GET  /admin/dashboard');
  console.log('  GET  /admin/dashboard/revenue');
  console.log('  GET  /admin/dashboard/occupancy');
  console.log('  GET  /admin/dashboard/users');
  console.log('  GET  /admin/dashboard/trends');
  console.log('  GET  /admin/calendar-occupancy');
  console.log('  GET  /admin/users');
  console.log('  GET  /admin/cabins');
  console.log('  GET  /admin/cabin-types');
  console.log('  GET  /admin/admin-users');
  console.log('');
  console.log('🔧 Sin Express - Solo HTTP nativo');
  console.log('🗄️ SQLite3 directo');
});

// Cerrar DB al terminar
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('🔒 Base de datos cerrada');
    process.exit(0);
  });
});
