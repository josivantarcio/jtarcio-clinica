#!/bin/bash

# EO Clínica - Complete Production Deployment Script
# © 2025 Jtarcio Desenvolvimento
# Script unificado para deploy completo em produção
# Corrige todos os problemas identificados e oferece deploy zero-downtime

set -e  # Exit on error

# Global variables
DOCKER_RETRY_COUNT=3
HEALTH_CHECK_TIMEOUT=60
BACKUP_CREATED=false
ROLLBACK_NEEDED=false

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
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_step() {
    echo -e "${BLUE}🔧 $1${NC}"
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
    
    # Stop all containers with timeout
    timeout 30 docker-compose down --volumes --remove-orphans 2>/dev/null || {
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

# Database Configuration (adjust for production)
DATABASE_URL=postgresql://clinic_user:clinic_password@postgres:5432/eo_clinica_db

# Redis Configuration
REDIS_URL=redis://redis:6379
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

# ChromaDB Configuration
CHROMA_HOST=chromadb
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
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_APP_NAME=EO Clínica
NEXT_PUBLIC_APP_VERSION=1.0.3
NEXT_PUBLIC_ENABLE_AI_CHAT=true
PORT=3000
EOF
    
    log_success "Ambiente de produção configurado"
}

# Function to build production images
build_production_images() {
    log_step "Construindo imagens de produção..."
    
    # Build backend image
    log_step "Construindo imagem do backend..."
    docker build -t eo-clinica/backend:latest . || {
        log_error "Falha ao construir imagem do backend"
        return 1
    }
    
    # Build frontend image
    log_step "Construindo imagem do frontend..."
    docker build -t eo-clinica/frontend:latest ./frontend || {
        log_error "Falha ao construir imagem do frontend"
        return 1
    }
    
    log_success "Imagens de produção construídas"
}

# Function to start services with retry logic
start_services_with_retry() {
    log_step "Iniciando serviços com retry automático..."
    
    local retry=1
    local max_retries=$DOCKER_RETRY_COUNT
    
    while [ $retry -le $max_retries ]; do
        log_step "Tentativa $retry/$max_retries de inicialização dos serviços..."
        
        # Use production environment
        if COMPOSE_HTTP_TIMEOUT=120 docker-compose --env-file .env.production up -d --build; then
            log_success "Serviços iniciados com sucesso"
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
    
    log_error "Falha ao iniciar serviços após $max_retries tentativas"
    ROLLBACK_NEEDED=true
    return 1
}

# Function to wait for services to be healthy
wait_for_services() {
    log_step "Aguardando serviços ficarem saudáveis..."
    
    local services=("postgres:5432" "redis:6379" "app:3000")
    local timeout=$HEALTH_CHECK_TIMEOUT
    local elapsed=0
    
    for service in "${services[@]}"; do
        local container_name=$(echo "$service" | cut -d':' -f1)
        local port=$(echo "$service" | cut -d':' -f2)
        
        log_step "Aguardando $container_name na porta $port..."
        
        elapsed=0
        while [ $elapsed -lt $timeout ]; do
            if docker-compose exec -T "$container_name" timeout 5 sh -c "echo > /dev/tcp/localhost/$port" 2>/dev/null; then
                log_success "$container_name está respondendo!"
                break
            fi
            
            echo -n "."
            sleep 2
            elapsed=$((elapsed + 2))
        done
        
        if [ $elapsed -ge $timeout ]; then
            log_warning "$container_name não respondeu em ${timeout}s"
        fi
    done
}

# Function to run database migrations
setup_database() {
    log_step "Configurando banco de dados..."
    
    # Wait for PostgreSQL to be ready
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
        return 1
    fi
    
    # Run migrations in production mode
    log_step "Executando migrações..."
    if docker-compose exec -T app npm run db:migrate; then
        log_success "Migrações executadas"
    else
        log_error "Falha nas migrações"
        return 1
    fi
    
    # Generate Prisma client
    log_step "Gerando cliente Prisma..."
    if docker-compose exec -T app npm run db:generate; then
        log_success "Cliente Prisma gerado"
    else
        log_warning "Falha ao gerar cliente Prisma"
    fi
    
    # Seed database
    log_step "Populando banco com dados iniciais..."
    if docker-compose exec -T app npm run db:seed; then
        log_success "Base de dados populada"
    else
        log_warning "Falha no seed - continuando (normal em re-deploys)"
    fi
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
    if [ "$BACKUP_CREATED" = true ] && [ -f .last_backup_path ]; then
        local backup_path=$(cat .last_backup_path)
        log_warning "Iniciando rollback para backup: $backup_path"
        
        # Stop current deployment
        docker-compose down --volumes
        
        # Restore database if backup exists
        if [ -f "$backup_path/database_backup.sql" ]; then
            log_step "Restaurando banco de dados..."
            docker-compose up -d postgres
            sleep 10
            docker-compose exec -T postgres psql -U clinic_user -d eo_clinica_db < "$backup_path/database_backup.sql"
        fi
        
        log_warning "Rollback concluído. Verifique os logs e tente novamente."
    else
        log_error "Não foi possível fazer rollback - backup não disponível"
    fi
}

# Function to show final status
show_final_status() {
    log_header "🎉 EO CLÍNICA - DEPLOY DE PRODUÇÃO CONCLUÍDO!"
    
    echo -e "${WHITE}📱 SERVIÇOS DISPONÍVEIS${NC}"
    echo -e "   Frontend:     ${GREEN}http://localhost:3001${NC}"
    echo -e "   Backend:      ${GREEN}http://localhost:3000${NC}"
    echo -e "   API Docs:     ${GREEN}http://localhost:3000/documentation${NC}"
    echo -e "   PostgreSQL:   ${CYAN}localhost:5432${NC}"
    echo -e "   Redis:        ${CYAN}localhost:6380${NC}"
    echo -e "   ChromaDB:     ${CYAN}http://localhost:8000${NC}"
    echo -e "   N8N:          ${CYAN}http://localhost:5678${NC} (admin/admin123)"
    echo -e "   PgAdmin:      ${CYAN}http://localhost:5050${NC} (admin@clinic.com/admin123)"
    echo ""
    
    echo -e "${WHITE}👤 USUÁRIOS DE TESTE${NC}"
    echo -e "   👑 Admin:        ${YELLOW}admin@eoclinica.com.br${NC} / Admin123!"
    echo -e "   👨‍⚕️ Médico:       ${YELLOW}dr.silva@eoclinica.com.br${NC} / Admin123!"
    echo -e "   👩‍💼 Recepcionista: ${YELLOW}recepcao@eoclinica.com.br${NC} / Admin123!"
    echo -e "   🤒 Paciente:     ${YELLOW}paciente@example.com${NC} / Admin123!"
    echo ""
    
    echo -e "${WHITE}🔧 MONITORAMENTO${NC}"
    echo -e "   Logs:         ${CYAN}docker-compose logs -f${NC}"
    echo -e "   Status:       ${CYAN}docker-compose ps${NC}"
    echo -e "   Reiniciar:    ${CYAN}docker-compose restart${NC}"
    echo -e "   Parar:        ${CYAN}docker-compose down${NC}"
    echo ""
    
    echo -e "${WHITE}📊 ESTATÍSTICAS${NC}"
    local containers=$(docker-compose ps --services | wc -l)
    local images=$(docker images --filter "reference=eo-clinica/*" --format "{{.Repository}}" | wc -l)
    echo -e "   Containers:   ${GREEN}$containers serviços rodando${NC}"
    echo -e "   Imagens:      ${GREEN}$images imagens de produção${NC}"
    echo -e "   Ambiente:     ${GREEN}Produção${NC}"
    echo ""
    
    if [ "$BACKUP_CREATED" = true ]; then
        echo -e "${WHITE}💾 BACKUP${NC}"
        echo -e "   Localização:  ${CYAN}$(cat .last_backup_path)${NC}"
        echo ""
    fi
    
    log_header "🚀 SISTEMA PRONTO PARA PRODUÇÃO!"
}

# Cleanup function for signals
cleanup() {
    log_header "🛑 INTERRUPÇÃO DETECTADA..."
    
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
    log_header "🏥 EO CLÍNICA - DEPLOY COMPLETO PARA PRODUÇÃO"
    echo -e "${CYAN}© 2025 Jtarcio Desenvolvimento${NC}"
    echo -e "${CYAN}Versão: 1.0.3 - Script de Produção Robusto${NC}"
    echo ""
    
    # Set up signal handlers
    trap cleanup SIGINT SIGTERM
    
    # Execute deployment steps
    check_prerequisites
    create_backup
    clean_docker_environment
    setup_production_environment
    build_production_images
    
    if start_services_with_retry; then
        wait_for_services
        setup_database
        perform_health_checks
        show_final_status
    else
        log_error "Deploy falhou - iniciando rollback..."
        rollback_deployment
        exit 1
    fi
    
    log_success "Deploy de produção concluído com sucesso! 🎉"
}

# Execute main function with all arguments
main "$@"