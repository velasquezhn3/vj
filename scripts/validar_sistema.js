#!/usr/bin/env node
/**
 * Script de validación del sistema Bot VJ
 * Verifica que todos los componentes estén funcionando correctamente
 */

const fs = require('fs');
const path = require('path');
const { runQuery } = require('../db');

console.log('🔍 VALIDACIÓN DEL SISTEMA BOT VJ');
console.log('================================\n');

async function validarSistema() {
  let erroresEncontrados = 0;

  // 1. Verificar archivos críticos
  console.log('📁 Verificando archivos críticos...');
  const archivosCriticos = [
    '../package.json',
    '../bot_database.sqlite',
    '../data/cabañas.json',
    '../index.js',
    '../db.js'
  ];

  for (const archivo of archivosCriticos) {
    const rutaArchivo = path.resolve(__dirname, archivo);
    if (fs.existsSync(rutaArchivo)) {
      console.log(`   ✅ ${archivo}`);
    } else {
      console.log(`   ❌ ${archivo} - NO ENCONTRADO`);
      erroresEncontrados++;
    }
  }

  // 2. Verificar estructura de base de datos
  console.log('\n🗄️ Verificando base de datos...');
  try {
    const tablas = await runQuery("SELECT name FROM sqlite_master WHERE type='table'");
    const tablasEsperadas = ['Users', 'Cabins', 'Reservations', 'Activities', 'ConversationStates'];
    
    for (const tabla of tablasEsperadas) {
      const existe = tablas.some(t => t.name === tabla);
      if (existe) {
        console.log(`   ✅ Tabla ${tabla}`);
      } else {
        console.log(`   ❌ Tabla ${tabla} - NO ENCONTRADA`);
        erroresEncontrados++;
      }
    }

    // Verificar datos básicos
    const cabinsCount = await runQuery('SELECT COUNT(*) as count FROM Cabins');
    console.log(`   📊 Cabañas en BD: ${cabinsCount[0]?.count || 0}`);
    
    if (cabinsCount[0]?.count === 0) {
      console.log('   ⚠️ No hay cabañas en la base de datos');
    }

  } catch (error) {
    console.log(`   ❌ Error conectando a BD: ${error.message}`);
    erroresEncontrados++;
  }

  // 3. Verificar dependencias Node.js
  console.log('\n📦 Verificando dependencias...');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
    const dependencias = Object.keys(packageJson.dependencies || {});
    
    for (const dep of dependencias.slice(0, 5)) { // Solo las primeras 5
      try {
        require(dep);
        console.log(`   ✅ ${dep}`);
      } catch (error) {
        console.log(`   ❌ ${dep} - NO INSTALADO`);
        erroresEncontrados++;
      }
    }
  } catch (error) {
    console.log(`   ❌ Error leyendo package.json: ${error.message}`);
    erroresEncontrados++;
  }

  // 4. Verificar configuración
  console.log('\n⚙️ Verificando configuración...');
  
  // Variables de entorno
  const envVars = ['NODE_ENV', 'GRUPO_JID'];
  for (const envVar of envVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}`);
    } else {
      console.log(`   ⚠️ ${envVar} - NO CONFIGURADO`);
    }
  }

  // Directorios
  const directorios = ['../logs', '../data', '../data/session'];
  for (const dir of directorios) {
    const rutaDir = path.resolve(__dirname, dir);
    if (fs.existsSync(rutaDir)) {
      console.log(`   ✅ ${dir}`);
    } else {
      console.log(`   ⚠️ ${dir} - NO EXISTE (se creará automáticamente)`);
    }
  }

  // 5. Verificar puerto admin
  console.log('\n🌐 Verificando servicios...');
  
  // Intentar conectar al puerto admin
  const net = require('net');
  const client = new net.Socket();
  
  try {
    await new Promise((resolve, reject) => {
      client.setTimeout(2000);
      client.connect(4000, '127.0.0.1', () => {
        console.log('   ✅ Servidor admin corriendo en puerto 4000');
        client.destroy();
        resolve();
      });
      client.on('error', () => {
        console.log('   ⚠️ Servidor admin no está corriendo');
        reject();
      });
      client.on('timeout', () => {
        console.log('   ⚠️ Timeout conectando al servidor admin');
        client.destroy();
        reject();
      });
    });
  } catch (error) {
    // No es crítico si el servidor no está corriendo durante la validación
  }

  // 6. Resumen final
  console.log('\n📋 RESUMEN DE VALIDACIÓN');
  console.log('========================');
  
  if (erroresEncontrados === 0) {
    console.log('🎉 ¡SISTEMA VALIDADO CORRECTAMENTE!');
    console.log('   Todos los componentes críticos están presentes.');
    console.log('\n🚀 Comandos para iniciar:');
    console.log('   Backend: npm start');
    console.log('   Frontend: cd ../admin-frontend && npm start');
  } else {
    console.log(`❌ SE ENCONTRARON ${erroresEncontrados} ERRORES`);
    console.log('\n🔧 Acciones recomendadas:');
    console.log('   1. Ejecutar: npm install');
    console.log('   2. Ejecutar: node data/create_db.js');
    console.log('   3. Ejecutar: node data/insert_test_data.js');
    console.log('   4. Configurar variables de entorno (.env)');
  }
  
  process.exit(erroresEncontrados > 0 ? 1 : 0);
}

// Ejecutar validación
validarSistema().catch(error => {
  console.error('💥 Error durante la validación:', error.message);
  process.exit(1);
});
