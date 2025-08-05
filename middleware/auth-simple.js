/**
 * Middleware de autenticación JWT - Versión mínima
 */

const jwt = require('jsonwebtoken');

// Clave secreta para JWT
const JWT_SECRET = 'vj_secret_key_2024_admin_dashboard';

/**
 * Middleware para verificar token JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token inválido'
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Generar token JWT
 */
function generateToken(adminData) {
  const payload = {
    adminId: adminData.admin_id,
    username: adminData.username
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Exportar funciones
module.exports = {
  authenticateToken: authenticateToken,
  generateToken: generateToken,
  JWT_SECRET: JWT_SECRET
};
