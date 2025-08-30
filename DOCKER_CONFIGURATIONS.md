# 🐳 EO Clínica - Configurações Docker

> **Sistema Unificado de Containerização com WhatsApp AI Integration**  
> **Versão:** 2.1.1 | **Data:** 28 de Agosto de 2025

---

## 📋 **Visão Geral das Configurações**

O EO Clínica agora possui **3 configurações Docker otimizadas** para diferentes cenários de uso:

### 🎯 **Configurações Disponíveis**

| Arquivo | Ambiente | Descrição | Uso Recomendado |
|---------|----------|-----------|------------------|
| `docker-compose.yml` | **Produção Unificada** | Configuração consolidada pronta para produção | ✅ **Recomendado** |
| `docker-compose.dev.yml` | **Desenvolvimento** | Hot reload, debug habilitado | 🔧 Desenvolvimento local |
| `docker-compose.prod.yml` | **Enterprise** | Recursos avançados, alta disponibilidade | 🏢 Produção empresarial |

---

## ⚡ **Quick Start**

### **Produção (Recomendado)**
```bash
# Subir sistema completo
docker-compose up -d

# Verificar status
docker-compose ps

# Visualizar logs
docker-compose logs -f
```

### **Desenvolvimento**
```bash
# Ambiente com hot reload
docker-compose -f docker-compose.dev.yml up -d

# Desenvolvimento com logs
docker-compose -f docker-compose.dev.yml up
```

### **Enterprise (Alta Performance)**
```bash
# Configuração avançada
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🏗️ **Arquitetura do Sistema Consolidado**

### **Serviços Principais**

```mermaid
graph TB
    subgraph "Load Balancer"
        NGINX[Nginx Reverse Proxy<br/>:80, :443]
    end
    
    subgraph "Application Layer"
        APP[Backend API<br/>:3000]
        FRONTEND[Frontend Next.js<br/>:3001]
    end
    
    subgraph "Database Layer"
        POSTGRES[PostgreSQL<br/>:5433]
        REDIS[Redis Cache<br/>:6380]
    end
    
    subgraph "AI & Automation"
        N8N[N8N Workflows<br/>:5678]
        WAHA[WhatsApp API<br/>:3002]
        CHROMA[ChromaDB<br/>:8000]
        CLICK[ClickHouse<br/>:8123]
    end
    
    NGINX --> APP
    NGINX --> FRONTEND
    APP --> POSTGRES
    APP --> REDIS
    N8N --> POSTGRES
    N8N --> REDIS
    WAHA --> APP
    CHROMA --> CLICK
```

### **🔧 Principais Melhorias Implementadas**

✅ **Consolidação Completa**
- Eliminadas duplicações de PostgreSQL e Redis
- Network unificado (`clinic-network`)
- Configurações consistentes entre ambientes

✅ **Containerização do Frontend**
- Frontend Next.js agora está containerizado
- Build otimizado com multi-stage Docker
- Hot reload para desenvolvimento

✅ **Otimizações de Performance**
- Health checks em todos os serviços
- Resource limits configurados
- Configurações de produção otimizadas

✅ **Segurança Aprimorada**
- Secrets externalizados
- Networks isolados
- Usuários não-privilegiados nos containers

---

## 📊 **Mapeamento de Portas**

### **Portas Externas (Host → Container)**

| Porta | Serviço | Descrição |
|-------|---------|-----------|
| `3000` | Backend | API EO Clínica |
| `3001` | Frontend | Interface Next.js |
| `3002` | WAHA | WhatsApp Business API |
| `5433` | PostgreSQL | Database (mantido para compatibilidade) |
| `5678` | N8N | Workflow Automation |
| `6380` | Redis | Cache & Sessions (mantido para compatibilidade) |
| `8000` | ChromaDB | Vector Database |
| `8123` | ClickHouse | ChromaDB Backend |
| `80/443` | Nginx | Load Balancer (apenas prod) |

### **🔍 URLs de Acesso**

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend** | http://localhost:3001 | - |
| **Backend API** | http://localhost:3000 | - |
| **N8N** | http://localhost:5678 | admin / admin123 |
| **WAHA** | http://localhost:3002 | API Key required |
| **ChromaDB** | http://localhost:8000 | - |
| **PgAdmin** | http://localhost:5050 | admin@clinic.com / admin123 |

---

## 🎛️ **Configurações por Ambiente**

### **📦 docker-compose.yml (Produção Unificada)**

**✨ Características:**
- Todos os serviços essenciais
- Configuração consolidada sem duplicações
- Pronto para produção
- WAHA integrado na porta 3002
- Health checks habilitados
- Network único `clinic-network`

**🚀 Serviços Incluídos:**
- ✅ Backend (Node.js + Fastify)
- ✅ Frontend (Next.js containerizado)
- ✅ PostgreSQL (porta 5433)
- ✅ Redis (porta 6380)
- ✅ N8N (Workflows)
- ✅ WAHA (WhatsApp API)
- ✅ ChromaDB + ClickHouse
- ✅ Nginx (Load Balancer)
- ⚠️ PgAdmin (profile development)

### **🔧 docker-compose.dev.yml (Desenvolvimento)**

**✨ Características:**
- Hot reload para Backend e Frontend
- Volumes mapeados para código fonte
- Debug habilitado
- Logs detalhados
- Configurações leves para performance

**📝 Diferenças do ambiente produção:**
- `NODE_ENV=development`
- `BCRYPT_SALT_ROUNDS=6` (mais rápido)
- Volumes de código mapeados
- PgAdmin sempre disponível
- Networks de desenvolvimento

### **🏢 docker-compose.prod.yml (Enterprise)**

**✨ Características:**
- Health checks avançados
- Resource limits configurados
- Secrets management
- High availability ready
- Performance tuning

**⚡ Otimizações Enterprise:**
- PostgreSQL com tuning de performance
- Redis com configurações de produção
- Resource limits por container
- Conditions em depends_on
- Networks isolados de produção

---

## 🔐 **Configuração de Ambiente**

### **Arquivo .env Atualizado**

As principais mudanças no `.env`:

```bash
# Database (mantida compatibilidade com porta 5433)
DATABASE_URL=postgresql://clinic_user:clinic_password@localhost:5433/eo_clinica_db
DB_PASSWORD=clinic_password

# Redis (mantida compatibilidade com porta 6380)  
REDIS_URL=redis://localhost:6380
REDIS_PASSWORD=

# WAHA (nova porta 3002)
WAHA_API_URL=http://localhost:3002
WAHA_API_KEY=your-waha-api-key-here

# N8N (configurações consolidadas)
N8N_USER=admin
N8N_PASSWORD=admin123
N8N_ENCRYPTION_KEY=eo-clinica-n8n-encryption-key-2024

# Produção (para docker-compose.prod.yml)
DOMAIN=eo-clinica.com
CLICKHOUSE_PASSWORD=chroma_password_prod
```

### **Configuração Rápida**

```bash
# 1. Copiar arquivo de exemplo
cp .env.example .env

# 2. Configurar suas API keys
nano .env  # Adicionar suas chaves

# 3. Subir sistema
docker-compose up -d

# 4. Verificar saúde dos serviços
docker-compose ps
```

---

## 🧪 **Comandos Úteis**

### **Gerenciamento de Containers**

```bash
# Status dos serviços
docker-compose ps

# Logs em tempo real
docker-compose logs -f

# Logs de um serviço específico
docker-compose logs -f app

# Restart de um serviço
docker-compose restart app

# Parar todos os serviços
docker-compose down

# Parar e remover volumes
docker-compose down --volumes
```

### **Desenvolvimento**

```bash
# Subir apenas serviços essenciais
docker-compose up postgres redis chromadb n8n

# Rebuild de um serviço
docker-compose build app --no-cache

# Executar comando em container
docker-compose exec app npm run db:migrate

# Acesso ao shell do container
docker-compose exec app sh
```

### **Monitoramento**

```bash
# Verificar resource usage
docker stats

# Verificar health status
docker-compose ps --format "table {{.Name}}\t{{.Status}}"

# Verificar logs de erro
docker-compose logs --tail=50 | grep ERROR
```

---

## 🔍 **Troubleshooting**

### **Problemas Comuns**

#### **❌ Porta em uso**
```bash
# Verificar portas em uso
sudo lsof -i :5433  # PostgreSQL
sudo lsof -i :6380  # Redis
sudo lsof -i :3002  # WAHA

# Parar containers conflitantes
docker-compose down
```

#### **❌ Problemas de rede**
```bash
# Recriar network
docker network rm eo-clinica-network
docker-compose up -d

# Verificar conectividade entre containers
docker-compose exec app ping postgres
```

#### **❌ Volumes/dados corrompidos**
```bash
# Reset completo (⚠️ APAGA DADOS!)
docker-compose down --volumes
docker system prune -af
docker-compose up -d
```

### **Health Checks**

```bash
# Verificar status de saúde
curl http://localhost:3000/health     # Backend
curl http://localhost:3001           # Frontend  
curl http://localhost:8000/api/v1/heartbeat  # ChromaDB
```

---

## 🚀 **Migração do Sistema Antigo**

### **Para usuários com configuração anterior:**

```bash
# 1. Backup dos dados atuais
docker-compose exec postgres pg_dump -U clinic_user eo_clinica_db > backup.sql

# 2. Parar sistema antigo
docker-compose down

# 3. Fazer backup da configuração
mv docker-compose.ai-integration.yml docker-compose.ai-integration.yml.backup

# 4. Subir nova configuração consolidada
docker-compose up -d

# 5. Verificar que tudo está funcionando
docker-compose ps
curl http://localhost:3000/health
```

### **🔄 Compatibilidade Mantida**

- ✅ **Portas:** Mantidas 5433 (PostgreSQL) e 6380 (Redis)
- ✅ **Networks:** Consolidado para `clinic-network`  
- ✅ **Dados:** Volumes mantidos com nomes únicos
- ✅ **APIs:** Todas as URLs de API mantidas
- ✅ **Scripts:** Todos os scripts existentes funcionam

---

## 📚 **Documentação Relacionada**

- 📖 **[Guia de Deploy em Produção](docs/04-deployment/PRODUCTION_DEPLOYMENT.md)**
- 🏗️ **[Arquitetura WhatsApp AI](docs/11-ai-implementation/WHATSAPP_AI_ARCHITECTURE.md)**
- 🔐 **[Configurações de Segurança](docs/05-security/SECURITY_OVERVIEW.md)**
- 🧪 **[Estratégias de Teste](tests/README.md)**

---

**🎯 Resultado:** Sistema Docker completamente consolidado, otimizado e pronto para produção com WhatsApp AI Integration totalmente integrado.

*Desenvolvido com "sem pressa, mas com qualidade" ✨*