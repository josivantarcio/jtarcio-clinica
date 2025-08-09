#!/bin/bash

# EO Clínica - Complete Development Startup Script
# © 2025 Jtarcio Desenvolvimento
# Script completo para inicializar todo o ambiente de desenvolvimento

set -e  # Exit on error

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

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    log_step "Verificando porta $port..."
    
    # Find processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        log_warning "Processos encontrados na porta $port: $pids"
        echo "   Finalizando processos..."
        kill -TERM $pids 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            echo "   Forçando finalização..."
            kill -9 $pids 2>/dev/null || true
            sleep 1
        fi
        log_success "Porta $port liberada"
    fi
}

# Function to check if a service is responding
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    log_step "Aguardando $name estar disponível em $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -qE "^[23]"; then
            log_success "$name está respondendo!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "$name não respondeu após $max_attempts tentativas"
    return 1
}

# Function to setup environment
setup_environment() {
    log_step "Configurando ambiente..."
    
    # Check if .env exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            log_step "Criando arquivo .env..."
            cp .env.example .env
            log_success "Arquivo .env criado"
        else
            log_error "Arquivo .env ou .env.example não encontrado!"
            exit 1
        fi
    fi
    
    # Setup frontend environment
    if [ ! -f frontend/.env.local ]; then
        log_step "Criando frontend/.env.local..."
        cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EO Clínica
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENABLE_AI_CHAT=true
PORT=3001
EOF
        log_success "Frontend environment configurado"
    fi
}

# Function to install dependencies
install_dependencies() {
    log_step "Instalando dependências do backend..."
    npm install --silent
    
    log_step "Instalando dependências do frontend..."
    cd frontend && npm install --silent && cd ..
    
    log_success "Dependências instaladas"
}

# Function to setup database
setup_database() {
    log_step "Configurando banco de dados..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker não está rodando. Inicie o Docker e tente novamente."
        exit 1
    fi
    
    # Stop conflicting containers
    log_step "Parando containers que podem conflitar..."
    docker stop eo-clinica2_app_1 2>/dev/null || true
    docker stop eo-clinica2_frontend_1 2>/dev/null || true
    
    # Start database services
    log_step "Iniciando serviços do banco..."
    docker-compose up -d postgres redis chromadb pgadmin n8n
    
    # Wait for PostgreSQL
    log_step "Aguardando PostgreSQL..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if docker-compose exec -T postgres pg_isready -U clinic_user -d eo_clinica_db 2>/dev/null; then
            log_success "PostgreSQL está pronto!"
            break
        fi
        echo -n "."
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [ $attempts -eq 30 ]; then
        log_error "PostgreSQL não iniciou corretamente"
        exit 1
    fi
    
    # Generate Prisma client
    log_step "Gerando cliente Prisma..."
    npm run db:generate
    
    # Run migrations
    log_step "Executando migrações..."
    npx prisma migrate deploy
    
    # Seed database
    log_step "Populando banco com dados iniciais..."
    npm run db:seed
    
    log_success "Banco de dados configurado"
}

# Function to start services
start_services() {
    log_step "Iniciando serviços de desenvolvimento..."
    
    # Start backend
    log_step "Iniciando Backend (porta 3000)..."
    npm run start &
    BACKEND_PID=$!
    
    # Wait for backend
    sleep 3
    if ! check_service "http://localhost:3000/health" "Backend"; then
        log_error "Backend não iniciou corretamente"
        cleanup
        exit 1
    fi
    
    # Start frontend
    log_step "Iniciando Frontend (porta 3001)..."
    cd frontend && PORT=3001 npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend
    if ! check_service "http://localhost:3001" "Frontend"; then
        log_warning "Frontend pode estar demorando para iniciar, mas continuando..."
    fi
    
    log_success "Serviços iniciados com sucesso!"
}

# Function to display final information
show_info() {
    log_header "🎉 EO CLÍNICA SISTEMA INICIADO COM SUCESSO!"
    
    echo -e "${WHITE}📱 APLICAÇÃO${NC}"
    echo -e "   Frontend:     ${GREEN}http://localhost:3001${NC}"
    echo -e "   Backend:      ${GREEN}http://localhost:3000${NC}"
    echo -e "   API Docs:     ${GREEN}http://localhost:3000/documentation${NC}"
    echo ""
    
    echo -e "${WHITE}🗄️  SERVIÇOS${NC}"
    echo -e "   PostgreSQL:   ${CYAN}localhost:5432${NC}"
    echo -e "   Redis:        ${CYAN}localhost:6379${NC}"
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
    
    echo -e "${WHITE}🎯 PRÓXIMOS PASSOS${NC}"
    echo -e "   1. Acesse ${GREEN}http://localhost:3001${NC} no seu navegador"
    echo -e "   2. Faça login com qualquer usuário de teste"
    echo -e "   3. Explore as funcionalidades do sistema"
    echo ""
    
    log_header "💡 PRESSIONE CTRL+C PARA PARAR TODOS OS SERVIÇOS"
}

# Cleanup function
cleanup() {
    log_header "🛑 PARANDO SERVIÇOS..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        log_info "Backend parado"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        log_info "Frontend parado"
    fi
    
    # Clean up ports
    kill_port 3000
    kill_port 3001
    
    log_success "Limpeza concluída"
    exit 0
}

# Main execution
main() {
    # Clear screen
    clear
    
    # Show header
    log_header "🏥 EO CLÍNICA - INICIALIZAÇÃO COMPLETA DO SISTEMA"
    echo -e "${CYAN}© 2025 Jtarcio Desenvolvimento${NC}"
    echo ""
    
    # Trap signals for cleanup
    trap cleanup SIGINT SIGTERM EXIT
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
        log_error "Execute este script na raiz do projeto EO Clínica"
        exit 1
    fi
    
    # Check for required tools
    command -v node >/dev/null 2>&1 || { log_error "Node.js não encontrado. Instale Node.js 18+"; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "NPM não encontrado. Instale Node.js com NPM"; exit 1; }
    command -v docker >/dev/null 2>&1 || { log_error "Docker não encontrado. Instale Docker"; exit 1; }
    
    # Clean ports
    log_step "Limpando portas em uso..."
    kill_port 3000
    kill_port 3001
    
    # Setup environment
    setup_environment
    
    # Install dependencies
    install_dependencies
    
    # Setup database
    setup_database
    
    # Start services
    start_services
    
    # Show information
    show_info
    
    # Wait for user input
    while true; do
        sleep 1
    done
}

# Execute main function
main "$@"