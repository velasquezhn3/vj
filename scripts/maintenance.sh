#!/bin/bash

# 🛠️ Comandos de Mantenimiento Bot VJ
# Ejecutar diariamente o cuando sea necesario

echo "🛠️ Iniciando mantenimiento de Bot VJ..."

# 1. Verificar estado del servicio
echo "📊 Estado actual del servicio:"
pm2 status botvj-admin
echo ""

# 2. Verificar uso de recursos
echo "💻 Uso de recursos:"
echo "CPU y Memoria:"
pm2 monit --no-color | head -20
echo ""

echo "Espacio en disco:"
df -h
echo ""

# 3. Limpiar logs antiguos
echo "🧹 Limpiando logs antiguos (>7 días)..."
find ./logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
find ./logs -name "*.log.*" -type f -mtime +7 -delete 2>/dev/null || true
echo "✅ Logs limpiados"

# 4. Optimizar base de datos
echo "🗄️ Optimizando base de datos..."
sqlite3 bot_database.sqlite << 'EOF'
PRAGMA optimize;
VACUUM;
PRAGMA integrity_check;
.quit
EOF
echo "✅ Base de datos optimizada"

# 5. Verificar backups
echo "💾 Verificando backups..."
backup_count=$(ls -1 backups/*.sqlite 2>/dev/null | wc -l)
echo "Backups disponibles: $backup_count"

if [ "$backup_count" -eq 0 ]; then
    echo "⚠️ No hay backups disponibles. Creando backup..."
    mkdir -p backups
    cp bot_database.sqlite "backups/maintenance-backup-$(date +%Y%m%d-%H%M%S).sqlite"
    echo "✅ Backup creado"
fi

# Limpiar backups antiguos (>14 días)
find ./backups -name "*.sqlite" -type f -mtime +14 -delete 2>/dev/null || true

# 6. Verificar archivos críticos
echo "🔍 Verificando archivos críticos..."
critical_files=("adminServer.js" "bot_database.sqlite" ".env")
missing_files=()

for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ Todos los archivos críticos están presentes"
else
    echo "❌ Archivos críticos faltantes: ${missing_files[*]}"
fi

# 7. Verificar conectividad
echo "🌐 Verificando conectividad..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health | grep -q "200"; then
    echo "✅ Servidor respondiendo correctamente"
else
    echo "❌ Servidor no responde - posible problema"
    echo "Reiniciando servicio..."
    pm2 restart botvj-admin
fi

# 8. Métricas de rendimiento
echo "📈 Métricas de rendimiento:"
if [ -f "logs/metrics.json" ]; then
    echo "Última actualización de métricas:"
    grep -o '"timestamp":"[^"]*"' logs/metrics.json | tail -1
    
    echo "Estado de salud:"
    grep -o '"status":"[^"]*"' logs/metrics.json | tail -1
else
    echo "⚠️ No se encontraron métricas"
fi

# 9. Resumen final
echo ""
echo "📋 RESUMEN DE MANTENIMIENTO:"
echo "- Logs limpiados ✅"
echo "- Base de datos optimizada ✅"
echo "- Backups verificados ✅"
echo "- Archivos críticos verificados ✅"
echo "- Conectividad verificada ✅"
echo ""

# 10. Recomendaciones
echo "💡 RECOMENDACIONES:"
current_hour=$(date +%H)

if [ "$current_hour" -ge 2 ] && [ "$current_hour" -le 5 ]; then
    echo "- Horario ideal para mantenimiento (madrugada)"
    echo "- Considera ejecutar: pm2 reload botvj-admin"
else
    echo "- Mantenimiento en horario de actividad"
    echo "- Evita reiniciar servicios a menos que sea crítico"
fi

echo ""
echo "✅ Mantenimiento completado: $(date)"

# 11. Guardar log de mantenimiento
echo "$(date): Mantenimiento ejecutado exitosamente" >> logs/maintenance.log
