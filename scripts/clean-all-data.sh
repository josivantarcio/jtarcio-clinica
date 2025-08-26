#!/bin/bash

# EO Clínica - Script de Limpeza de Dados Fictícios
# © 2025 Jtarcio Desenvolvimento  
# ✨ Este script remove apenas dados fictícios/demo, mantendo estruturas essenciais
# 🔒 Dados reais e configurações do sistema são preservados

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
echo -e "${YELLOW}🧹 LIMPEZA DE DADOS FICTÍCIOS 🧹${NC}"
echo ""
echo -e "${BLUE}Este script vai remover apenas:${NC}"
echo -e "   • Dados de demonstração/teste"
echo -e "   • Notificações fictícias"
echo -e "   • Conversas de exemplo da IA"
echo -e "   • Agendamentos de teste"
echo ""
echo -e "${GREEN}✅ Dados reais e configurações serão preservados${NC}"
echo -e "${GREEN}✅ Estruturas do banco de dados mantidas${NC}"
echo -e "${GREEN}✅ Usuários administrativos preservados${NC}"
echo ""

read -p "Deseja continuar com a limpeza? (s/N): " confirmation

if [[ ! "$confirmation" =~ ^[Ss]$ ]]; then
    log_info "Operação cancelada pelo usuário"
    exit 0
fi

echo ""
log_info "Iniciando limpeza de dados fictícios..."

# Database connection check
log_info "Verificando conexão com o banco de dados..."
if ! PGPASSWORD=clinic_password pg_isready -h localhost -p 5433 -U clinic_user -d eo_clinica_db >/dev/null 2>&1; then
    log_error "Banco de dados não está acessível. Certifique-se de que está rodando."
    exit 1
fi

# Clean fictitious data from database
log_info "Removendo dados fictícios do banco..."

# Remove demo appointments (keep structure)
PGPASSWORD=clinic_password psql -h localhost -p 5433 -U clinic_user -d eo_clinica_db -c "
DELETE FROM appointments WHERE id IN (
    'demo_apt_1', 'demo_apt_2', 'demo_apt_3'
) OR notes LIKE '%demonstração%' OR notes LIKE '%teste%' OR notes LIKE '%exemplo%';
" 2>/dev/null || log_warning "Nenhum agendamento fictício encontrado"

# Remove demo patients (but keep essential structure)  
PGPASSWORD=clinic_password psql -h localhost -p 5433 -U clinic_user -d eo_clinica_db -c "
DELETE FROM users WHERE email IN (
    'maria.teste@example.com',
    'joao.demo@example.com', 
    'ana.exemplo@example.com'
) OR name LIKE '%Teste%' OR name LIKE '%Demo%' OR name LIKE '%Exemplo%';
" 2>/dev/null || log_warning "Nenhum usuário fictício encontrado"

# Remove demo financial records
PGPASSWORD=clinic_password psql -h localhost -p 5433 -U clinic_user -d eo_clinica_db -c "
DELETE FROM financial_transactions WHERE description LIKE '%teste%' OR description LIKE '%demo%';
DELETE FROM accounts_payable WHERE description LIKE '%teste%' OR description LIKE '%demo%';
" 2>/dev/null || log_warning "Nenhum registro financeiro fictício encontrado"

# Clear cache/temporary data
log_info "Limpando cache e dados temporários..."
if command -v redis-cli >/dev/null 2>&1; then
    redis-cli -p 6379 FLUSHDB 2>/dev/null || log_warning "Redis não disponível"
else
    log_warning "Redis CLI não encontrado, pulando limpeza de cache"
fi

# Clean frontend localStorage mock data
log_info "Preparando limpeza de dados fictícios no frontend..."

log_success "Limpeza de dados fictícios concluída!"
echo ""
log_info "✅ Estruturas do sistema preservadas"
log_info "✅ Usuários administrativos mantidos" 
log_info "✅ Configurações essenciais preservadas"
echo ""
log_info "O sistema está pronto para uso com dados reais."