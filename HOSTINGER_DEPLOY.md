# Hostinger VPS Deploy Guide - EO Clínica

Este guia explica como fazer deploy completo do EO Clínica no **Hostinger VPS** com Node.js, PM2, Nginx e SSL.

## 🌟 Por que Hostinger VPS?

- ✅ **Node.js Pré-instalado** - Ubuntu 22.04 + Node.js + OpenLiteSpeed
- ✅ **Acesso Root** - Controle total do servidor
- ✅ **Alta Performance** - 1000 Mb/s network speed
- ✅ **SSL Gratuito** - Let's Encrypt automático
- ✅ **Escalável** - CPU, RAM e storage sob demanda
- ✅ **Suporte 24/7** - Chat ao vivo + Knowledge Base

## 💰 Planos e Preços

| Plano | CPU | RAM | Storage | Preço/mês |
|-------|-----|-----|---------|-----------|
| **VPS 1** | 1 vCPU | 1GB | 20GB NVMe | $4.99 |
| **VPS 2** | 2 vCPU | 2GB | 40GB NVMe | $8.99 |
| **VPS 3** | 3 vCPU | 3GB | 60GB NVMe | $12.99 |
| **VPS 4** | 4 vCPU | 4GB | 80GB NVMe | $15.99 |

**Recomendação**: VPS 2 para produção estável

## 🔧 Pré-requisitos

1. **Conta Hostinger** com plano VPS ativo
2. **Acesso SSH** ao seu VPS
3. **Domínio** (opcional, pode usar IP)

## 🚀 Deploy Automático (Recomendado)

### 1. Conectar ao VPS

```bash
ssh root@SEU_IP_VPS
```

### 2. Criar usuário não-root

```bash
adduser eoclinica
usermod -aG sudo eoclinica
su - eoclinica
```

### 3. Executar script de deploy

```bash
curl -fsSL https://raw.githubusercontent.com/josivantarcio/jtarcio-clinica/hostinger-vps/scripts/deploy-hostinger.sh | bash
```

**Pronto!** O script irá:
- ✅ Instalar Node.js e PM2
- ✅ Clonar e configurar o projeto
- ✅ Build do frontend
- ✅ Configurar variáveis de ambiente
- ✅ Iniciar com PM2
- ✅ Configurar Nginx reverse proxy
- ✅ Configurar firewall

## 📋 Deploy Manual (Passo a Passo)

### 1. Preparar Sistema

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Verificar instalações
node --version
npm --version
pm2 --version
```

### 2. Clonar Projeto

```bash
# Criar diretório
mkdir -p ~/eo-clinica
cd ~/eo-clinica

# Clonar repositório
git clone https://github.com/josivantarcio/jtarcio-clinica.git .
git checkout hostinger-vps
```

### 3. Instalar Dependências

```bash
# Backend
npm ci --production

# Frontend
cd frontend
npm ci
npm run build
cd ..
```

### 4. Configurar Ambiente

```bash
# Criar arquivo .env
cat > .env << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (mock para demo)
DATABASE_URL="mock://localhost/demo"

# JWT
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Salt rounds
SALT_ROUNDS=12

# Frontend URLs
NEXT_PUBLIC_API_URL="/api"
NEXT_PUBLIC_WS_URL="ws://$(hostname -I | awk '{print $1}'):3000"
NEXT_PUBLIC_APP_NAME="EO Clínica - Hostinger"
NEXT_PUBLIC_APP_VERSION="2.1.1"
EOF
```

### 5. Configurar PM2

```bash
# Criar diretório de logs
mkdir -p logs

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar inicialização automática
pm2 startup
```

### 6. Configurar Nginx

```bash
# Instalar Nginx
sudo apt install nginx -y

# Criar configuração
sudo nano /etc/nginx/sites-available/eo-clinica
```

**Conteúdo do arquivo:**

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Ativar site:**

```bash
# Ativar configuração
sudo ln -s /etc/nginx/sites-available/eo-clinica /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 7. Configurar SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Configurar Firewall

```bash
# Configurar UFW
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw --force enable

# Verificar status
sudo ufw status
```

## 🎯 URLs de Acesso

Após o deploy completo:

- **Aplicação**: `https://SEU_DOMINIO.com`
- **Health Check**: `https://SEU_DOMINIO.com/health`
- **Server Info**: `https://SEU_DOMINIO.com/server-info`

## 🔐 Credenciais Demo

- **Admin**: `admin@eoclinica.com.br` / `Admin123!`
- **Doutor**: `doctor@eoclinica.com.br` / `Admin123!`  
- **Paciente**: `patient@eoclinica.com.br` / `Admin123!`

## 📊 Monitoramento e Manutenção

### Comandos PM2 Úteis

```bash
# Status das aplicações
pm2 status

# Visualizar logs
pm2 logs eo-clinica-hostinger

# Visualizar logs em tempo real
pm2 logs eo-clinica-hostinger --lines 50

# Reiniciar aplicação
pm2 restart eo-clinica-hostinger

# Parar aplicação
pm2 stop eo-clinica-hostinger

# Remover aplicação
pm2 delete eo-clinica-hostinger

# Monitoramento web
pm2 plus
```

### Comandos Nginx

```bash
# Status do Nginx
sudo systemctl status nginx

# Recarregar configuração
sudo nginx -s reload

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Logs do Sistema

```bash
# Logs da aplicação
tail -f ~/eo-clinica/logs/combined.log
tail -f ~/eo-clinica/logs/err.log
tail -f ~/eo-clinica/logs/out.log

# Uso de recursos
htop
df -h
free -m
```

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
cd ~/eo-clinica

# Parar aplicação
pm2 stop eo-clinica-hostinger

# Atualizar código
git pull origin hostinger-vps

# Reinstalar dependências (se necessário)
npm ci --production

# Rebuild frontend (se necessário)
cd frontend
npm run build
cd ..

# Reiniciar aplicação
pm2 start ecosystem.config.js
```

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Verificar logs
pm2 logs eo-clinica-hostinger

# Verificar porta em uso
sudo netstat -tlnp | grep :3000

# Reiniciar PM2
pm2 kill
pm2 start ecosystem.config.js
```

### Nginx não funciona

```bash
# Verificar status
sudo systemctl status nginx

# Testar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

### SSL não funciona

```bash
# Renovar certificado
sudo certbot renew

# Verificar certificado
sudo certbot certificates

# Testar SSL
openssl s_client -connect SEU_DOMINIO.com:443
```

### Performance Issues

```bash
# Aumentar limites PM2
pm2 stop eo-clinica-hostinger
# Editar ecosystem.config.js
# Aumentar max_memory_restart e node_args
pm2 start ecosystem.config.js

# Monitorar recursos
htop
iotop
```

## 🔧 Configurações Avançadas

### CloudPanel (Opcional)

Se seu VPS tem CloudPanel:

1. **Acesse**: `https://SEU_IP:8443`
2. **Crie Site**: Node.js application
3. **Configure**: Port 3000
4. **Deploy**: Via Git

### Database Real (Produção)

Para usar database real em produção:

```bash
# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Configurar database
sudo -u postgres createdb eo_clinica
sudo -u postgres createuser eo_user --pwprompt

# Atualizar .env
DATABASE_URL="postgresql://eo_user:password@localhost:5432/eo_clinica"

# Executar migrations
npm run db:migrate:prod
npm run db:seed
```

## 📈 Otimizações de Performance

### 1. Nginx Caching

```nginx
# Em /etc/nginx/sites-available/eo-clinica
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Gzip Compression

```nginx
# Em /etc/nginx/nginx.conf
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### 3. PM2 Clustering

```javascript
// Em ecosystem.config.js
module.exports = {
  apps: [{
    name: 'eo-clinica-hostinger',
    script: 'npx tsx src/index-hostinger.ts',
    instances: 'max', // ou número específico
    exec_mode: 'cluster'
  }]
};
```

## 🔗 Links Úteis

- [Hostinger VPS Documentation](https://support.hostinger.com/en/collections/3083923-vps-hosting)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Status**: ✅ Pronto para deploy no Hostinger VPS
**Custo**: 💰 A partir de $4.99/mês (VPS 1)
**Tempo de setup**: ~15-30 minutos
**Performance**: ⚡ Alta (1000 Mb/s network)