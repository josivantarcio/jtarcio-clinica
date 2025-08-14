#!/bin/bash

# EO Clínica - Script de Limpeza COMPLETA (Perde Todos os Dados)
# © 2025 Jtarcio Desenvolvimento
# ⚠️  ATENÇÃO: Este script APAGA TODOS OS DADOS do banco PostgreSQL
# ⚠️  Use apenas quando quiser resetar completamente o sistema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

log_warning() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERRO] $1${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCESSO] $1${NC}"
}

# Warning and confirmation
echo -e "${RED}⚠️  ATENÇÃO: LIMPEZA COMPLETA DE DADOS ⚠️${NC}"
echo ""
echo -e "${YELLOW}Este script vai:${NC}"
echo -e "   • Parar todos os containers Docker"
echo -e "   • Remover TODOS os volumes (incluindo dados PostgreSQL)"
echo -e "   • Apagar TODOS os pacientes, consultas e dados médicos"
echo -e "   • Resetar o sistema para estado inicial"
echo ""
echo -e "${RED}TODOS OS DADOS SERÃO PERDIDOS PERMANENTEMENTE!${NC}"
echo ""

read -p "Tem certeza que deseja continuar? Digite 'CONFIRMO' para prosseguir: " confirmation

if [ "$confirmation" != "CONFIRMO" ]; then
    log_info "Operação cancelada pelo usuário"
    exit 0
fi

echo ""
log_warning "Iniciando limpeza completa em 5 segundos..."
sleep 1
echo "4..."
sleep 1
echo "3..."
sleep 1
echo "2..."
sleep 1
echo "1..."
sleep 1

log_info "Iniciando limpeza completa..."

# Stop all Docker containers
log_info "Parando todos os containers..."
docker-compose down --volumes --remove-orphans 2>/dev/null || true

# Remove any remaining EO Clinica containers
project_containers=$(docker ps -a --filter "name=eo-clinica" --format "{{.Names}}" 2>/dev/null || true)
if [ ! -z "$project_containers" ]; then
    log_info "Removendo containers específicos do projeto..."
    echo "$project_containers" | xargs docker stop 2>/dev/null || true
    echo "$project_containers" | xargs docker rm 2>/dev/null || true
fi

# Clean up Docker resources
log_info "Limpando recursos Docker..."
docker network prune -f 2>/dev/null || true
docker container prune -f 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# Remove specific volumes if they exist
log_info "Removendo volumes específicos..."
docker volume rm eo-clinica2_postgres_data 2>/dev/null || true
docker volume rm eo-clinica2_redis_data 2>/dev/null || true
docker volume rm eo-clinica2_chroma_data 2>/dev/null || true
docker volume rm eo-clinica2_n8n_data 2>/dev/null || true
docker volume rm eo-clinica2_pgadmin_data 2>/dev/null || true

# Clean any remaining processes
log_info "Finalizando processos locais..."
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "next.*3001" 2>/dev/null || true
pkill -f "tsx.*src/index" 2>/dev/null || true

log_success "Limpeza completa concluída!"
echo ""
log_info "Para iniciar o sistema novamente:"
log_info "  ./scripts/start-production.sh"
echo ""
log_warning "Lembre-se: Todos os dados foram perdidos e o sistema será reinicializado"