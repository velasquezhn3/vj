#!/usr/bin/env node

/**
 * 🔐 GENERADOR DE SECRETS SEGUROS
 * Genera JWT secrets y passwords seguros para producción
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 GENERADOR DE SECRETS SEGUROS PARA BOT VJ');
console.log('===========================================\n');

// Generar JWT Secret (64 bytes = 128 caracteres hex)
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Generar password admin seguro (20 caracteres con mayús, minús, números y símbolos)
function generateSecurePassword(length = 20) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Asegurar al menos un carácter de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completar con caracteres aleatorios
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar el password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const adminPassword = generateSecurePassword();

console.log('✅ SECRETS GENERADOS:');
console.log('====================\n');

console.log('🔑 JWT_SECRET (para .env):');
console.log(`JWT_SECRET=${jwtSecret}\n`);

console.log('🔐 ADMIN_DEFAULT_PASSWORD (para .env):');
console.log(`ADMIN_DEFAULT_PASSWORD=${adminPassword}\n`);

console.log('⚠️  IMPORTANTE:');
console.log('   • Guarda estos valores en un lugar seguro');
console.log('   • NO los subas al repositorio');
console.log('   • Úsalos SOLO en tu archivo .env local\n');

// Opcional: crear archivo .env si no existe
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('📝 ¿Quieres crear automáticamente tu archivo .env? (Ctrl+C para cancelar)');
  
  setTimeout(() => {
    try {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Reemplazar valores de ejemplo con los generados
      envContent = envContent.replace(
        /JWT_SECRET=.*/,
        `JWT_SECRET=${jwtSecret}`
      );
      envContent = envContent.replace(
        /ADMIN_DEFAULT_PASSWORD=.*/,
        `ADMIN_DEFAULT_PASSWORD=${adminPassword}`
      );
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Archivo .env creado con secrets seguros!');
      console.log('📁 Ubicación:', envPath);
      
    } catch (error) {
      console.log('❌ Error creando .env:', error.message);
    }
  }, 3000);
}
