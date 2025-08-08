#!/bin/bash

# 🚀 Script de Despliegue Bot VJ
# Ejecutar desde la carpeta del proyecto en el servidor

set -e  # Salir si hay errores

echo "🚀 Iniciando despliegue de Bot VJ..."

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "adminServer.js" ]; then
    echo "❌ Error: No se encuentra adminServer.js. Ejecutar desde la carpeta del proyecto."
    exit 1
fi

# 2. Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p logs uploads backups coverage

# 3. Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --only=production

# 4. Verificar variables de entorno
echo "🔍 Verificando configuración..."
if [ ! -f ".env" ]; then
    echo "⚠️ No existe archivo .env. Copiando template de producción..."
    cp .env.production .env
    echo "✅ IMPORTANTE: Editar .env con valores reales antes de continuar"
    nano .env  # Abrir editor para configurar
fi

# 5. Ejecutar tests críticos
echo "🧪 Ejecutando tests críticos..."
npm test -- tests/security/production-security.test.js

# 6. Optimizar base de datos
echo "🗄️ Optimizando base de datos..."
node -e "
const db = require('./db');
const { runExecute } = require('./db');

(async () => {
    try {
        await runExecute('PRAGMA optimize');
        await runExecute('VACUUM');
        console.log('✅ Base de datos optimizada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error optimizando DB:', error.message);
        process.exit(1);
    }
})();
"

# 7. Crear backup inicial
echo "💾 Creando backup inicial..."
cp bot_database.sqlite "backups/initial-backup-$(date +%Y%m%d-%H%M%S).sqlite"

# 8. Detener aplicación existente (si existe)
echo "🛑 Deteniendo aplicación existente..."
pm2 stop botvj-admin || true
pm2 delete botvj-admin || true

# 9. Iniciar con PM2
echo "▶️ Iniciando aplicación con PM2..."
pm2 start ecosystem.config.json --env production

# 10. Configurar inicio automático
echo "🔄 Configurando inicio automático..."
pm2 startup
pm2 save

# 11. Verificar estado
echo "📊 Verificando estado..."
sleep 5
pm2 status
pm2 logs botvj-admin --lines 20

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "📋 COMANDOS ÚTILES:"
echo "pm2 status              - Ver estado"
echo "pm2 logs botvj-admin    - Ver logs"
echo "pm2 restart botvj-admin - Reiniciar"
echo "pm2 stop botvj-admin    - Detener"
echo ""
echo "🌐 Aplicación disponible en: http://tu-servidor:4000"
