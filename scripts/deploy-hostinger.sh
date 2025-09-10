#!/bin/bash

# Script de deploy para Hostinger VPS
# Execute este script no seu VPS Hostinger

set -e  # Exit on any error

echo "🚀 Starting EO Clínica deployment on Hostinger VPS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Verificar se está rodando como usuário correto
if [ "$EUID" -eq 0 ]; then
    error "Não execute este script como root! Use um usuário normal."
    exit 1
fi

# 1. Atualizar sistema
log "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js (se não estiver instalado)
if ! command -v node &> /dev/null; then
    log "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log "✅ Node.js already installed: $(node --version)"
fi

# 3. Instalar PM2 globalmente (se não estiver instalado)
if ! command -v pm2 &> /dev/null; then
    log "📥 Installing PM2 process manager..."
    sudo npm install -g pm2
else
    log "✅ PM2 already installed: $(pm2 --version)"
fi

# 4. Criar diretório da aplicação
APP_DIR="/home/$(whoami)/eo-clinica"
log "📁 Creating application directory: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# 5. Clonar repositório (se não existir)
if [ ! -d ".git" ]; then
    log "📥 Cloning repository..."
    git clone https://github.com/josivantarcio/jtarcio-clinica.git .
    git checkout hostinger-vps
else
    log "🔄 Updating existing repository..."
    git fetch origin
    git checkout hostinger-vps
    git pull origin hostinger-vps
fi

# 6. Instalar dependências
log "📦 Installing dependencies..."
npm ci --production

# 7. Instalar dependências do frontend
log "📦 Installing frontend dependencies..."
cd frontend
npm ci
log "🏗️ Building frontend..."
npm run build
cd ..

# 8. Configurar variáveis de ambiente
if [ ! -f ".env" ]; then
    log "⚙️ Creating environment file..."
    cat > .env << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (usando mock database para demo)
DATABASE_URL="mock://localhost/demo"

# JWT
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Salt rounds
SALT_ROUNDS=12

# Frontend URLs
NEXT_PUBLIC_API_URL="/api"
NEXT_PUBLIC_WS_URL="ws://localhost:3000"
NEXT_PUBLIC_APP_NAME="EO Clínica - Hostinger"
NEXT_PUBLIC_APP_VERSION="2.1.1"
EOF
    log "✅ Environment file created"
else
    log "✅ Environment file already exists"
fi

# 9. Configurar PM2
log "⚙️ Configuring PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'eo-clinica',
    script: 'npx tsx src/index-hostinger.ts',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# 10. Criar diretório de logs
mkdir -p logs

# 11. Parar aplicação existente (se estiver rodando)
log "🛑 Stopping existing application..."
pm2 stop eo-clinica 2>/dev/null || true
pm2 delete eo-clinica 2>/dev/null || true

# 12. Iniciar aplicação
log "🚀 Starting application..."
pm2 start ecosystem.config.js

# 13. Salvar configuração PM2
log "💾 Saving PM2 configuration..."
pm2 save

# 14. Configurar PM2 para iniciar no boot
log "🔧 Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp /home/$(whoami) || warn "PM2 startup configuration may have failed"

# 15. Configurar nginx (se disponível)
if command -v nginx &> /dev/null; then
    log "🌐 Configuring Nginx reverse proxy..."
    sudo tee /etc/nginx/sites-available/eo-clinica << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Ativar site
    sudo ln -sf /etc/nginx/sites-available/eo-clinica /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    log "✅ Nginx configured successfully"
else
    warn "Nginx not found. Application running on port 3000"
fi

# 16. Configurar firewall (se ufw estiver disponível)
if command -v ufw &> /dev/null; then
    log "🔥 Configuring firewall..."
    sudo ufw allow 22    # SSH
    sudo ufw allow 80    # HTTP
    sudo ufw allow 443   # HTTPS
    sudo ufw allow 3000  # Node.js app
    sudo ufw --force enable
    log "✅ Firewall configured"
fi

# 17. Mostrar status final
log "📊 Deployment completed! Application status:"
pm2 status
pm2 logs eo-clinica --lines 10

echo ""
log "🎉 EO Clínica deployed successfully on Hostinger VPS!"
log "🌍 Application URL: http://$(hostname -I | awk '{print $1}'):3000"
log "🔗 Health check: http://$(hostname -I | awk '{print $1}'):3000/health"
log "📊 Server info: http://$(hostname -I | awk '{print $1}'):3000/server-info"
echo ""
log "📋 Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs eo-clinica - View application logs"
echo "  pm2 restart eo-clinica - Restart application"
echo "  pm2 stop eo-clinica - Stop application"
echo ""
log "🔐 Demo credentials:"
echo "  Admin: admin@eoclinica.com.br / Admin123!"
echo "  Doctor: doctor@eoclinica.com.br / Admin123!"
echo "  Patient: patient@eoclinica.com.br / Admin123!"