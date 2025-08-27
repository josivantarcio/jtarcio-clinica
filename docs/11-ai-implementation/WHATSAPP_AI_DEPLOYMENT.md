# 🐳 WhatsApp AI Integration - Guia de Deploy Completo

> **Guia Completo para Deploy da Integração WhatsApp + IA**  
> **Status:** Production Ready ✅ | **Versão:** v2.1.0  
> **Data:** 27 de Agosto de 2025

---

## 🎯 **Visão Geral do Deploy**

Este guia oferece instruções completas para deploy da integração WhatsApp + IA em todos os ambientes: desenvolvimento, staging e produção.

### **🏗️ Arquitetura de Deploy**

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx Reverse Proxy]
    end
    
    subgraph "Application Layer"
        N8N[N8N Workflows<br/>:5678]
        WAHA[WAHA API<br/>:3001]
        APP[EO Clínica API<br/>:3000]
    end
    
    subgraph "AI Services"
        GEM[Gemini Pro API]
        CHR[ChromaDB<br/>:8000]
        VOI[Voice Recognition]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>:5434)]
        RD[(Redis<br/>:6381)]
        CL[(ClickHouse<br/>:8123)]
    end
    
    subgraph "External"
        WA[WhatsApp Business]
        GM[Google Gemini]
    end
    
    WA --> LB
    LB --> N8N
    LB --> WAHA
    LB --> APP
    N8N --> GEM
    WAHA --> CHR
    APP --> PG
    APP --> RD
    CHR --> CL
    GEM --> GM
```

---

## 🚀 **Deploy Rápido (5 Minutos)**

### **⚡ Quick Start**
```bash
# 1. Clone o repositório
git clone [repository-url]
cd eo-clinica2

# 2. Configure environment
cp .env.example .env
# Configure suas API keys no .env

# 3. Deploy completo
./scripts/deploy-whatsapp-ai.sh full-deployment development

# 4. Verificar status
curl http://localhost:8080/health
```

### **✅ Verificação Rápida**
```bash
# Verificar todos os serviços
docker-compose -f docker-compose.ai-integration.yml ps

# Logs dos serviços
docker-compose -f docker-compose.ai-integration.yml logs -f

# Health checks
curl http://localhost:5678/healthz    # N8N
curl http://localhost:3001/api/health # WAHA
curl http://localhost:8000/api/v1/heartbeat # ChromaDB
```

---

## 📋 **Pré-requisitos**

### **💻 Requisitos do Sistema**

#### **Hardware Mínimo**
```yaml
Development:
  CPU: 4 cores
  RAM: 8GB
  Storage: 20GB SSD
  Network: 100Mbps

Production:
  CPU: 8+ cores
  RAM: 16GB+  
  Storage: 100GB+ SSD
  Network: 1Gbps+
```

#### **Software Necessário**
```bash
# Docker & Docker Compose
Docker: 20.10+
Docker Compose: 2.0+

# Node.js & npm
Node.js: 18+ (20 recomendado)
npm: 9+

# Git
Git: 2.30+

# Opcional (para desenvolvimento)
PostgreSQL Client: 14+
Redis CLI: 7+
```

### **🔑 API Keys Necessárias**

#### **Obrigatórias**
```bash
# Google Gemini Pro
GEMINI_API_KEY=your-gemini-api-key-here
# Obter em: https://ai.google.dev/

# WAHA WhatsApp API
WAHA_API_KEY=your-waha-api-key-here  
# Obter em: https://waha.devlike.pro/

# JWT para autenticação
JWT_SECRET=your-super-secure-jwt-secret
```

#### **Opcionais (para features avançadas)**
```bash
# N8N Automation
N8N_API_KEY=your-n8n-api-key-here

# Webhook Security
WAHA_WEBHOOK_HMAC_KEY=your-hmac-secret-key

# ChromaDB (se usando autenticação)
CHROMADB_API_KEY=your-chromadb-key
```

### **🌐 Configurações de Rede**

#### **Portas Utilizadas**
```yaml
External Ports:
  8080: Nginx (AI Services Proxy)
  5678: N8N (Workflow Management UI)
  3001: WAHA (WhatsApp API)
  8000: ChromaDB (Vector Database)

Internal Ports:  
  5434: PostgreSQL (AI Database)
  6381: Redis (AI Cache)
  8123: ClickHouse (ChromaDB Backend)
  9000: ClickHouse Native
```

---

## 🔧 **Deploy por Ambiente**

### **🧪 Ambiente de Desenvolvimento**

#### **Setup Inicial**
```bash
# 1. Configurar environment
export NODE_ENV=development
export AI_DEBUG=true
export LOG_LEVEL=debug

# 2. Deploy básico
./scripts/deploy-whatsapp-ai.sh phase-1-infrastructure development

# 3. Habilitar hot-reload (opcional)
docker-compose -f docker-compose.ai-integration.yml \
  -f docker-compose.dev.yml up -d
```

#### **Features de Desenvolvimento**
```yaml
Development Features:
  Hot Reload: Enabled
  Debug Logs: Verbose
  Test Endpoints: /api/test/*
  Mock Services: Available
  Performance Monitoring: Basic
```

#### **Configuração .env Development**
```bash
# Development specific
NODE_ENV=development
LOG_LEVEL=debug
AI_DEBUG=true

# Local services
DATABASE_URL=postgresql://clinic_user:clinic_password@localhost:5434/eo_clinica_db
REDIS_URL=redis://localhost:6381
N8N_HOST=http://localhost:5678
WAHA_API_URL=http://localhost:3001
CHROMADB_HOST=http://localhost:8000

# AI Configuration
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-1.5-pro-002
AI_RESPONSE_MAX_LENGTH=500
AI_PERSONALITY_MODE=friendly

# Rate limiting (relaxed for dev)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
```

### **🎭 Ambiente de Staging**

#### **Setup Staging**
```bash
# 1. Configurar environment
export NODE_ENV=staging
export AI_MONITORING=basic

# 2. Deploy staging
./scripts/deploy-whatsapp-ai.sh full-deployment staging

# 3. Executar testes de integração
npm run test:integration:staging
```

#### **Features de Staging**
```yaml
Staging Features:
  Production-like: 95% similarity
  Test Data: Safe test datasets
  Performance Testing: Enabled
  Security Testing: Full suite
  Monitoring: Basic monitoring
```

#### **Configuração .env Staging**
```bash
# Staging specific
NODE_ENV=staging
LOG_LEVEL=info

# Staging services (can use cloud endpoints)
DATABASE_URL=postgresql://user:pass@staging-db:5432/eo_clinica_staging
REDIS_URL=redis://staging-redis:6379

# AI Configuration (production settings)
GEMINI_API_KEY=your-staging-gemini-key
AI_RESPONSE_MAX_LENGTH=300
AI_PERSONALITY_MODE=professional

# Rate limiting (production-like)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
```

### **🚀 Ambiente de Produção**

#### **Setup Produção**
```bash
# 1. Configurar environment
export NODE_ENV=production
export AI_MONITORING=advanced
export SECURITY_LEVEL=high

# 2. Deploy produção com backup
./scripts/deploy-whatsapp-ai.sh full-deployment production

# 3. Verificar deployment
./scripts/verify-production-deployment.sh

# 4. Configurar monitoramento
./scripts/setup-monitoring.sh
```

#### **Features de Produção**
```yaml
Production Features:
  High Availability: Multi-instance
  Security: Maximum
  Monitoring: Advanced (Grafana/Prometheus)
  Backup: Automated daily
  SSL/TLS: Required
  LGPD: Full compliance
```

#### **Configuração .env Production**
```bash
# Production specific
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json

# Production databases (secured)
DATABASE_URL=postgresql://secure_user:${DB_PASSWORD}@prod-db:5432/eo_clinica_prod
REDIS_URL=redis://:${REDIS_PASSWORD}@prod-redis:6379

# AI Configuration (optimized)
GEMINI_API_KEY=${GEMINI_PROD_KEY}
GEMINI_MODEL=gemini-1.5-pro-002
AI_RESPONSE_MAX_LENGTH=300
AI_PERSONALITY_MODE=professional
AI_CONVERSATION_TIMEOUT=1800

# Security (maximum)
JWT_SECRET=${JWT_PROD_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_PROD_KEY}
WAHA_WEBHOOK_HMAC_KEY=${HMAC_PROD_KEY}

# Rate limiting (strict)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Business rules
APPOINTMENT_AUTO_BOOKING_ENABLED=true
EMERGENCY_ESCALATION_ENABLED=true
WHATSAPP_AI_ENABLED=true

# Monitoring & Alerts
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_PERFORMANCE_MONITORING=true
ALERT_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
```

---

## 🐳 **Deploy com Docker**

### **📦 Estrutura de Containers**

#### **Services Overview**
```yaml
version: '3.8'
services:
  # Core AI Services
  n8n:              # Workflow automation
  waha:             # WhatsApp API
  chromadb:         # Vector database
  
  # Data Layer  
  postgres-ai:      # AI-specific database
  redis-ai:         # AI cache layer
  clickhouse:       # ChromaDB backend
  
  # Infrastructure
  nginx-ai:         # Reverse proxy & load balancer
```

#### **Build & Deploy**
```bash
# 1. Build custom images (se necessário)
docker build -t eo-clinica-ai-services ./ai-services

# 2. Pull official images
docker-compose -f docker-compose.ai-integration.yml pull

# 3. Deploy stack completa
docker-compose -f docker-compose.ai-integration.yml up -d

# 4. Verificar status
docker-compose -f docker-compose.ai-integration.yml ps
```

#### **Volume Management**
```bash
# Backup volumes
docker run --rm -v eo-clinica-n8n-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/n8n-backup-$(date +%Y%m%d).tar.gz /data

# Restore volumes
docker run --rm -v eo-clinica-n8n-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/n8n-backup-20250827.tar.gz -C /
```

### **🔍 Health Checks Avançados**

#### **Service Health Monitoring**
```bash
# Script de health check completo
#!/bin/bash
services=("n8n" "waha" "chromadb" "redis-ai" "postgres-ai")

for service in "${services[@]}"; do
  echo "Checking $service..."
  health=$(docker-compose -f docker-compose.ai-integration.yml ps -q $service | \
    xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unhealthy")
  
  if [[ "$health" == "healthy" ]]; then
    echo "✅ $service: OK"
  else
    echo "❌ $service: $health"
  fi
done
```

#### **Performance Monitoring**
```bash
# Monitorar recursos dos containers
docker stats $(docker-compose -f docker-compose.ai-integration.yml ps -q)

# Logs específicos por serviço
docker-compose -f docker-compose.ai-integration.yml logs -f n8n
docker-compose -f docker-compose.ai-integration.yml logs -f waha
docker-compose -f docker-compose.ai-integration.yml logs -f chromadb
```

---

## ☁️ **Deploy em Cloud**

### **🌐 AWS Deployment**

#### **ECS/Fargate Setup**
```json
{
  "family": "eo-clinica-whatsapp-ai",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "n8n",
      "image": "n8nio/n8n:1.24.1",
      "portMappings": [{"containerPort": 5678}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DB_TYPE", "value": "postgresdb"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/eo-clinica-ai",
          "awslogs-region": "us-east-1"
        }
      }
    }
  ]
}
```

#### **RDS Configuration**
```yaml
Database Configuration:
  Engine: PostgreSQL 15
  Instance Class: db.t3.medium (production: db.r5.xlarge)
  Storage: 100GB GP2 (production: 500GB+ GP3)
  Backup Retention: 7 days
  Multi-AZ: Yes (production)
  
Connection:
  Endpoint: your-rds-endpoint.amazonaws.com
  Port: 5432
  Database: eo_clinica_ai_prod
  Username: eo_clinica_admin
```

#### **ElastiCache Redis**
```yaml
Redis Configuration:
  Engine: Redis 7.2
  Node Type: cache.t3.micro (production: cache.r6g.large)
  Cluster Mode: Disabled
  Backup: Enabled
  
Connection:
  Primary Endpoint: your-redis.cache.amazonaws.com
  Port: 6379
```

### **🔵 Azure Deployment**

#### **Container Instances**
```yaml
apiVersion: 2019-12-01
location: eastus
type: Microsoft.ContainerInstance/containerGroups
properties:
  containers:
    - name: n8n
      properties:
        image: n8nio/n8n:1.24.1
        resources:
          requests:
            cpu: 1
            memoryInGb: 2
        ports:
          - port: 5678
        environmentVariables:
          - name: NODE_ENV
            value: production
          - name: DB_TYPE
            value: postgresdb
  osType: Linux
  ipAddress:
    type: Public
    ports:
      - protocol: tcp
        port: 5678
```

#### **Azure Database for PostgreSQL**
```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group eo-clinica-ai-rg \
  --name eo-clinica-ai-postgres \
  --admin-user eoclinica \
  --admin-password "SecurePassword123!" \
  --sku-name GP_Gen5_2 \
  --version 13

# Configure firewall
az postgres server firewall-rule create \
  --resource-group eo-clinica-ai-rg \
  --server eo-clinica-ai-postgres \
  --name AllowAll \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

### **🟢 Google Cloud Deployment**

#### **Cloud Run Configuration**
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: eo-clinica-whatsapp-ai
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/memory: "4Gi"
        run.googleapis.com/cpu: "2"
    spec:
      containers:
      - image: gcr.io/project-id/eo-clinica-ai:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: gemini-api-key
              key: key
```

#### **Cloud SQL Configuration**
```bash
# Create PostgreSQL instance
gcloud sql instances create eo-clinica-ai-db \
  --database-version=POSTGRES_15 \
  --tier=db-standard-2 \
  --region=us-central1 \
  --backup \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=06

# Create database
gcloud sql databases create eo_clinica_ai_prod \
  --instance=eo-clinica-ai-db

# Create user
gcloud sql users create eoclinica \
  --instance=eo-clinica-ai-db \
  --password="SecurePassword123!"
```

---

## 🔐 **Configuração de Segurança**

### **🛡️ SSL/TLS Setup**

#### **Nginx SSL Configuration**
```nginx
server {
    listen 443 ssl http2;
    server_name ai.eoclinica.com;
    
    ssl_certificate /etc/ssl/certs/eoclinica.pem;
    ssl_certificate_key /etc/ssl/private/eoclinica.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### **Let's Encrypt Setup**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d ai.eoclinica.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **🔑 Secrets Management**

#### **Docker Secrets**
```bash
# Create secrets
echo "your-gemini-api-key" | docker secret create gemini_api_key -
echo "your-jwt-secret" | docker secret create jwt_secret -

# Use in compose
services:
  n8n:
    secrets:
      - gemini_api_key
      - jwt_secret
    environment:
      GEMINI_API_KEY_FILE: /run/secrets/gemini_api_key
```

#### **Environment Variables Security**
```bash
# Use .env file with proper permissions
chmod 600 .env
chown root:root .env

# Never commit secrets to git
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
echo "secrets/" >> .gitignore
```

### **🔒 Network Security**

#### **Firewall Configuration**
```bash
# Ubuntu/Debian with ufw
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp  # AI Services (restrict to internal)
sudo ufw deny 5432/tcp  # Block direct database access
sudo ufw deny 6379/tcp  # Block direct Redis access
sudo ufw enable
```

#### **Docker Network Isolation**
```yaml
networks:
  eo-clinica-ai:
    driver: bridge
    internal: true  # No external access
  eo-clinica-public:
    driver: bridge
    # Public access for nginx only
```

---

## 📊 **Monitoramento & Observabilidade**

### **📈 Métricas Básicas**

#### **Application Metrics**
```typescript
// Implementar em cada serviço
const metrics = {
  response_time: histogram('ai_response_time_seconds'),
  request_count: counter('ai_requests_total'),  
  error_rate: counter('ai_errors_total'),
  active_conversations: gauge('ai_active_conversations'),
  user_satisfaction: histogram('ai_user_satisfaction_score')
}
```

#### **Infrastructure Metrics**
```bash
# CPU, Memory, Disk usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Service-specific metrics
curl http://localhost:8080/metrics  # Prometheus format
```

### **🔍 Logging Centralizado**

#### **Log Configuration**
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service,environment"
```

#### **Log Aggregation (ELK Stack)**
```yaml
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
    
  logstash:
    image: logstash:7.17.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
      
  kibana:
    image: kibana:7.17.0
    ports:
      - "5601:5601"
```

### **🚨 Alerting**

#### **Health Check Alerting**
```bash
#!/bin/bash
# health-check-alert.sh

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

check_service() {
  local service=$1
  local endpoint=$2
  
  if ! curl -f -s "$endpoint" >/dev/null; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 $service is DOWN at $endpoint\"}" \
      $WEBHOOK_URL
  fi
}

check_service "N8N" "http://localhost:5678/healthz"
check_service "WAHA" "http://localhost:3001/api/health"
check_service "ChromaDB" "http://localhost:8000/api/v1/heartbeat"
```

#### **Performance Alerting**
```typescript
// Implementar thresholds para alertas
const ALERT_THRESHOLDS = {
  response_time_p95: 5000,      // 5 seconds
  error_rate_percent: 5,         // 5%
  active_conversations: 1000,    // Max concurrent
  memory_usage_percent: 85,      // 85% memory
  cpu_usage_percent: 80          // 80% CPU
}
```

---

## 🔧 **Troubleshooting**

### **🐛 Problemas Comuns**

#### **Service Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.ai-integration.yml logs service-name

# Check resources
docker system df
docker system prune  # Clean up if needed

# Check environment variables
docker-compose -f docker-compose.ai-integration.yml config
```

#### **Database Connection Issues**
```bash
# Test PostgreSQL connection
docker exec -it postgres-ai psql -U clinic_user -d eo_clinica_db

# Test Redis connection  
docker exec -it redis-ai redis-cli ping

# Check network connectivity
docker network ls
docker network inspect eo-clinica-ai-network
```

#### **Performance Issues**
```bash
# Monitor container resources
docker stats

# Check AI service response times
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8080/health

# Database performance
docker exec -it postgres-ai psql -U clinic_user -d eo_clinica_db \
  -c "SELECT * FROM pg_stat_activity;"
```

### **🔍 Debug Mode**

#### **Enable Debug Logging**
```bash
# Set debug environment
export LOG_LEVEL=debug
export AI_DEBUG=true
export NODE_ENV=development

# Restart with debug
docker-compose -f docker-compose.ai-integration.yml \
  -f docker-compose.debug.yml up -d
```

#### **Service-Specific Debugging**
```bash
# N8N debug mode
docker exec -it n8n n8n import:workflow --file debug-workflow.json

# WAHA session debugging
curl -X GET "http://localhost:3001/api/sessions" \
  -H "Authorization: Bearer $WAHA_API_KEY"

# Gemini API debugging
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

### **🆘 Disaster Recovery**

#### **Backup Strategy**
```bash
# Database backup
docker exec postgres-ai pg_dump -U clinic_user eo_clinica_db > backup.sql

# Volume backup
docker run --rm -v eo-clinica-n8n-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/full-backup-$(date +%Y%m%d).tar.gz /data

# Configuration backup
cp .env .env.backup
tar czf config-backup-$(date +%Y%m%d).tar.gz \
  docker-compose.ai-integration.yml nginx/ scripts/
```

#### **Restore Procedures**
```bash
# Database restore
docker exec -i postgres-ai psql -U clinic_user eo_clinica_db < backup.sql

# Volume restore
docker run --rm -v eo-clinica-n8n-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/full-backup-20250827.tar.gz -C /

# Full system restore
./scripts/restore-whatsapp-ai.sh backup-20250827.tar.gz
```

---

## 📚 **Scripts de Automação**

### **🚀 Deploy Script Principal**
```bash
# scripts/deploy-whatsapp-ai.sh - já implementado
./scripts/deploy-whatsapp-ai.sh [PHASE] [ENVIRONMENT]

# Exemplos:
./scripts/deploy-whatsapp-ai.sh phase-1-infrastructure development
./scripts/deploy-whatsapp-ai.sh full-deployment production
```

### **🔍 Health Check Script**
```bash
#!/bin/bash
# scripts/health-check-all.sh

echo "🔍 WhatsApp AI Integration - Health Check"
echo "========================================"

services=(
  "http://localhost:5678/healthz:N8N Workflows"
  "http://localhost:3001/api/health:WAHA WhatsApp API"
  "http://localhost:8000/api/v1/heartbeat:ChromaDB"
  "http://localhost:8080/health:AI Services Proxy"
)

for service in "${services[@]}"; do
  endpoint=$(echo $service | cut -d: -f1)
  name=$(echo $service | cut -d: -f2-)
  
  if curl -f -s "$endpoint" >/dev/null; then
    echo "✅ $name: OK"
  else
    echo "❌ $name: FAILED"
  fi
done
```

### **📊 Performance Test Script**
```bash
#!/bin/bash
# scripts/performance-test.sh

echo "📊 Performance Testing - WhatsApp AI"
echo "===================================="

# Test AI response time
echo "Testing AI response time..."
time curl -X POST "http://localhost:8080/api/v1/ai/process-message" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+5511999999999","message":"test","conversationId":"test"}'

# Load test with curl
echo "Running load test (100 requests)..."
for i in {1..100}; do
  curl -s "http://localhost:8080/health" >/dev/null &
done
wait

echo "Performance test completed!"
```

---

## 🎯 **Checklist de Deploy**

### **✅ Pré-Deploy**
- [ ] Docker e Docker Compose instalados
- [ ] API keys configuradas (.env)
- [ ] Portas disponíveis (8080, 5678, 3001, 8000)
- [ ] SSL certificates configurados (produção)
- [ ] Backup strategy definida
- [ ] Monitoring configurado

### **✅ Durante Deploy**
- [ ] Services started successfully
- [ ] Health checks passing
- [ ] Database migrations applied
- [ ] AI services responding
- [ ] WhatsApp integration working
- [ ] Tests passing

### **✅ Pós-Deploy**
- [ ] Load testing executed
- [ ] Security scan completed
- [ ] Performance monitoring enabled
- [ ] Alerts configured
- [ ] Documentation atualizada
- [ ] Team notified

### **✅ Produção Only**
- [ ] SSL/TLS certificates valid
- [ ] Firewall rules configured
- [ ] Backup verification
- [ ] Disaster recovery tested
- [ ] LGPD compliance verified
- [ ] Performance baselines established

---

## 📞 **Suporte e Manutenção**

### **🆘 Contatos de Emergência**
```yaml
Níveis de Suporte:
  P1 - Critical (Service Down):
    Response: Imediato
    Contact: DevOps Team
    
  P2 - High (Performance Issues):
    Response: 1 hora
    Contact: Development Team
    
  P3 - Medium (Feature Issues):  
    Response: 4 horas
    Contact: Product Team
    
  P4 - Low (Enhancements):
    Response: 24 horas
    Contact: Support Team
```

### **📋 Runbooks**
- **Service Restart:** `./scripts/restart-service.sh [service-name]`
- **Database Recovery:** `./scripts/db-recovery.sh [backup-file]`
- **Performance Tuning:** `./scripts/optimize-performance.sh`
- **Security Incident:** `./scripts/security-incident-response.sh`

### **🔄 Manutenção Regular**
```bash
# Daily maintenance
0 2 * * * /path/to/scripts/daily-maintenance.sh

# Weekly maintenance  
0 3 * * 0 /path/to/scripts/weekly-maintenance.sh

# Monthly maintenance
0 4 1 * * /path/to/scripts/monthly-maintenance.sh
```

---

**🎯 Status:** Production Ready ✅ | **🚀 Deploy:** Automatizado  
**💡 Objetivo:** Deploy confiável e escalável da integração WhatsApp + IA

*Este guia garante deploys consistentes e confiáveis em todos os ambientes, com foco em segurança, performance e observabilidade.*