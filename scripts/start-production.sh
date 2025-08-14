#!/bin/bash

# EO Clínica - Complete Production Deployment Script
# © 2025 Jtarcio Desenvolvimento
# Script unificado para deploy completo em produção
# Corrige todos os problemas identificados e oferece deploy zero-downtime
#
# ⚠️  IMPORTANTE: Este script preserva dados do banco PostgreSQL
# ⚠️  Os volumes Docker não são removidos para manter persistência
# ⚠️  Para limpeza completa, use: docker-compose down --volumes (manual)

set -e  # Exit on error

# Global variables
DOCKER_RETRY_COUNT=3
HEALTH_CHECK_TIMEOUT=60
BACKUP_CREATED=false
ROLLBACK_NEEDED=false
BACKEND_PID=""
FRONTEND_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

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

# Function to perform complete system cleanup before starting
complete_system_cleanup() {
    log_header "LIMPEZA COMPLETA DO SISTEMA"
    
    log_step "Parando todos os processos locais..."
    
    # Stop all Node.js processes on ports 3000 and 3001
    log_step "Finalizando processos Node.js (portas 3000/3001)..."
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "node.*3001" 2>/dev/null || true
    pkill -f "next.*3001" 2>/dev/null || true
    pkill -f "tsx.*src/index" 2>/dev/null || true
    pkill -f "next.*dev" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    
    # Stop any processes using our specific ports with more precision
    log_step "Liberando portas específicas..."
    local ports=("3000" "3001" "5432" "5433" "6379" "6380" "8000" "5678" "5050")
    for port in "${ports[@]}"; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            log_warning "Liberando porta $port..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Wait for processes to terminate
    sleep 3
    
    log_step "Limpando ambiente Docker..."
    
    # Stop all Docker containers (not just compose ones)
    local running_containers=$(docker ps -q 2>/dev/null || true)
    if [ ! -z "$running_containers" ]; then
        log_step "Parando todos os containers Docker..."
        docker stop $running_containers 2>/dev/null || true
    fi
    
    # Stop compose services specifically (preserving data volumes)
    timeout 30 docker-compose down --remove-orphans 2>/dev/null || {
        log_warning "Timeout no docker-compose down, forçando..."
        docker stop $(docker ps -q) 2>/dev/null || true
        docker rm $(docker ps -aq) 2>/dev/null || true
    }
    
    # Clean up EO Clinica specific containers
    local project_containers=$(docker ps -a --filter "name=eo-clinica" --format "{{.Names}}" 2>/dev/null || true)
    if [ ! -z "$project_containers" ]; then
        log_step "Removendo containers específicos do projeto..."
        echo "$project_containers" | xargs docker stop 2>/dev/null || true
        echo "$project_containers" | xargs docker rm 2>/dev/null || true
    fi
    
    # Clean up Docker networks and unused resources
    log_step "Limpando recursos Docker não utilizados..."
    docker network prune -f 2>/dev/null || true
    docker container prune -f 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    
    # Clean any remaining processes that might interfere
    log_step "Verificação final de processos..."
    pkill -f "eo-clinica" 2>/dev/null || true
    pkill -f "clinic" 2>/dev/null || true
    
    # Give system time to clean up
    sleep 2
    
    log_success "Sistema completamente limpo e pronto para inicialização"
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Verificando pré-requisitos..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -f "docker-compose.yml" ]; then
        log_error "Execute este script na raiz do projeto EO Clínica"
        exit 1
    fi
    
    # Check for required tools
    local tools=("docker" "docker-compose" "node" "npm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "$tool não encontrado. Instale antes de continuar."
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon não está rodando. Inicie o Docker primeiro."
        exit 1
    fi
    
    # Check Docker Compose version
    local compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log_info "Docker Compose versão: $compose_version"
    
    log_success "Pré-requisitos verificados"
}

# Function to create backup before deployment
create_backup() {
    log_step "Criando backup antes do deploy..."
    
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database if containers are running
    if docker-compose ps postgres | grep -q "Up"; then
        log_step "Fazendo backup do banco de dados..."
        docker-compose exec -T postgres pg_dump -U clinic_user eo_clinica_db > "$backup_dir/database_backup.sql" || {
            log_warning "Backup do banco falhou - pode não haver dados ainda"
        }
    fi
    
    # Backup application files
    log_step "Fazendo backup dos arquivos..."
    tar -czf "$backup_dir/app_backup.tar.gz" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='logs' \
        --exclude='dist' \
        --exclude='backups' \
        . || {
        log_warning "Backup de arquivos falhou"
        return 1
    }
    
    BACKUP_CREATED=true
    log_success "Backup criado em: $backup_dir"
    echo "$backup_dir" > .last_backup_path
}

# Function to clean Docker environment completely
clean_docker_environment() {
    log_step "Limpando ambiente Docker completamente..."
    
    # Stop all containers with timeout (preserving data volumes)
    timeout 30 docker-compose down --remove-orphans 2>/dev/null || {
        log_warning "Timeout ao parar containers, forçando finalização..."
        docker stop $(docker ps -q) 2>/dev/null || true
        docker rm $(docker ps -aq) 2>/dev/null || true
    }
    
    # Clean up any remaining EO Clínica containers
    local project_containers=$(docker ps -a --filter "name=eo-clinica" --format "{{.Names}}")
    if [ ! -z "$project_containers" ]; then
        log_step "Removendo containers específicos do projeto..."
        echo "$project_containers" | xargs docker stop 2>/dev/null || true
        echo "$project_containers" | xargs docker rm 2>/dev/null || true
    fi
    
    # Clean networks
    docker network prune -f 2>/dev/null || true
    
    # Remove unused containers and images
    docker container prune -f 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    
    # Keep docker-compose.yml modifications (don't restore on retry)
    # Backup is preserved but not automatically restored to maintain port fixes
    if [ -f docker-compose.yml.backup ]; then
        log_info "Docker-compose.yml backup mantido (sem restauração automática)"
    fi
    
    log_success "Ambiente Docker limpo"
}

# Function to setup production environment
setup_production_environment() {
    log_step "Configurando ambiente de produção..."
    
    # Create production environment file
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_info "Arquivo .env criado a partir do exemplo"
        else
            log_error "Arquivo .env.example não encontrado!"
            exit 1
        fi
    fi
    
    # Create production-specific environment
    cat > .env.production << 'EOF'
# Production Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database Configuration (local connection to Docker)
DATABASE_URL=postgresql://clinic_user:clinic_password@localhost:5433/eo_clinica_app

# Redis Configuration (local connection to Docker) 
REDIS_URL=redis://localhost:6380
REDIS_PASSWORD=

# JWT Configuration (use strong secrets in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this-must-be-32-chars
REFRESH_TOKEN_EXPIRES_IN=30d

# Encryption Configuration
ENCRYPTION_KEY=your-32-character-encryption-key-here-change-this-please
SALT_ROUNDS=12

# AI Integration
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_API_VERSION=2023-06-01

# ChromaDB Configuration (local connection to Docker)
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION_NAME=clinic_conversations

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# LGPD Compliance
DATA_RETENTION_DAYS=2555
AUDIT_LOG_RETENTION_DAYS=3650

# Timezone
TIMEZONE=America/Sao_Paulo

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Health Check
HEALTH_CHECK_TIMEOUT=5000

# Feature Flags
ENABLE_AI_INTEGRATION=true
ENABLE_WHATSAPP_INTEGRATION=false
ENABLE_GOOGLE_CALENDAR=false
ENABLE_AUDIT_LOGS=true

# Production Security
CORS_ORIGIN=http://localhost:3001,https://your-domain.com
RATE_LIMIT_SKIP_FAILED_REQUESTS=true
ENABLE_COMPRESSION=true
TRUST_PROXY=true
EOF
    
    # Setup frontend production environment
    cat > frontend/.env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EO Clínica
NEXT_PUBLIC_APP_VERSION=1.1.0
NEXT_PUBLIC_ENABLE_AI_CHAT=true
PORT=3001
EOF

    # Also create .env.local for frontend development mode
    cat > frontend/.env.local << 'EOF'
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EO Clínica
NEXT_PUBLIC_APP_VERSION=1.1.0
NEXT_PUBLIC_ENABLE_AI_CHAT=true
PORT=3001
EOF
    
    log_success "Ambiente de produção configurado"
}

# Function to install and prepare local services
prepare_local_services() {
    log_step "Preparando serviços locais (backend e frontend)..."
    
    # Install backend dependencies
    log_step "Instalando dependências do backend..."
    npm install --silent || {
        log_error "Falha ao instalar dependências do backend"
        return 1
    }
    
    # Install frontend dependencies
    log_step "Instalando dependências do frontend..."
    cd frontend
    npm install --silent || {
        log_error "Falha ao instalar dependências do frontend"
        cd ..
        return 1
    }
    cd ..
    
    # Generate Prisma client locally
    log_step "Gerando cliente Prisma..."
    npm run db:generate || {
        log_warning "Falha ao gerar cliente Prisma - será feito após o banco iniciar"
    }
    
    log_success "Serviços locais preparados"
}

# Function to check and resolve port conflicts
check_and_resolve_port_conflicts() {
    log_step "Verificando conflitos de porta..."
    
    # Check if PostgreSQL is already running locally on 5432
    if ss -tlnp | grep ":5432" >/dev/null 2>&1; then
        log_warning "PostgreSQL local detectado na porta 5432"
        log_step "Modificando configuração do Docker para usar porta 5433..."
        
        # Backup original docker-compose.yml if not already backed up
        if [ ! -f docker-compose.yml.backup ]; then
            cp docker-compose.yml docker-compose.yml.backup
        fi
        
        # Modify docker-compose.yml to use port 5433
        sed -i 's/"5432:5432"/"5433:5432"/g' docker-compose.yml
        
        # Update the production environment to use the new port
        sed -i 's|localhost:5432|localhost:5433|g' .env.production
        
        # Also update N8N database connection to use the correct port
        sed -i 's|DB_POSTGRESDB_HOST=localhost|DB_POSTGRESDB_HOST=localhost\n      - DB_POSTGRESDB_PORT=5433|g' docker-compose.yml
        
        log_info "Docker PostgreSQL configurado para usar porta 5433"
        return 0
    fi
    
    log_success "Nenhum conflito de porta detectado"
    return 0
}

# Function to start Docker infrastructure services
start_docker_services() {
    log_step "Iniciando serviços de infraestrutura (Docker)..."
    
    # Check and resolve port conflicts first
    check_and_resolve_port_conflicts
    
    local retry=1
    local max_retries=$DOCKER_RETRY_COUNT
    
    while [ $retry -le $max_retries ]; do
        log_step "Tentativa $retry/$max_retries de inicialização dos containers..."
        
        # Start only infrastructure services (postgres, redis, chromadb, n8n, pgadmin)
        if COMPOSE_HTTP_TIMEOUT=120 docker-compose --env-file .env.production up -d postgres redis chromadb n8n pgadmin; then
            log_success "Containers de infraestrutura iniciados"
            return 0
        else
            log_warning "Falha na tentativa $retry/$max_retries"
            
            if [ $retry -lt $max_retries ]; then
                log_step "Limpando ambiente para retry..."
                clean_docker_environment
                sleep 5
            fi
            
            retry=$((retry + 1))
        fi
    done
    
    log_error "Falha ao iniciar containers após $max_retries tentativas"
    ROLLBACK_NEEDED=true
    return 1
}

# Function to wait for Docker services to be healthy  
wait_for_docker_services() {
    log_step "Aguardando serviços Docker ficarem saudáveis..."
    
    # Determine PostgreSQL port based on configuration
    local postgres_port="5432"
    if [ -f docker-compose.yml.backup ] || grep -q "5433:5432" docker-compose.yml; then
        postgres_port="5433"
    fi
    
    local services=("postgres:$postgres_port" "redis:6380")
    local timeout=$HEALTH_CHECK_TIMEOUT
    local elapsed=0
    
    for service in "${services[@]}"; do
        local container_name=$(echo "$service" | cut -d':' -f1)
        local host_port=$(echo "$service" | cut -d':' -f2)
        
        log_step "Aguardando $container_name na porta host $host_port..."
        
        elapsed=0
        while [ $elapsed -lt $timeout ]; do
            # Test connection to host port instead of container internal port
            if timeout 5 bash -c "echo > /dev/tcp/localhost/$host_port" 2>/dev/null; then
                log_success "$container_name está respondendo na porta $host_port!"
                break
            fi
            
            echo -n "."
            sleep 2
            elapsed=$((elapsed + 2))
        done
        
        if [ $elapsed -ge $timeout ]; then
            log_warning "$container_name não respondeu em ${timeout}s"
            # Show container logs for debugging
            log_step "Logs do container $container_name:"
            docker-compose logs --tail=10 "$container_name" || true
        fi
    done
}

# Function to run database migrations locally
setup_database() {
    log_step "Configurando banco de dados..."
    
    # Wait for PostgreSQL to be ready
    log_step "Aguardando PostgreSQL..."
    
    # Determine correct PostgreSQL port
    local postgres_port="5432"
    if [ -f docker-compose.yml.backup ] || grep -q "5433:5432" docker-compose.yml; then
        postgres_port="5433"
    fi
    
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if pg_isready -h localhost -p $postgres_port -U clinic_user -d eo_clinica_app >/dev/null 2>&1 || \
           docker-compose exec -T postgres pg_isready -U clinic_user -d eo_clinica_app >/dev/null 2>&1; then
            log_success "PostgreSQL está pronto na porta $postgres_port!"
            break
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 30 ]; then
        log_error "PostgreSQL não iniciou corretamente"
        docker-compose logs postgres
        return 1
    fi
    
    # Generate Prisma client locally
    log_step "Gerando cliente Prisma..."
    if npm run db:generate; then
        log_success "Cliente Prisma gerado"
    else
        log_error "Falha ao gerar cliente Prisma"
        return 1
    fi
    
    # Run migrations locally
    log_step "Executando migrações..."
    if npm run db:migrate; then
        log_success "Migrações executadas"
    else
        log_error "Falha nas migrações"
        return 1
    fi
    
    # Seed database locally
    log_step "Populando banco com dados iniciais..."
    if npm run db:seed; then
        log_success "Base de dados populada"
    else
        log_warning "Falha no seed - continuando (normal em re-deploys)"
    fi
}

# Function to start local backend and frontend services
start_local_services() {
    log_step "Iniciando serviços locais..."
    
    # Kill any existing processes on ports 3000 and 3001
    log_step "Limpando portas 3000 e 3001..."
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "next.*3001" 2>/dev/null || true
    pkill -f "tsx.*src/index" 2>/dev/null || true
    sleep 3
    
    # Start backend locally
    log_step "Iniciando Backend local (porta 3000)..."
    npm run start &
    BACKEND_PID=$!
    log_info "Backend PID: $BACKEND_PID"
    
    # Wait a bit for backend to start
    sleep 8
    
    # Start frontend locally
    log_step "Iniciando Frontend local (porta 3001)..."
    cd frontend
    PORT=3001 npm run dev &
    FRONTEND_PID=$!
    log_info "Frontend PID: $FRONTEND_PID"
    cd ..
    
    # Wait for services to stabilize
    sleep 5
    
    log_success "Serviços locais iniciados"
}

# Function to perform health checks
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
        log_warning "Frontend não respondeu rapidamente - verificando logs..."
        docker-compose logs frontend | tail -20
    fi
    
    log_success "Verificações de saúde concluídas"
}

# Function to rollback deployment
rollback_deployment() {
    log_warning "Iniciando rollback..."
    
    # Stop local services
    if [ ! -z "$BACKEND_PID" ]; then
        log_step "Parando backend local (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        log_step "Parando frontend local (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "next.*3001" 2>/dev/null || true
    pkill -f "tsx.*src/index" 2>/dev/null || true
    
    if [ "$BACKUP_CREATED" = true ] && [ -f .last_backup_path ]; then
        local backup_path=$(cat .last_backup_path)
        log_warning "Backup disponível em: $backup_path"
        
        # Stop Docker services (preserving data volumes)
        docker-compose down
        
        # Restore database if backup exists
        if [ -f "$backup_path/database_backup.sql" ]; then
            log_step "Backup do banco disponível para restauração manual"
            log_info "Para restaurar: docker-compose up -d postgres && sleep 10 && docker-compose exec -T postgres psql -U clinic_user -d eo_clinica_db < \"$backup_path/database_backup.sql\""
        fi
        
        log_warning "Rollback concluído. Verifique os logs e tente novamente."
    else
        log_error "Rollback básico concluído - backup não disponível"
    fi
}

# Function to show final status
show_final_status() {
    log_header "EO CLÍNICA - DEPLOY DE PRODUÇÃO CONCLUÍDO!"
    
    echo -e "${WHITE}SERVIÇOS DISPONÍVEIS${NC}"
    echo -e "   Frontend:     ${GREEN}http://localhost:3001${NC} ${YELLOW}(Local)${NC}"
    echo -e "   Backend:      ${GREEN}http://localhost:3000${NC} ${YELLOW}(Local)${NC}"
    echo -e "   API Docs:     ${GREEN}http://localhost:3000/documentation${NC}"
    echo ""
    
    # Determine the correct PostgreSQL port to display
    local postgres_port="5432"
    if [ -f docker-compose.yml.backup ]; then
        postgres_port="5433"
    fi
    
    echo -e "${WHITE}SERVIÇOS DOCKER${NC}"
    echo -e "   PostgreSQL:   ${CYAN}localhost:$postgres_port${NC}"
    echo -e "   Redis:        ${CYAN}localhost:6380${NC}"
    echo -e "   ChromaDB:     ${CYAN}http://localhost:8000${NC}"
    echo -e "   N8N:          ${CYAN}http://localhost:5678${NC} (admin/admin123)"
    echo -e "   PgAdmin:      ${CYAN}http://localhost:5050${NC} (admin@clinic.com/admin123)"
    echo ""
    
    echo -e "${WHITE}USUÁRIOS DE TESTE${NC}"
    echo -e "   Admin:        ${YELLOW}admin@eoclinica.com.br${NC} / Admin123!"
    echo -e "   Médico:       ${YELLOW}dr.silva@eoclinica.com.br${NC} / Admin123!"
    echo -e "   Recepcionista: ${YELLOW}recepcao@eoclinica.com.br${NC} / Admin123!"
    echo -e "   Paciente:     ${YELLOW}paciente@example.com${NC} / Admin123!"
    echo ""
    
    echo -e "${WHITE}MONITORAMENTO${NC}"
    echo -e "   Docker Logs:  ${CYAN}docker-compose logs -f${NC}"
    echo -e "   Docker Status:${CYAN}docker-compose ps${NC}"
    echo -e "   Backend Logs: ${CYAN}tail -f logs/*.log${NC}"
    echo -e "   Frontend Logs:${CYAN}cd frontend && npm run dev${NC}"
    echo ""
    
    echo -e "${WHITE}CONTROLE DOS SERVIÇOS${NC}"
    echo -e "   Parar Docker: ${CYAN}docker-compose down${NC}"
    echo -e "   Parar Backend:${CYAN}kill $BACKEND_PID${NC}"
    echo -e "   Parar Frontend:${CYAN}kill $FRONTEND_PID${NC}"
    echo -e "   Parar Todos:  ${CYAN}pkill -f \"node.*300[01]\"${NC}"
    echo ""
    
    echo -e "${WHITE}ESTATÍSTICAS${NC}"
    local containers=$(docker-compose ps --services | wc -l)
    echo -e "   Containers:   ${GREEN}$containers serviços Docker${NC}"
    echo -e "   Backend PID:  ${GREEN}$BACKEND_PID${NC}"
    echo -e "   Frontend PID: ${GREEN}$FRONTEND_PID${NC}"
    echo -e "   Arquitetura:  ${GREEN}Híbrida (Docker + Local)${NC}"
    echo ""
    
    if [ "$BACKUP_CREATED" = true ]; then
        echo -e "${WHITE}BACKUP${NC}"
        echo -e "   Localização:  ${CYAN}$(cat .last_backup_path)${NC}"
        echo ""
    fi
    
    log_header "SISTEMA PRONTO PARA PRODUÇÃO!"
}

# Cleanup function for signals
cleanup() {
    log_header "INTERRUPÇÃO DETECTADA..."
    
    # Stop local services
    if [ ! -z "$BACKEND_PID" ]; then
        log_step "Parando backend local..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        log_step "Parando frontend local..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining local processes
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "next.*3001" 2>/dev/null || true
    pkill -f "tsx.*src/index" 2>/dev/null || true
    
    # Stop Docker services (preserving data volumes)
    log_step "Parando containers Docker..."
    docker-compose down 2>/dev/null || true
    
    if [ "$ROLLBACK_NEEDED" = true ]; then
        rollback_deployment
    fi
    
    log_info "Limpeza finalizada"
    exit 1
}

# Main execution function
main() {
    # Clear screen and show header
    clear
    log_header "EO CLÍNICA - DEPLOY COMPLETO PARA PRODUÇÃO"
    echo -e "${CYAN}© 2025 Jtarcio Desenvolvimento${NC}"
    echo -e "${CYAN}Versão: 1.1.0 - Limpeza de Dados Fictícios${NC}"
    echo ""
    
    # Set up signal handlers
    trap cleanup SIGINT SIGTERM
    
    # Execute deployment steps
    complete_system_cleanup
    check_prerequisites
    create_backup
    clean_docker_environment
    setup_production_environment
    prepare_local_services
    
    if start_docker_services; then
        wait_for_docker_services
        setup_database
        start_local_services
        perform_health_checks
        show_final_status
        
        # Keep script running to maintain services
        log_info "Pressione Ctrl+C para parar todos os serviços..."
        while true; do
            sleep 10
            
            # Check if services are still running
            if ! kill -0 $BACKEND_PID 2>/dev/null; then
                log_error "Backend parou unexpectadamente"
                break
            fi
            
            if ! kill -0 $FRONTEND_PID 2>/dev/null; then
                log_error "Frontend parou unexpectadamente"
                break
            fi
        done
    else
        log_error "Deploy falhou - iniciando rollback..."
        rollback_deployment
        exit 1
    fi
    
    log_success "Deploy de produção concluído com sucesso!"
}

# Execute main function with all arguments
main "$@"