#!/bin/bash

# 🚀 Script para inicializar N8N com SQLite (sem PostgreSQL)
# Configurado para suas credenciais: josivantarcio@msn.com | Admin123!

set -e

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m' 
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 INICIANDO N8N STANDALONE (SQLite)${NC}"
echo "=================================="

# Parar qualquer instância N8N rodando
echo -e "${BLUE}1. 🛑 Parando instâncias N8N anteriores...${NC}"
pkill -f "n8n" || echo "Nenhuma instância N8N encontrada"
sleep 2

# Configurar diretório N8N
N8N_DIR="$HOME/.n8n"
echo -e "${BLUE}2. 📁 Configurando diretório N8N: $N8N_DIR${NC}"
mkdir -p "$N8N_DIR"

# Limpar dados antigos se existirem
if [ -d "$N8N_DIR" ]; then
    echo "Limpando configurações antigas..."
    rm -rf "$N8N_DIR/database.sqlite"
fi

# Configurar variáveis de ambiente para SQLite
export N8N_USER_FOLDER="$N8N_DIR"
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER="josivantarcio@msn.com"
export N8N_BASIC_AUTH_PASSWORD="Admin123!"
export N8N_HOST="0.0.0.0"
export N8N_PORT=5678
export N8N_PROTOCOL=http
export WEBHOOK_URL="http://localhost:5678/"

# Usar SQLite ao invés de PostgreSQL
export DB_TYPE=sqlite
export DB_SQLITE_DATABASE="$N8N_DIR/database.sqlite"

# Configurações de execução
export N8N_ENCRYPTION_KEY="eo-clinica-n8n-encryption-key-2024"
export EXECUTIONS_DATA_SAVE_ON_ERROR=all
export EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
export GENERIC_TIMEZONE="America/Sao_Paulo"
export N8N_DEFAULT_LOCALE="pt"

# Desabilitar telemetria para teste local
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_VERSION_NOTIFICATIONS_ENABLED=false
export N8N_TEMPLATES_ENABLED=false

echo -e "${BLUE}3. 🔧 Configurações aplicadas:${NC}"
echo "• Usuário: josivantarcio@msn.com"
echo "• Senha: Admin123!"
echo "• URL: http://localhost:5678"
echo "• Database: SQLite ($N8N_DIR/database.sqlite)"

# Inicializar N8N
echo -e "${BLUE}4. 🚀 Iniciando N8N...${NC}"
echo -e "${GREEN}✅ Suas credenciais estão configuradas:${NC}"
echo "   Usuário: josivantarcio@msn.com"
echo "   Senha: Admin123!"
echo ""
echo -e "${BLUE}🌐 Acesse: http://localhost:5678${NC}"
echo ""
echo "Aguarde alguns segundos para o N8N inicializar..."
echo "Pressione Ctrl+C para parar o N8N"
echo ""

# Executar N8N com npx (instala automaticamente se necessário)
npx n8n start --tunnel