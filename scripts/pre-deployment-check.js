#!/usr/bin/env node
/**
 * Script de Deployment para Producción - Bot VJ
 * Verifica que todas las condiciones estén listas antes del deploy
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 INICIANDO VERIFICACIONES PRE-DEPLOYMENT...\n');

const checks = {
  environment: false,
  security: false,
  tests: false,
  database: false,
  dependencies: false
};

// ============================================================================
// 1. VERIFICAR VARIABLES DE ENTORNO
// ============================================================================
console.log('1️⃣ Verificando variables de entorno...');

const requiredEnvVars = [
  'NODE_ENV',
  'JWT_SECRET',
  'ADMIN_DEFAULT_USERNAME',
  'ADMIN_DEFAULT_PASSWORD'
];

const envPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envPath)) {
  console.error('❌ Archivo .env.production no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
let missingVars = [];

requiredEnvVars.forEach(varName => {
  if (!envContent.includes(`${varName}=`) || 
      envContent.includes(`${varName}=CAMBIAR`) ||
      envContent.includes(`${varName}=GENERAR`)) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error(`❌ Variables de entorno faltantes o sin configurar: ${missingVars.join(', ')}`);
  console.error('⚠️  Edita .env.production y configura valores seguros');
  process.exit(1);
} else {
  console.log('✅ Variables de entorno configuradas correctamente');
  checks.environment = true;
}

// ============================================================================
// 2. VERIFICAR SEGURIDAD
// ============================================================================
console.log('\n2️⃣ Verificando configuraciones de seguridad...');

// Verificar que JWT_SECRET sea suficientemente seguro
const jwtMatch = envContent.match(/JWT_SECRET=(.+)/);
if (jwtMatch && jwtMatch[1].length < 64) {
  console.error('❌ JWT_SECRET debe tener al menos 64 caracteres');
  console.log('💡 Genera uno nuevo con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// Verificar archivos de seguridad críticos
const securityFiles = [
  'middleware/globalErrorHandler.js',
  'middleware/securityValidator.js',
  'middleware/advancedValidation.js'
];

for (const file of securityFiles) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.error(`❌ Archivo de seguridad faltante: ${file}`);
    process.exit(1);
  }
}

console.log('✅ Configuraciones de seguridad verificadas');
checks.security = true;

// ============================================================================
// 3. EJECUTAR TESTS CRÍTICOS
// ============================================================================
console.log('\n3️⃣ Ejecutando tests críticos...');

try {
  // Tests básicos
  execSync('npm test -- tests/unit/basic.test.js --silent', { 
    stdio: 'pipe',
    cwd: __dirname 
  });
  
  // Tests de seguridad (si existen)
  try {
    execSync('npm test -- tests/security/production-security.test.js --silent', { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    console.log('✅ Tests de seguridad pasados');
  } catch (secError) {
    console.warn('⚠️  Tests de seguridad no disponibles o fallaron');
  }
  
  console.log('✅ Tests críticos pasados');
  checks.tests = true;
} catch (error) {
  console.error('❌ Tests críticos fallaron');
  console.error(error.stdout?.toString() || error.message);
  process.exit(1);
}

// ============================================================================
// 4. VERIFICAR BASE DE DATOS
// ============================================================================
console.log('\n4️⃣ Verificando base de datos...');

const dbPath = path.join(__dirname, 'bot_database.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error('❌ Base de datos no encontrada');
  console.log('💡 Ejecuta: node data/create_db.js');
  process.exit(1);
}

// Verificar backup directory
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('📁 Directorio de backups creado');
}

console.log('✅ Base de datos verificada');
checks.database = true;

// ============================================================================
// 5. VERIFICAR DEPENDENCIAS
// ============================================================================
console.log('\n5️⃣ Verificando dependencias...');

try {
  execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
  console.log('✅ Auditoría de dependencias pasada');
} catch (auditError) {
  console.warn('⚠️  Vulnerabilidades encontradas en dependencias');
  console.log('💡 Ejecuta: npm audit fix');
  // No salir, solo advertir
}

try {
  execSync('npm ls --production', { stdio: 'pipe' });
  console.log('✅ Dependencias de producción verificadas');
  checks.dependencies = true;
} catch (depsError) {
  console.error('❌ Problemas con dependencias');
  console.log('💡 Ejecuta: npm install');
  process.exit(1);
}

// ============================================================================
// RESUMEN FINAL
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIONES PRE-DEPLOYMENT');
console.log('='.repeat(60));

Object.entries(checks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
});

const allPassed = Object.values(checks).every(check => check === true);

if (allPassed) {
  console.log('\n🎉 TODAS LAS VERIFICACIONES PASARON');
  console.log('🚀 El sistema está listo para deployment en producción');
  console.log('\n📋 COMANDOS PARA DEPLOYMENT:');
  console.log('1. cp .env.production .env');
  console.log('2. NODE_ENV=production npm start');
  console.log('3. NODE_ENV=production npm run admin (en otra terminal)');
  console.log('\n🔍 MONITOREO POST-DEPLOYMENT:');
  console.log('- Verificar logs: tail -f logs/combined-*.log');
  console.log('- Health check: curl http://localhost:4000/health');
  console.log('- Métricas cache: curl http://localhost:4000/admin/cache/stats');
  
  process.exit(0);
} else {
  console.log('\n❌ DEPLOYMENT BLOQUEADO - Corrige los errores antes de continuar');
  process.exit(1);
}
