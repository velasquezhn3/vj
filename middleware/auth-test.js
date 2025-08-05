/**
 * Test simplificado del middleware de auth
 */

console.log('Iniciando test de auth...');

const jwt = require('jsonwebtoken');
console.log('JWT cargado');

const bcrypt = require('bcryptjs');
console.log('Bcrypt cargado');

const { runQuery, runExecute } = require('../db.js');
console.log('DB funciones cargadas');

// Test básico
const JWT_SECRET = 'test_secret';

const authenticateToken = (req, res, next) => {
  console.log('authenticateToken function');
  next();
};

console.log('Exportando funciones...');

module.exports = {
  authenticateToken,
  JWT_SECRET
};

console.log('Módulo auth test exportado correctamente');
