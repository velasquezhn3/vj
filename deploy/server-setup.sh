#!/bin/bash

# 🚀 Script de Configuración del Servidor para Bot VJ
# Ejecutar como root en Ubuntu 20.04/22.04

echo "🚀 Iniciando configuración del servidor para Bot VJ..."

# 1. Actualizar sistema
echo "📦 Actualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar Node.js 18 LTS
echo "📥 Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 3. Instalar PM2 para gestión de procesos
echo "🔧 Instalando PM2..."
npm install -g pm2

# 4. Instalar dependencias del sistema
echo "🛠️ Instalando dependencias del sistema..."
apt-get install -y \
    nginx \
    ufw \
    htop \
    unzip \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    sqlite3

# 5. Configurar Firewall
echo "🛡️ Configurando firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 4000
ufw --force enable

# 6. Configurar Nginx como proxy reverso
echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/botvj << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Cambiar por tu dominio
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Habilitar sitio
ln -sf /etc/nginx/sites-available/botvj /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Probar configuración
nginx -t && systemctl reload nginx

# 7. Crear usuario para la aplicación
echo "👤 Creando usuario botvj..."
adduser --system --group --home /home/botvj --shell /bin/bash botvj
mkdir -p /home/botvj/app
chown -R botvj:botvj /home/botvj

echo "✅ Configuración del servidor completada!"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Copiar archivos de la aplicación a /home/botvj/app"
echo "2. Configurar variables de entorno"
echo "3. Instalar dependencias de Node.js"
echo "4. Configurar PM2"
echo "5. Configurar SSL con Certbot (opcional)"
