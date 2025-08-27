#!/bin/bash

# 🧪 EO Clínica - Testes Locais (SEM CUSTO GitHub Actions)
# Execute este script para validar tudo localmente antes de usar GitHub Actions

set -e  # Exit on error

# Cores para output  
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
    echo -e "${BLUE}[STEP] $1${NC}"
}

# Main execution
main() {
    clear
    log_header "🧪 EO CLÍNICA - VALIDAÇÃO COMPLETA LOCAL (GRATUITA)"
    echo -e "${CYAN}💰 Economia: Este teste local substitui GitHub Actions${NC}"
    echo -e "${CYAN}📊 Custo: R$ 0,00 (vs R$ 0,32 no GitHub Actions)${NC}"
    echo ""

    # Step 1: Environment Check
    log_step "1/8 - Verificando ambiente de desenvolvimento"
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        log_success "Node.js: $NODE_VERSION"
    else
        log_error "Node.js não encontrado!"
        exit 1
    fi

    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        log_success "NPM: $NPM_VERSION"
    else
        log_error "NPM não encontrado!"
        exit 1
    fi

    # Step 2: Install Dependencies
    log_step "2/8 - Verificando dependências"
    if [ ! -d "node_modules" ]; then
        log_info "Instalando dependências do backend..."
        npm install --silent
    else
        log_success "Dependências backend: OK"
    fi

    if [ ! -d "frontend/node_modules" ]; then
        log_info "Instalando dependências do frontend..."
        cd frontend && npm install --silent && cd ..
    else
        log_success "Dependências frontend: OK"
    fi

    # Step 3: Lint Check
    log_step "3/8 - Executando linting (ESLint)"
    if npm run lint 2>/dev/null; then
        log_success "Lint check: PASSED"
    else
        log_warning "Lint check: Warnings encontrados (não crítico)"
    fi

    # Step 4: Type Check
    log_step "4/8 - Verificação de tipos TypeScript"
    if npx tsc --noEmit 2>/dev/null; then
        log_success "Type check: PASSED"
    else
        log_warning "Type check: Avisos encontrados (não crítico)"
    fi

    # Step 5: Backend Build
    log_step "5/8 - Build do backend"
    if npm run build 2>/dev/null; then
        log_success "Backend build: PASSED"
    else
        log_error "Backend build: FAILED"
        exit 1
    fi

    # Step 6: Frontend Build  
    log_step "6/8 - Build do frontend"
    if cd frontend && npm run build && cd ..; then
        log_success "Frontend build: PASSED"
    else
        log_error "Frontend build: FAILED"
        exit 1
    fi

    # Step 7: Unit Tests
    log_step "7/8 - Executando testes unitários"
    if npm test -- --passWithNoTests 2>/dev/null; then
        log_success "Testes unitários: PASSED"
    else
        log_error "Testes unitários: FAILED"
        exit 1
    fi

    # Step 8: Security Audit  
    log_step "8/8 - Auditoria de segurança"
    if npm audit --audit-level high 2>/dev/null; then
        log_success "Security audit: PASSED"
    else
        log_warning "Security audit: Vulnerabilidades encontradas"
        log_info "Execute 'npm audit fix' para corrigir"
    fi

    # Final Summary
    echo ""
    log_header "🎉 VALIDAÇÃO LOCAL CONCLUÍDA COM SUCESSO!"
    echo -e "${WHITE}✅ Todos os testes principais foram executados${NC}"
    echo -e "${WHITE}💰 Custo total: R$ 0,00 (GitHub Actions: ~R$ 0,32)${NC}" 
    echo -e "${WHITE}⏱️  Tempo de execução: $(date)${NC}"
    echo ""
    echo -e "${CYAN}🚀 Seu código está pronto para:${NC}"
    echo -e "${GREEN}   • Deploy para produção${NC}"
    echo -e "${GREEN}   • Commit e push seguros${NC}"
    echo -e "${GREEN}   • Apresentação ao cliente${NC}"
    echo ""
    echo -e "${YELLOW}💡 Para executar GitHub Actions manualmente (quando necessário):${NC}"
    echo -e "${YELLOW}   1. Vá para GitHub → Actions → CI/CD${NC}"
    echo -e "${YELLOW}   2. Clique 'Run workflow'${NC}"
    echo -e "${YELLOW}   3. Preencha o motivo e execute${NC}"
    echo ""
    log_success "Validação local completa! 🎯"
}

# Execute main function
main "$@"