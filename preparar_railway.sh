#!/bin/bash

# Script de Preparação do Projeto EO Clínica para Deploy no Railway
# Execute este script na RAIZ do projeto: ./preparar_railway.sh

set -e  # Parar em caso de erro

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║        PREPARANDO PROJETO EO CLÍNICA PARA DEPLOY NO RAILWAY                 ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# PASSO 1: Criar railway.toml na raiz (Backend)
# ============================================================================
echo -e "${BLUE}📝 PASSO 1: Criando railway.toml para o Backend...${NC}"

cat > railway.toml << 'EOF'
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10
EOF

echo -e "${GREEN}✅ railway.toml criado na raiz${NC}"
echo ""

# ============================================================================
# PASSO 2: Criar railway.toml no frontend
# ============================================================================
echo -e "${BLUE}📝 PASSO 2: Criando railway.toml para o Frontend...${NC}"

mkdir -p frontend

cat > frontend/railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/"
healthcheckTimeout = 300
EOF

echo -e "${GREEN}✅ frontend/railway.toml criado${NC}"
echo ""

# ============================================================================
# PASSO 3: Criar/Atualizar Dockerfile
# ============================================================================
echo -e "${BLUE}📝 PASSO 3: Criando Dockerfile otimizado...${NC}"

cat > Dockerfile << 'EOF'
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copiar arquivos do build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Variável de ambiente para produção
ENV NODE_ENV=production

# Start command
CMD ["npm", "run", "start:prod"]
EOF

echo -e "${GREEN}✅ Dockerfile criado/atualizado${NC}"
echo ""

# ============================================================================
# PASSO 4: Criar Health Check Route
# ============================================================================
echo -e "${BLUE}📝 PASSO 4: Criando endpoint de health check...${NC}"

mkdir -p src/routes

cat > src/routes/health.ts << 'EOF'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check básico
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      version: process.env.npm_package_version || '1.0.0'
    };
  });

  // Health check detalhado
  fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Testar conexão com banco
      const dbCheck = await fastify.prisma.$queryRaw`SELECT 1`;

      // Testar Redis (se configurado)
      let redisCheck = 'not configured';
      if (fastify.redis) {
        await fastify.redis.ping();
        redisCheck = 'connected';
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: dbCheck ? 'connected' : 'error',
          redis: redisCheck,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
          }
        }
      };
    } catch (error: any) {
      reply.status(503);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  });
}
EOF

echo -e "${GREEN}✅ src/routes/health.ts criado${NC}"
echo ""

# ============================================================================
# PASSO 5: Atualizar next.config.js do Frontend
# ============================================================================
echo -e "${BLUE}📝 PASSO 5: Atualizando next.config.js...${NC}"

cat > frontend/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'localhost',
      process.env.NEXT_PUBLIC_API_URL?.replace('https://', '').replace('http://', '') || ''
    ].filter(Boolean),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Configurações para Railway
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig
EOF

echo -e "${GREEN}✅ frontend/next.config.js atualizado${NC}"
echo ""

# ============================================================================
# PASSO 6: Criar template de variáveis de ambiente
# ============================================================================
echo -e "${BLUE}📝 PASSO 6: Criando templates de variáveis de ambiente...${NC}"

cat > .env.railway.template << 'EOF'
# ============= AMBIENTE =============
NODE_ENV=production
PORT=3000

# ============= DATABASE =============
DATABASE_URL=${{Postgres.DATABASE_URL}}

# ============= REDIS =============
REDIS_URL=${{Redis.REDIS_URL}}

# ============= JWT & SEGURANÇA =============
# GERAR COM: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=GERAR_CHAVE_AQUI
SECRET_KEY=GERAR_CHAVE_AQUI

# ============= CORS =============
ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}

# ============= CLAUDE AI =============
ANTHROPIC_API_KEY=sk-ant-SUA_CHAVE_AQUI

# ============= WHATSAPP (Opcional) =============
WAHA_API_URL=
WAHA_API_KEY=

# ============= N8N (Opcional) =============
N8N_WEBHOOK_URL=
N8N_API_KEY=

# ============= EMAIL =============
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-app
EMAIL_FROM=seu-email@gmail.com

# ============= LOGS =============
LOG_LEVEL=info
EOF

cat > frontend/.env.railway.template << 'EOF'
# ============= AMBIENTE =============
NODE_ENV=production
PORT=3000

# ============= API =============
NEXT_PUBLIC_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}

# ============= BACKEND PRIVADO =============
BACKEND_PRIVATE_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:3000
EOF

echo -e "${GREEN}✅ Templates de variáveis criados${NC}"
echo ""

# ============================================================================
# PASSO 7: Criar .dockerignore
# ============================================================================
echo -e "${BLUE}📝 PASSO 7: Criando .dockerignore...${NC}"

cat > .dockerignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
*.test.ts
*.spec.ts
tests/

# Development
.env
.env.local
.env.development
.env.test
*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Build
dist/
build/
.next/

# Docs
docs/
*.md
README.md

# CI/CD
.github/
.gitlab-ci.yml

# Docker
Dockerfile*
docker-compose*.yml
EOF

echo -e "${GREEN}✅ .dockerignore criado${NC}"
echo ""

# ============================================================================
# PASSO 8: Criar arquivo README para Railway
# ============================================================================
echo -e "${BLUE}📝 PASSO 8: Criando guia de deploy...${NC}"

cat > RAILWAY_DEPLOY.md << 'EOF'
# 🚀 Deploy no Railway - Guia Rápido

## Pré-requisitos
✅ Arquivos de configuração criados (railway.toml, Dockerfile)
✅ Health check endpoint implementado
✅ Conta no Railway criada

## Passos para Deploy

### 1. Criar Projeto no Railway
1. Acesse https://railway.app
2. Clique em "New Project"
3. Adicione PostgreSQL e Redis

### 2. Conectar Repositório
1. Clique em "+ New"
2. Selecione "GitHub Repo"
3. Escolha: josivantarcio/jtarcio-clinica

### 3. Configurar Variáveis
Use os templates em:
- `.env.railway.template` (Backend)
- `frontend/.env.railway.template` (Frontend)

### 4. Executar Migrações
```bash
railway login
railway link
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

### 5. Gerar Domínios
- Settings → Networking → Generate Domain

## 🔑 Gerar Chaves Seguras
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📚 Documentação Completa
Veja `guia_deploy_railway.md` para instruções detalhadas.
EOF

echo -e "${GREEN}✅ RAILWAY_DEPLOY.md criado${NC}"
echo ""

# ============================================================================
# RESUMO
# ============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ PREPARAÇÃO CONCLUÍDA COM SUCESSO!                      ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Arquivos criados/atualizados:${NC}"
echo "  ✅ railway.toml (raiz)"
echo "  ✅ frontend/railway.toml"
echo "  ✅ Dockerfile"
echo "  ✅ src/routes/health.ts"
echo "  ✅ frontend/next.config.js"
echo "  ✅ .env.railway.template"
echo "  ✅ frontend/.env.railway.template"
echo "  ✅ .dockerignore"
echo "  ✅ RAILWAY_DEPLOY.md"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "  1. Revise os arquivos criados"
echo "  2. Adicione o health check route ao seu server.ts:"
echo "     import { healthRoutes } from './routes/health';"
echo "     await fastify.register(healthRoutes);"
echo ""
echo "  3. Gere chaves seguras:"
echo "     node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo ""
echo "  4. Faça o commit:"
echo "     git add ."
echo "     git commit -m \"feat: configuração para deploy no Railway\""
echo "     git push origin main"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  - Verifique se o script 'start:prod' existe no package.json"
echo "  - Não commite arquivos .env com dados sensíveis"
echo ""
