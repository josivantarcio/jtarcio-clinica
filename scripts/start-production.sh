#!/bin/bash

# EO Clínica - Fixed Production Deployment Script
# © 2025 Jtarcio Desenvolvimento
# Script corrigido e simplificado para deploy em produção

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Global variables
BACKEND_PID=""
FRONTEND_PID=""

# Logging functions
log_info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

log_header() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_step() {
    echo -e "${BLUE}[PROCESSING] $1${NC}"
}

# Cleanup function
cleanup_system() {
    log_header "LIMPEZA COMPLETA DO SISTEMA"
    
    log_step "Parando todos os processos locais..."
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "node.*3001" 2>/dev/null || true
    pkill -f "next.*3001" 2>/dev/null || true
    pkill -f "tsx.*src/index" 2>/dev/null || true
    pkill -f "next.*dev" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    
    log_step "Liberando portas específicas..."
    local ports=("3000" "3001")
    for port in "${ports[@]}"; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            log_warning "Liberando porta $port..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
    
    sleep 3
    
    log_step "Limpando ambiente Docker..."
    docker-compose down --remove-orphans 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    docker container prune -f 2>/dev/null || true
    
    log_success "Sistema completamente limpo e pronto para inicialização"
}

# Check prerequisites
check_prerequisites() {
    log_step "Verificando pré-requisitos..."
    
    if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -f "docker-compose.yml" ]; then
        log_error "Execute este script na raiz do projeto EO Clínica"
        exit 1
    fi
    
    # Check required tools
    local tools=("docker" "docker-compose" "node" "npm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "$tool não encontrado. Instale antes de continuar."
            exit 1
        fi
    done
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon não está rodando. Inicie o Docker primeiro."
        exit 1
    fi
    
    local compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log_info "Docker Compose versão: $compose_version"
    
    log_success "Pré-requisitos verificados"
}

# Create backup
create_backup() {
    log_step "Criando backup antes do deploy..."
    
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    log_step "Fazendo backup dos arquivos..."
    tar -czf "$backup_dir/app_backup.tar.gz" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='logs' \
        --exclude='dist' \
        --exclude='backups' \
        --exclude='.next' \
        --exclude='frontend/.next' \
        --exclude='frontend/node_modules' \
        --exclude='*.log' \
        --exclude='cookies.txt' \
        --exclude='erros' \
        --warning=no-file-changed \
        . || {
        log_warning "Backup de arquivos falhou"
    }
    
    log_success "Backup criado em: $backup_dir"
}

# Setup production environment
setup_production_environment() {
    log_step "Configurando ambiente de produção..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_info "Arquivo .env criado a partir do exemplo"
        else
            log_error "Arquivo .env.example não encontrado!"
            exit 1
        fi
    fi
    
    log_success "Ambiente de produção configurado"
}

# Install dependencies
prepare_services() {
    log_step "Preparando serviços locais (backend e frontend)..."
    
    log_step "Instalando dependências do backend..."
    npm install --silent || {
        log_error "Falha ao instalar dependências do backend"
        exit 1
    }
    
    log_step "Instalando dependências do frontend..."
    cd frontend
    npm install --silent || {
        log_error "Falha ao instalar dependências do frontend"
        cd ..
        exit 1
    }
    cd ..
    
    log_step "Gerando cliente Prisma..."
    npm run db:generate || {
        log_warning "Falha ao gerar cliente Prisma - será feito após o banco iniciar"
    }
    
    log_success "Serviços locais preparados"
}

# Start Docker services
start_docker_services() {
    log_step "Iniciando serviços Docker..."
    
    # Start essential services only
    docker-compose up -d postgres redis chromadb clickhouse n8n waha || {
        log_error "Falha ao iniciar serviços Docker"
        exit 1
    }
    
    # Wait for PostgreSQL
    log_step "Aguardando PostgreSQL..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if docker-compose exec -T postgres pg_isready -U clinic_user -d eo_clinica_db >/dev/null 2>&1; then
            log_success "PostgreSQL está pronto!"
            break
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 30 ]; then
        log_error "PostgreSQL não iniciou corretamente"
        docker-compose logs postgres
        exit 1
    fi
    
    # Wait for Redis
    log_step "Aguardando Redis..."
    sleep 5
    
    log_success "Serviços Docker iniciados"
}

# Setup database
setup_database() {
    log_step "Configurando banco de dados..."
    
    # Generate Prisma client
    log_step "Gerando cliente Prisma..."
    if npm run db:generate; then
        log_success "Cliente Prisma gerado"
    else
        log_error "Falha ao gerar cliente Prisma"
        exit 1
    fi
    
    # Push schema to database with force reset
    log_step "Sincronizando schema do banco..."
    if npx prisma db push --force-reset --accept-data-loss; then
        log_success "Schema sincronizado"
    else
        log_error "Falha ao sincronizar schema"
        exit 1
    fi
    
    log_success "Banco de dados configurado"
}

# Start local services
start_local_services() {
    log_step "Iniciando serviços locais..."
    
    # Create logs directory
    mkdir -p logs
    
    # Start Backend
    log_step "Iniciando Backend local (porta 3000)..."
    PORT=3000 npx tsx src/index.ts > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    log_info "Backend PID: $BACKEND_PID"
    
    # Wait for backend
    sleep 8
    
    # Start Frontend  
    log_step "Iniciando Frontend local (porta 3001)..."
    cd frontend
    PORT=3001 npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    log_info "Frontend PID: $FRONTEND_PID"
    cd ..
    
    log_success "Serviços locais iniciados"
}

# Health checks
perform_health_checks() {
    log_step "Executando verificações de saúde..."
    
    # Check backend health
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s -f http://localhost:3000/health >/dev/null 2>&1; then
            log_success "Backend está saudável!"
            break
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 30 ]; then
        log_error "Backend não passou no health check"
        return 1
    fi
    
    # Check frontend
    attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s -f http://localhost:3001 >/dev/null 2>&1; then
            log_success "Frontend está respondendo!"
            break
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 30 ]; then
        log_warning "Frontend não respondeu rapidamente"
    fi
    
    log_success "Verificações de saúde concluídas"
}

# Show final status
show_final_status() {
    log_header "EO CLÍNICA - DEPLOY DE PRODUÇÃO CONCLUÍDO!"
    
    echo -e "${WHITE}SERVIÇOS DISPONÍVEIS${NC}"
    echo -e "   Frontend:     ${GREEN}http://localhost:3001${NC} ${YELLOW}(Local)${NC}"
    echo -e "   Backend:      ${GREEN}http://localhost:3000${NC} ${YELLOW}(Local)${NC}"
    echo -e "   API Docs:     ${GREEN}http://localhost:3000/documentation${NC}"
    echo ""
    
    echo -e "${WHITE}SERVIÇOS DOCKER${NC}"
    echo -e "   PostgreSQL:   ${CYAN}localhost:5433${NC}"
    echo -e "   Redis:        ${CYAN}localhost:6380${NC}"
    echo -e "   ChromaDB:     ${CYAN}http://localhost:8000${NC}"
    echo -e "   N8N:          ${CYAN}http://localhost:5678${NC}"
    echo ""
    
    echo -e "${WHITE}CONTROLE DOS SERVIÇOS${NC}"
    echo -e "   Parar Backend:${CYAN}kill $BACKEND_PID${NC}"
    echo -e "   Parar Frontend:${CYAN}kill $FRONTEND_PID${NC}"
    echo -e "   Parar Docker: ${CYAN}docker-compose down${NC}"
    echo ""
    
    log_header "SISTEMA PRONTO PARA PRODUÇÃO!"
}

# Cleanup on exit
cleanup() {
    log_header "INTERRUPÇÃO DETECTADA..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        log_step "Parando backend local..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        log_step "Parando frontend local..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "next.*3001" 2>/dev/null || true
    pkill -f "tsx.*src/index" 2>/dev/null || true
    
    log_step "Parando containers Docker..."
    docker-compose down 2>/dev/null || true
    
    log_info "Limpeza finalizada"
    exit 1
}

# Main function
main() {
    clear
    log_header "EO CLÍNICA - DEPLOY COMPLETO PARA PRODUÇÃO"
    echo -e "${CYAN}© 2025 Jtarcio Desenvolvimento${NC}"
    echo -e "${CYAN}Versão: 1.1.0 - Limpeza de Dados Fictícios${NC}"
    echo ""
    
    trap cleanup SIGINT SIGTERM
    
    # Execute deployment steps
    cleanup_system
    check_prerequisites
    create_backup
    setup_production_environment
    prepare_services
    start_docker_services
    setup_database
    start_local_services
    perform_health_checks
    show_final_status
    
    # Keep script running
    log_info "Pressione Ctrl+C para parar todos os serviços..."
    while true; do
        sleep 10
        
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            log_error "Backend parou unexpectadamente"
            break
        fi
        
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            log_error "Frontend parou unexpectadamente"  
            break
        fi
    done
    
    log_success "Deploy de produção concluído com sucesso!"
}

# Execute main function
main "$@"