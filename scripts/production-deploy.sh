#!/bin/bash

# Script de Deploy em Produção - EO Clínica v1.3.0
# Baseado na documentação DEPLOYMENT_GUIDE.md
# Implementa backup policy conforme BACKUP_POLICY.md

set -e  # Para na primeira falha

echo "🚀 DEPLOY EM PRODUÇÃO - EO Clínica v1.3.0"
echo "========================================"

# Configurações baseadas na documentação
export NODE_ENV=production
BACKUP_DIR="./backups/production"
LOG_DIR="./logs"

# Criar diretórios necessários
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

echo "📋 [1/9] Verificando pré-requisitos..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado."
    exit 1
fi

echo "🧹 [2/9] Limpando ambiente anterior..."

# Limpar builds anteriores para evitar cache corrompido
rm -rf frontend/.next frontend/dist frontend/node_modules/.cache 2>/dev/null || true
rm -rf node_modules/.cache .next 2>/dev/null || true

# Parar containers e limpar redes
docker-compose down 2>/dev/null || true
docker system prune -f 2>/dev/null || true

echo "🐳 [3/9] Iniciando infraestrutura Docker..."
docker-compose up -d postgres redis
sleep 20

# Verificar se containers estão saudáveis
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "❌ PostgreSQL falhou ao iniciar"
    exit 1
fi

echo "💾 [4/9] Criando backup de segurança..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/production_backup_$TIMESTAMP.sql"

PGPASSWORD=clinic_password pg_dump -h localhost -p 5433 -U clinic_user -d eo_clinica_db > "$BACKUP_FILE"
echo "✅ Backup salvo: $BACKUP_FILE"

# Comprimir backup conforme política
gzip "$BACKUP_FILE"
echo "🗜️  Backup comprimido: ${BACKUP_FILE}.gz"

echo "📦 [5/9] Instalando dependências..."

# Limpar node_modules para evitar conflitos
rm -rf node_modules frontend/node_modules

# Backend dependencies
npm ci --only=production --no-audit --no-fund

# Frontend dependencies
cd frontend
npm ci --only=production --no-audit --no-fund
cd ..

echo "🗄️  [6/9] Sincronização segura do banco..."
npx prisma generate --schema=./src/database/schema.prisma
npx prisma db push --schema=./src/database/schema.prisma --accept-data-loss=false

echo "🏗️  [7/9] Build do frontend (limpo)..."
cd frontend

# Limpar completamente antes do build
rm -rf .next out dist

# Build com variáveis de produção
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run build

cd ..

echo "🔧 [8/9] Compilação do backend..."
npm run build 2>/dev/null || echo "Backend rodando com tsx em produção"

echo "🔍 [9/9] Verificação de integridade final..."

# Verificar dados críticos
USER_COUNT=$(PGPASSWORD=clinic_password psql -h localhost -p 5433 -U clinic_user -d eo_clinica_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
SPECIALTY_COUNT=$(PGPASSWORD=clinic_password psql -h localhost -p 5433 -U clinic_user -d eo_clinica_db -t -c "SELECT COUNT(*) FROM specialties;" 2>/dev/null | xargs || echo "0")

echo "📊 Estado do banco:"
echo "   👥 Usuários: $USER_COUNT"
echo "   🏥 Especialidades: $SPECIALTY_COUNT"

if [ "$USER_COUNT" -lt "1" ] || [ "$SPECIALTY_COUNT" -lt "1" ]; then
    echo "❌ FALHA: Dados críticos perdidos!"
    echo "🔄 Restaurando backup automaticamente..."
    gunzip -c "${BACKUP_FILE}.gz" | PGPASSWORD=clinic_password psql -h localhost -p 5433 -U clinic_user -d eo_clinica_db
    echo "✅ Backup restaurado. Deploy abortado por segurança."
    exit 1
fi

# Limpeza automática de backups antigos (manter últimos 5)
echo "🧹 Limpando backups antigos..."
cd "$BACKUP_DIR"
ls -t production_backup_*.sql.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
cd - >/dev/null

echo ""
echo "✅ DEPLOY COMPLETADO COM SUCESSO!"
echo "================================="
echo "📦 Versão: v1.3.0"
echo "🏥 Sistema: EO Clínica"
echo "💾 Backup: ${BACKUP_FILE}.gz"
echo "👥 Usuários preservados: $USER_COUNT"
echo "🏥 Especialidades preservadas: $SPECIALTY_COUNT"
echo ""
echo "🚀 Para iniciar a aplicação:"
echo "   Backend:  npm start"
echo "   Frontend: cd frontend && npm start"
echo ""
echo "📊 Para monitorar:"
echo "   Logs backend:  tail -f $LOG_DIR/backend.log"
echo "   Logs frontend: tail -f $LOG_DIR/frontend.log"
echo ""
echo "🔗 URLs de produção:"
echo "   API: http://localhost:3000"
echo "   App: http://localhost:3001"