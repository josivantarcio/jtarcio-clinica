#!/bin/bash

# 🚀 Script para inicializar N8N standalone (sem Docker)
# Configurado para suas credenciais: josivantarcio@msn.com | Admin123!

set -e

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 INICIANDO N8N STANDALONE${NC}"
echo "=============================="

# Verificar se node e npm estão disponíveis
echo -e "${BLUE}1. 🔍 Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale Node.js primeiro.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# Verificar PostgreSQL
echo -e "${BLUE}2. 🗄️ Verificando PostgreSQL...${NC}"
if pg_isready -h localhost -p 5433 -U clinic_user -d eo_clinica_db > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL está disponível${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL não está rodando. Tentando iniciar...${NC}"
    # Tentar iniciar postgres se estiver disponível via systemctl
    if command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql || echo "Não foi possível iniciar PostgreSQL automaticamente"
    fi
fi

# Configurar diretório N8N
N8N_DIR="$HOME/.n8n"
echo -e "${BLUE}3. 📁 Configurando diretório N8N: $N8N_DIR${NC}"
mkdir -p "$N8N_DIR"

# Configurar variáveis de ambiente
export N8N_USER_FOLDER="$N8N_DIR"
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=josivantarcio@msn.com
export N8N_BASIC_AUTH_PASSWORD=Admin123!
export N8N_HOST=127.0.0.1
export N8N_PORT=5678
export N8N_PROTOCOL=http
export WEBHOOK_URL=http://localhost:5678/

# Configuração do banco PostgreSQL
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=localhost
export DB_POSTGRESDB_PORT=5433
export DB_POSTGRESDB_DATABASE=eo_clinica_db
export DB_POSTGRESDB_USER=clinic_user
export DB_POSTGRESDB_PASSWORD=clinic_password

# Configurações de execução
export N8N_ENCRYPTION_KEY=eo-clinica-n8n-encryption-key-2024
export EXECUTIONS_DATA_SAVE_ON_ERROR=all
export EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
export GENERIC_TIMEZONE=America/Sao_Paulo

echo -e "${BLUE}4. 🔧 Configurações aplicadas:${NC}"
echo "• Usuário: josivantarcio@msn.com"
echo "• Senha: Admin123!"
echo "• URL: http://localhost:5678"
echo "• Database: eo_clinica_db (localhost:5433)"

# Verificar se n8n está instalado globalmente
echo -e "${BLUE}5. 📦 Verificando instalação N8N...${NC}"
if ! command -v n8n &> /dev/null; then
    echo -e "${YELLOW}⚠️  N8N não está instalado. Instalando via npx...${NC}"
    echo "Isso pode levar alguns minutos na primeira execução..."
fi

# Inicializar N8N
echo -e "${BLUE}6. 🚀 Iniciando N8N...${NC}"
echo -e "${GREEN}✅ Suas credenciais estão configuradas:${NC}"
echo "   Usuário: josivantarcio@msn.com"
echo "   Senha: Admin123!"
echo ""
echo -e "${BLUE}🌐 Acesse: http://localhost:5678${NC}"
echo ""
echo "Pressione Ctrl+C para parar o N8N"
echo ""

# Executar N8N com npx (instala automaticamente se necessário)
npx n8n start
