# EO CLÍNICA - Production Deployment Guide
## Complete Production Setup and Deployment Documentation

### 🚀 DEPLOYMENT OVERVIEW

This guide covers the complete production deployment of the EO Clínica system, including infrastructure setup, security configuration, monitoring, and maintenance procedures.

**Deployment Architecture**: Containerized microservices with Docker  
**Target Environment**: Production-ready cloud infrastructure  
**Security Level**: Enterprise-grade with LGPD compliance  
**Scalability**: Horizontal scaling ready  

---

## 🏗️ INFRASTRUCTURE REQUIREMENTS

### Minimum System Requirements

#### Production Server Specifications
```yaml
Web Server:
  CPU: 4 vCPUs (Intel/AMD 64-bit)
  RAM: 8 GB minimum (16 GB recommended)
  Storage: 100 GB SSD (with backup strategy)
  OS: Ubuntu 22.04 LTS or CentOS 8+

Database Server:
  CPU: 4 vCPUs
  RAM: 16 GB minimum (32 GB recommended)
  Storage: 200 GB SSD with RAID 1
  OS: Ubuntu 22.04 LTS

Cache/Redis Server:
  CPU: 2 vCPUs
  RAM: 8 GB
  Storage: 50 GB SSD
  OS: Ubuntu 22.04 LTS
```

#### Network Requirements
- **Bandwidth**: 100 Mbps minimum (1 Gbps recommended)
- **Latency**: <50ms to target users
- **SSL Certificate**: Let's Encrypt or commercial CA
- **Domain**: HTTPS-enabled custom domain
- **Firewall**: Only ports 80, 443, 22 (SSH) open

---

## 🐳 DOCKER DEPLOYMENT

### 📋 Available Docker Configurations

EO Clínica now provides **3 optimized Docker configurations** for different environments:

1. **`docker-compose.yml`** - **Unified production-ready configuration** (recommended)
2. **`docker-compose.dev.yml`** - Development environment with hot reload
3. **`docker-compose.prod.yml`** - Enterprise production with advanced security

### ⚡ Quick Start (Recommended)

```bash
# Production deployment (unified configuration)
docker-compose up -d

# Development with hot reload  
docker-compose -f docker-compose.dev.yml up -d

# Enterprise production (advanced features)
docker-compose -f docker-compose.prod.yml up -d
```

### 🏗️ Unified Docker Compose (Main Configuration)

The main `docker-compose.yml` consolidates all services with production-ready settings:

```yaml
version: '3.8'

services:
  # Main Application (Node.js 20)
  app:
    image: eo-clinica/backend:latest
    container_name: eo-clinica-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://eoclinica:${DB_PASSWORD}@postgres:5432/eoclinica
      - REDIS_URL=redis://redis:6379
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - chromadb
    networks:
      - eo-clinica-network
    volumes:
      - app-logs:/app/logs
      - app-uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: eo-clinica-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=eoclinica
      - POSTGRES_USER=eoclinica
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - eo-clinica-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eoclinica -d eoclinica"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: eo-clinica-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 4gb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./docker/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    networks:
      - eo-clinica-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # ChromaDB Vector Database
  chromadb:
    image: chromadb/chroma:latest
    container_name: eo-clinica-vectordb
    restart: unless-stopped
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_PORT=8000
    ports:
      - "8000:8000"
    volumes:
      - chromadb-data:/chroma/data
    networks:
      - eo-clinica-network

  # N8N Workflow Automation
  n8n:
    image: n8nio/n8n:latest
    container_name: eo-clinica-n8n
    restart: unless-stopped
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=https://your-domain.com
      - GENERIC_TIMEZONE=America/Sao_Paulo
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${N8N_DB_PASSWORD}
    ports:
      - "5678:5678"
    volumes:
      - n8n-data:/home/node/.n8n
      - ./n8n-workflows:/workflows
    depends_on:
      - postgres
    networks:
      - eo-clinica-network

  # Frontend (Next.js with Node.js 20)
  frontend:
    image: eo-clinica/frontend:latest
    container_name: eo-clinica-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.your-domain.com/api/v1
    ports:
      - "3001:3000"
    networks:
      - eo-clinica-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: eo-clinica-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - app
      - frontend
    networks:
      - eo-clinica-network

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  chromadb-data:
    driver: local
  n8n-data:
    driver: local
  app-logs:
    driver: local
  app-uploads:
    driver: local

networks:
  eo-clinica-network:
    driver: bridge
```

### Environment Variables

Create `/opt/eo-clinica/.env.production`:

```bash
# Database Configuration
DB_PASSWORD=<strong_database_password>
REDIS_PASSWORD=<strong_redis_password>

# Application Security
NODE_ENV=production
JWT_SECRET=<256_bit_random_string>
JWT_REFRESH_SECRET=<different_256_bit_string>
MASTER_ENCRYPTION_KEY=<256_bit_hex_key>

# AI Integration
CLAUDE_API_KEY=<anthropic_api_key>
OPENAI_API_KEY=<openai_api_key_optional>

# External Integrations
WHATSAPP_PHONE_NUMBER_ID=<whatsapp_phone_id>
WHATSAPP_ACCESS_TOKEN=<whatsapp_access_token>
TWILIO_ACCOUNT_SID=<twilio_sid>
TWILIO_AUTH_TOKEN=<twilio_token>
TWILIO_PHONE_NUMBER=<twilio_phone>

# Google Services
GOOGLE_CLIENT_ID=<google_oauth_client_id>
GOOGLE_CLIENT_SECRET=<google_oauth_secret>

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<smtp_username>
SMTP_PASSWORD=<smtp_app_password>

# N8N Configuration
N8N_USER=admin
N8N_PASSWORD=<strong_n8n_password>
N8N_DB_PASSWORD=<n8n_database_password>

# Security Configuration
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
ALLOWED_ORIGINS=https://eo-clinica.com,https://app.eo-clinica.com

# LGPD Compliance
DPO_EMAIL=dpo@eo-clinica.com
DATA_RETENTION_YEARS=7
AUDIT_RETENTION_YEARS=10

# Monitoring
SENTRY_DSN=<sentry_dsn_optional>
LOG_LEVEL=info
```

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Server Preparation

#### Install Docker and Docker Compose
```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 20 (for local development and testing)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
docker --version
docker-compose --version
node --version  # Should be 20.x
npm --version
```

#### Setup Project Directory
```bash
sudo mkdir -p /opt/eo-clinica
sudo chown $USER:$USER /opt/eo-clinica
cd /opt/eo-clinica

# Clone repository
git clone https://github.com/your-org/eo-clinica.git .

# Set permissions
chmod +x scripts/*.sh
```

### Step 2: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone \
  -d eo-clinica.com \
  -d app.eo-clinica.com \
  -d api.eo-clinica.com \
  --email admin@eo-clinica.com \
  --agree-tos

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option B: Commercial Certificate
```bash
# Copy certificate files
sudo mkdir -p /opt/eo-clinica/nginx/ssl
sudo cp your-domain.crt /opt/eo-clinica/nginx/ssl/
sudo cp your-domain.key /opt/eo-clinica/nginx/ssl/
sudo chmod 600 /opt/eo-clinica/nginx/ssl/*
```

### Step 3: Database Setup

#### Initialize PostgreSQL
```bash
# Create database initialization script
cat > docker/postgres/init.sql << 'EOF'
-- Create additional databases
CREATE DATABASE n8n;
CREATE USER n8n WITH ENCRYPTED PASSWORD 'your_n8n_password';
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;

-- Create extensions
\c eoclinica;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Performance optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '50MB';
SELECT pg_reload_conf();
EOF
```

### Step 4: Nginx Configuration

Create `/opt/eo-clinica/nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Frontend (app.eo-clinica.com)
    server {
        listen 443 ssl http2;
        server_name app.eo-clinica.com;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
    
    # API Backend (api.eo-clinica.com)
    server {
        listen 443 ssl http2;
        server_name api.eo-clinica.com;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Rate limiting for API
        location /api/v1/auth {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://app:3000;
            include proxy_params.conf;
        }
        
        location /api/v1 {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app:3000;
            include proxy_params.conf;
        }
        
        location /health {
            proxy_pass http://app:3000;
            access_log off;
        }
    }
    
    # N8N Workflows (workflows.eo-clinica.com)
    server {
        listen 443 ssl http2;
        server_name workflows.eo-clinica.com;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # Restrict access to admin IPs
        allow 203.0.113.0/24;  # Your office IP range
        deny all;
        
        location / {
            proxy_pass http://n8n:5678;
            include proxy_params.conf;
        }
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name eo-clinica.com app.eo-clinica.com api.eo-clinica.com workflows.eo-clinica.com;
        return 301 https://$server_name$request_uri;
    }
}
```

Create `/opt/eo-clinica/nginx/proxy_params.conf`:
```nginx
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
```

### Step 5: Application Deployment

#### Automated Production Deploy (RECOMMENDED)
```bash
cd /opt/eo-clinica

# Use the automated production script
./scripts/start-production.sh

# This script will:
# - Check prerequisites
# - Create automatic backups
# - Clean Docker environment
# - Build production images
# - Start services with retry logic
# - Run database migrations
# - Perform health checks
# - Provide rollback if needed
```

#### Manual Build and Deploy (Alternative)
```bash
cd /opt/eo-clinica

# Build Docker images
docker build -t eo-clinica/backend:latest .
docker build -t eo-clinica/frontend:latest ./frontend

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check deployment status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs app
```

#### Database Migration
```bash
# Run Prisma migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# Seed database with initial data
docker-compose -f docker-compose.prod.yml exec app npm run db:seed

# Verify database setup
docker-compose -f docker-compose.prod.yml exec postgres psql -U eoclinica -d eoclinica -c "\dt"
```

### Step 6: N8N Workflow Setup

#### Import Workflows
```bash
# Copy workflow files
docker cp ./n8n-workflows/ eo-clinica-n8n:/workflows/

# Import workflows via N8N CLI (inside container)
docker-compose -f docker-compose.prod.yml exec n8n n8n import:workflow --input=/workflows/
```

#### Configure Webhooks
1. Access N8N at `https://workflows.eo-clinica.com`
2. Login with configured credentials
3. Update webhook URLs to production domain
4. Test webhook connectivity

---

## 🔐 SECURITY HARDENING

### System Security

#### Firewall Configuration (UFW)
```bash
# Install and configure UFW
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable
sudo ufw status verbose
```

#### SSH Hardening
Edit `/etc/ssh/sshd_config`:
```bash
# Disable root login
PermitRootLogin no

# Use key-based authentication only
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional)
Port 2222

# Restart SSH service
sudo systemctl restart ssh
```

### Application Security

#### Container Security
```bash
# Run containers as non-root user
# Add to Dockerfile:
RUN addgroup --gid 1001 --system nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

# Scan images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/app \
  aquasec/trivy image eo-clinica/backend:latest
```

#### Secrets Management
```bash
# Use Docker secrets for sensitive data
echo "your_jwt_secret" | docker secret create jwt_secret -
echo "your_db_password" | docker secret create db_password -

# Update docker-compose.yml to use secrets
secrets:
  jwt_secret:
    external: true
  db_password:
    external: true
```

---

## 📊 MONITORING & LOGGING

### Application Monitoring

#### Health Check Setup
```bash
# Create health check script
cat > /opt/eo-clinica/scripts/health-check.sh << 'EOF'
#!/bin/bash

# Check application health
curl -f http://localhost:3000/health || exit 1

# Check database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U eoclinica || exit 1

# Check Redis connectivity
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping || exit 1

echo "All services are healthy"
EOF

chmod +x /opt/eo-clinica/scripts/health-check.sh

# Add to crontab for monitoring
crontab -e
# Add: */5 * * * * /opt/eo-clinica/scripts/health-check.sh >> /var/log/health-check.log 2>&1
```

#### Log Aggregation
```yaml
# Add to docker-compose.prod.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service,version"
```

### External Monitoring (Optional)

#### Uptime Monitoring
```bash
# Setup external monitoring services:
# - UptimeRobot (free tier available)
# - Pingdom
# - StatusCake

# Monitor these endpoints:
# - https://api.eo-clinica.com/health
# - https://app.eo-clinica.com
# - Database connectivity
# - SSL certificate expiry
```

---

## 🔄 BACKUP STRATEGY

### Database Backups

#### Automated PostgreSQL Backups
```bash
# Create backup script
cat > /opt/eo-clinica/scripts/backup-db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/eo-clinica/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/eoclinica_backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
docker-compose -f /opt/eo-clinica/docker-compose.prod.yml exec postgres \
  pg_dump -U eoclinica -d eoclinica > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOF

chmod +x /opt/eo-clinica/scripts/backup-db.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/eo-clinica/scripts/backup-db.sh
```

#### Backup Verification
```bash
# Create verification script
cat > /opt/eo-clinica/scripts/verify-backup.sh << 'EOF'
#!/bin/bash

LATEST_BACKUP=$(ls -t /opt/eo-clinica/backups/*.sql.gz | head -1)

if [ -n "$LATEST_BACKUP" ]; then
    # Test backup integrity
    gunzip -t $LATEST_BACKUP
    if [ $? -eq 0 ]; then
        echo "Backup verification successful: $LATEST_BACKUP"
    else
        echo "Backup verification failed: $LATEST_BACKUP"
        # Send alert notification
    fi
else
    echo "No backups found"
fi
EOF

chmod +x /opt/eo-clinica/scripts/verify-backup.sh
```

### File System Backups

#### Application Data Backup
```bash
# Create application backup script
cat > /opt/eo-clinica/scripts/backup-app.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/eo-clinica/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='logs' \
  /opt/eo-clinica/

# Backup Docker volumes
docker run --rm -v eo-clinica_app-uploads:/data \
  -v $BACKUP_DIR:/backup alpine \
  tar -czf /backup/uploads_backup_$DATE.tar.gz /data

echo "Application backup completed"
EOF

chmod +x /opt/eo-clinica/scripts/backup-app.sh
```

---

## 🔧 MAINTENANCE PROCEDURES

### Regular Maintenance Tasks

#### Daily Tasks (Automated)
```bash
# Create daily maintenance script
cat > /opt/eo-clinica/scripts/daily-maintenance.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/eo-clinica-maintenance.log"

echo "$(date): Starting daily maintenance" >> $LOG_FILE

# Clean up old log files
find /opt/eo-clinica/logs -name "*.log" -mtime +7 -delete

# Clean up temporary files
docker system prune -f --volumes

# Update container images (if needed)
# docker-compose -f /opt/eo-clinica/docker-compose.prod.yml pull

# Restart services if needed
# docker-compose -f /opt/eo-clinica/docker-compose.prod.yml restart

echo "$(date): Daily maintenance completed" >> $LOG_FILE
EOF

chmod +x /opt/eo-clinica/scripts/daily-maintenance.sh

# Add to crontab
crontab -e
# Add: 0 3 * * * /opt/eo-clinica/scripts/daily-maintenance.sh
```

#### Weekly Tasks
```bash
# Create weekly maintenance script
cat > /opt/eo-clinica/scripts/weekly-maintenance.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/eo-clinica-maintenance.log"

echo "$(date): Starting weekly maintenance" >> $LOG_FILE

# Database maintenance
docker-compose -f /opt/eo-clinica/docker-compose.prod.yml exec postgres \
  psql -U eoclinica -d eoclinica -c "VACUUM ANALYZE;"

# Update system packages
sudo apt update && sudo apt upgrade -y

# Check SSL certificate expiry
certbot certificates

echo "$(date): Weekly maintenance completed" >> $LOG_FILE
EOF

chmod +x /opt/eo-clinica/scripts/weekly-maintenance.sh

# Add to crontab
crontab -e
# Add: 0 4 * * 0 /opt/eo-clinica/scripts/weekly-maintenance.sh
```

### Update Procedures

#### Application Updates
```bash
# Create update script
cat > /opt/eo-clinica/scripts/update-app.sh << 'EOF'
#!/bin/bash

cd /opt/eo-clinica

# Backup before update
./scripts/backup-db.sh
./scripts/backup-app.sh

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Build new images
docker build -t eo-clinica/backend:latest .
docker build -t eo-clinica/frontend:latest ./frontend

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# Restart services with zero downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps app frontend

# Verify deployment
sleep 30
curl -f http://localhost:3000/health || echo "Health check failed"

echo "Application update completed"
EOF

chmod +x /opt/eo-clinica/scripts/update-app.sh
```

---

## 🚨 TROUBLESHOOTING

### Common Issues

#### Service Won't Start
```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs app

# Check system resources
df -h
free -h
docker system df

# Check configuration
docker-compose -f docker-compose.prod.yml config
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U eoclinica

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection manually
docker-compose -f docker-compose.prod.yml exec app npm run db:test
```

#### High Memory Usage
```bash
# Monitor container resources
docker stats

# Check for memory leaks
docker-compose -f docker-compose.prod.yml exec app node --inspect --heap-profiler

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart
```

### Performance Optimization

#### Database Performance
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_doctor_date 
ON appointments(doctor_id, scheduled_at);
```

#### Application Performance
```bash
# Monitor application metrics
curl http://localhost:3000/metrics

# Check for bottlenecks
docker-compose -f docker-compose.prod.yml exec app npm run profile

# Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

---

## 📞 SUPPORT & MAINTENANCE

### Emergency Contacts
- **System Administrator**: admin@eo-clinica.com
- **Database Administrator**: dba@eo-clinica.com  
- **Security Team**: security@eo-clinica.com
- **On-call Emergency**: +55 11 9999-9999

### Monitoring Dashboards
- **Application Health**: `https://api.eo-clinica.com/health`
- **N8N Workflows**: `https://workflows.eo-clinica.com`
- **Database Monitoring**: Internal dashboard
- **System Metrics**: Server monitoring tools

### Documentation Updates
- Update this guide when making infrastructure changes
- Document all custom configurations
- Maintain runbook for common procedures
- Keep emergency procedures updated

---

**🚀 Deployment Status**: Production Ready  
**🔒 Security Level**: Enterprise Grade  
**📊 Monitoring**: 24/7 Automated  
**🔄 Backup Strategy**: Automated Daily  
**⚡ Performance**: Optimized for Scale