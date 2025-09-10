# 🚀 Guia de Deploy - EO Clínica System v2.1.1

**Atualizado**: 10 de Setembro de 2025  
**Status**: Development Ready  
**Próximo**: Production Deployment  

---

## 📋 **Pré-requisitos**

### **Requisitos do Sistema:**
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Docker**: >= 20.10.0
- **Docker Compose**: >= 2.0.0
- **Git**: >= 2.30.0

### **Recursos Mínimos:**
- **RAM**: 4GB (desenvolvimento) / 8GB (produção)
- **CPU**: 2 cores (desenvolvimento) / 4 cores (produção)
- **Disco**: 10GB livres
- **Portas**: 3000, 3002, 5433, 6380

---

## 🏗️ **Configuração do Ambiente de Desenvolvimento**

### **1. Clone e Configuração Inicial:**
```bash
# Clone o repositório
git clone https://github.com/josivantarcio/eo-clinica.git
cd eo-clinica

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Edite o .env conforme necessário
```

### **2. Iniciar Serviços de Banco:**
```bash
# PostgreSQL
docker run --name eo-clinica-postgres \
  -p 5433:5432 \
  -e POSTGRES_USER=clinic_user \
  -e POSTGRES_PASSWORD=clinic_password \
  -e POSTGRES_DB=eo_clinica_db \
  -d postgres:15-alpine

# Redis
docker run --name eo-clinica-redis \
  -p 6380:6379 \
  -d redis:7-alpine

# Aguardar containers inicializarem
sleep 10
```

### **3. Configurar Database:**
```bash
# Gerar Prisma client
npm run db:generate

# Executar migrações
npx prisma migrate deploy

# Popular com dados iniciais
npm run db:seed

# Verificar conexão
curl http://localhost:3000/health
```

### **4. Iniciar Aplicação:**
```bash
# Terminal 1 - Backend
npx tsx src/index.ts

# Terminal 2 - Frontend
cd frontend
npm run build
PORT=3002 npm run start
```

### **5. Verificação:**
- ✅ Backend: http://localhost:3000/health
- ✅ Frontend: http://localhost:3002
- ✅ API Docs: http://localhost:3000/documentation
- ✅ Login: admin@eoclinica.com.br / Admin123!

---

## 🐳 **Deploy com Docker (Recomendado)**

### **1. Usando Docker Compose:**
```bash
# Limpar conflitos de rede (se necessário)
docker network prune -f

# Iniciar stack completa
docker-compose up -d

# Verificar status
docker-compose ps
docker-compose logs -f
```

### **2. Configuração Docker Personalizada:**
```bash
# Build custom images
docker build -t eo-clinica/backend:latest .
docker build -t eo-clinica/frontend:latest ./frontend

# Run com configurações específicas
docker run -d --name eo-backend \
  --network eo-clinica-network \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://clinic_user:clinic_password@postgres:5432/eo_clinica_db" \
  -e REDIS_URL="redis://redis:6379" \
  eo-clinica/backend:latest
```

---

## ☁️ **Deploy em Produção**

### **1. Preparação do Servidor:**
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configurar firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

### **2. Variáveis de Ambiente de Produção:**
```bash
# Criar .env.production
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://clinic_user:SECURE_PASSWORD@localhost:5432/eo_clinica_prod
REDIS_URL=redis://localhost:6379

# Secrets de Produção
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
MASTER_ENCRYPTION_KEY=$(openssl rand -base64 32)

# API Keys
GEMINI_API_KEY=your_production_gemini_key
WAHA_API_KEY=your_production_waha_key
N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Domain e SSL
DOMAIN=your-domain.com
SSL_EMAIL=admin@your-domain.com

# Database Production
DB_PASSWORD=$(openssl rand -base64 16)
CLICKHOUSE_PASSWORD=$(openssl rand -base64 16)
N8N_USER=admin
N8N_PASSWORD=$(openssl rand -base64 12)
EOF
```

### **3. Deploy com SSL/HTTPS:**
```bash
# Usar docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d

# Configurar SSL com Let's Encrypt
docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d your-domain.com \
  --email admin@your-domain.com \
  --agree-tos --non-interactive

# Recarregar nginx
docker-compose exec nginx nginx -s reload
```

---

## 📊 **Monitoramento e Logs**

### **1. Health Checks:**
```bash
# Verificar status dos serviços
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/users?limit=1

# Verificar logs
docker-compose logs -f app
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### **2. Backup Automatizado:**
```bash
# Script de backup (cron diário)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec postgres pg_dump -U clinic_user eo_clinica_db > backup_${DATE}.sql
aws s3 cp backup_${DATE}.sql s3://your-backup-bucket/
rm backup_${DATE}.sql
```

### **3. Monitoring com Prometheus:**
```bash
# Adicionar ao docker-compose
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin123
```

---

## 🔧 **Troubleshooting**

### **Problemas Comuns:**

1. **Port Already in Use:**
```bash
sudo lsof -i :3000
sudo kill -9 PID
```

2. **Database Connection Error:**
```bash
docker exec -it eo-clinica-postgres psql -U clinic_user -d eo_clinica_db -c "SELECT 1;"
```

3. **Redis Connection Error:**
```bash
docker exec -it eo-clinica-redis redis-cli ping
```

4. **Frontend Build Errors:**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

5. **Permission Denied:**
```bash
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

---

## 🔄 **Scripts de Automação**

### **1. Script de Start Completo:**
```bash
#!/bin/bash
# start-development.sh

echo "🚀 Iniciando EO Clínica Development..."

# Stop existing containers
docker stop eo-clinica-postgres eo-clinica-redis 2>/dev/null || true

# Start services
docker run --name eo-clinica-postgres -p 5433:5432 \
  -e POSTGRES_USER=clinic_user \
  -e POSTGRES_PASSWORD=clinic_password \
  -e POSTGRES_DB=eo_clinica_db \
  -d postgres:15-alpine

docker run --name eo-clinica-redis -p 6380:6379 -d redis:7-alpine

# Wait for services
sleep 5

# Setup database
npm run db:generate
npx prisma migrate deploy
npm run db:seed

echo "✅ Serviços iniciados com sucesso!"
echo "🌐 Backend: http://localhost:3000"
echo "🎨 Frontend: http://localhost:3002"
```

### **2. Script de Deploy de Produção:**
```bash
#!/bin/bash
# deploy-production.sh

echo "🚀 Deploy de Produção - EO Clínica"

# Pull latest code
git pull origin main

# Build images
docker-compose -f docker-compose.prod.yml build

# Database backup
docker exec postgres pg_dump -U clinic_user eo_clinica_db > backup_pre_deploy.sql

# Deploy with zero downtime
docker-compose -f docker-compose.prod.yml up -d

# Health check
sleep 30
curl -f http://localhost/health || {
  echo "❌ Deploy failed - Rolling back"
  docker-compose -f docker-compose.prod.yml down
  # Restore from backup logic here
  exit 1
}

echo "✅ Deploy concluído com sucesso!"
```

---

## 📈 **Performance e Otimização**

### **1. Otimizações de Produção:**
- **Nginx**: Gzip compression, caching headers
- **Database**: Connection pooling, indexes
- **Redis**: Persistent storage, memory optimization
- **Node.js**: PM2 cluster mode, memory limits

### **2. Configurações Recomendadas:**
```bash
# PM2 ecosystem file
module.exports = {
  apps: [{
    name: 'eo-clinica-backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

**🎯 Sistema pronto para deploy em produção com todas as configurações necessárias!**

---

*Guia atualizado em 10/09/2025 - EO Clínica v2.1.1*