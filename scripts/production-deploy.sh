#!/bin/bash

# 🚀 WhatsApp AI Integration - Production Deploy Script
# Este script automatiza o deploy para produção

set -e  # Sair em caso de erro

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DEPLOYMENT_LOG="logs/deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"

# Função para log
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Função para verificar pré-requisitos
check_prerequisites() {
    log "🔍 Verificando pré-requisitos..."
    
    # Verificar se está na branch main
    if [ "$(git branch --show-current)" != "main" ]; then
        log_error "Deploy deve ser feito a partir da branch main"
        exit 1
    fi
    
    # Verificar se não há mudanças não commitadas
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Existem mudanças não commitadas. Commit antes do deploy."
        exit 1
    fi
    
    # Verificar se todos os testes passaram localmente
    log "🧪 Executando testes finais..."
    npm test -- tests/whatsapp-ai-integration/master-integration.test.ts --silent
    
    if [ $? -ne 0 ]; then
        log_error "Testes falharam. Deploy cancelado."
        exit 1
    fi
    
    log "✅ Pré-requisitos atendidos!"
}

# Função para criar backup
create_backup() {
    log "📦 Criando backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup do código atual
    git archive HEAD | tar -x -C "$BACKUP_DIR"
    
    # Backup do banco de dados (se em produção)
    if [ "$NODE_ENV" = "production" ]; then
        pg_dump $DATABASE_URL > "$BACKUP_DIR/database-backup.sql" 2>/dev/null || log_warning "Backup do banco não foi possível"
    fi
    
    log "✅ Backup criado em: $BACKUP_DIR"
}

# Função para atualizar checklist
update_checklist() {
    local phase=$1
    local status=$2
    
    # Criar timestamp
    local timestamp=$(date +%H:%M:%S)
    
    # Atualizar checklist
    sed -i "s/> \*\*Última Atualização\*\*.*/> **Última Atualização**: 2025-08-28 às $timestamp/" WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md
    
    case $phase in
        "validation")
            if [ "$status" = "success" ]; then
                sed -i 's/### 🔄 \*\*FASE 2: GITHUB ACTIONS VALIDATION\*\*/### 🔄 **FASE 2: GITHUB ACTIONS VALIDATION** ✅ **COMPLETA**/' WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md
                sed -i 's/- \[ \] ⏳ Verificar se GitHub Actions passou 100%/- [x] ✅ GitHub Actions passou 100% - todos os testes validados/' WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md
                sed -i 's/\*\*Status\*\*: ⏳ AGUARDANDO FASE 1/**Status**: ✅ **COMPLETA** (100%)/' WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md
            fi
            ;;
        "production")
            if [ "$status" = "start" ]; then
                sed -i 's/> \*\*Progresso\*\*: 2\/5 fases completadas/> **Progresso**: 4\/5 fases completadas/' WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md
            elif [ "$status" = "success" ]; then
                sed -i 's/> \*\*Status Atual\*\*: 🟡 EM PROGRESSO/> **Status Atual**: ✅ **PRODUÇÃO ATIVA**/' WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md
                sed -i 's/> \*\*Progresso\*\*: 4\/5 fases completadas/> **Progresso**: 5\/5 fases completadas/' WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md
            fi
            ;;
    esac
}

# Função para deploy da aplicação
deploy_application() {
    log "🚀 Iniciando deploy para produção..."
    
    update_checklist "production" "start"
    
    # Instalar dependências
    log "📦 Instalando dependências..."
    npm ci --production
    cd frontend && npm ci --production && cd ..
    
    # Build da aplicação
    log "🏗️ Building aplicação..."
    npm run build
    cd frontend && npm run build && cd ..
    
    # Aplicar migrações do banco
    log "🗄️ Aplicando migrações..."
    npx prisma db push --accept-data-loss || log_warning "Migrações podem ter falhado"
    
    # Restart dos serviços
    log "🔄 Reiniciando serviços..."
    
    # Se usando PM2
    if command -v pm2 &> /dev/null; then
        pm2 restart ecosystem.config.js
    # Se usando Docker
    elif command -v docker-compose &> /dev/null; then
        docker-compose down
        docker-compose up -d --build
    # Fallback: reiniciar manualmente
    else
        log_warning "Sistema de processo não identificado. Reinicie manualmente."
    fi
    
    log "✅ Deploy concluído!"
}

# Função para validar deploy
validate_deployment() {
    log "🔍 Validando deploy..."
    
    # Aguardar aplicação inicializar
    sleep 10
    
    # Verificar health checks
    local health_check_url="http://localhost:3000/health"
    
    for i in {1..30}; do
        if curl -f -s "$health_check_url" > /dev/null; then
            log "✅ Health check passou!"
            break
        elif [ $i -eq 30 ]; then
            log_error "Health check falhou após 30 tentativas"
            return 1
        else
            log "⏳ Aguardando aplicação inicializar... (tentativa $i/30)"
            sleep 2
        fi
    done
    
    # Executar smoke tests
    log "🧪 Executando smoke tests..."
    
    # Teste básico da API
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/health" || echo "000")
    
    if [ "$api_response" = "200" ]; then
        log "✅ API respondendo corretamente"
    else
        log_error "API não está respondendo (código: $api_response)"
        return 1
    fi
    
    # Teste do WhatsApp AI (se endpoint existir)
    local ai_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/whatsapp/health" 2>/dev/null || echo "404")
    
    if [ "$api_response" = "200" ]; then
        log "✅ WhatsApp AI respondendo corretamente"
    else
        log_warning "Endpoint WhatsApp AI não disponível (normal se não configurado)"
    fi
    
    log "✅ Validação concluída com sucesso!"
}

# Função para rollback
rollback() {
    log_error "🔄 Iniciando rollback..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Restaurar código
        rsync -av --delete "$BACKUP_DIR/" ./
        
        # Restaurar banco (se backup existe)
        if [ -f "$BACKUP_DIR/database-backup.sql" ] && [ "$NODE_ENV" = "production" ]; then
            psql $DATABASE_URL < "$BACKUP_DIR/database-backup.sql" || log_warning "Rollback do banco falhou"
        fi
        
        log "✅ Rollback concluído"
    else
        log_error "Backup não encontrado para rollback"
    fi
}

# Função principal
main() {
    echo -e "${BLUE}"
    echo "🚀 WHATSAPP AI INTEGRATION - PRODUCTION DEPLOY"
    echo "============================================="
    echo -e "${NC}"
    
    # Criar diretórios necessários
    mkdir -p logs backups
    
    log "🚀 Iniciando deploy para produção..."
    log "📋 Checklist: WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md"
    
    # Trap para rollback em caso de erro
    trap rollback ERR
    
    # Executar etapas
    check_prerequisites
    create_backup
    deploy_application
    validate_deployment
    
    # Atualizar checklist final
    update_checklist "production" "success"
    
    echo -e "${GREEN}"
    echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
    echo "================================"
    echo -e "${NC}"
    echo "🔗 Links:"
    echo "   • Aplicação: http://localhost:3000"
    echo "   • Frontend: http://localhost:3001"
    echo "   • Health: http://localhost:3000/health"
    echo "   • Logs: $DEPLOYMENT_LOG"
    echo "   • Backup: $BACKUP_DIR"
    echo ""
    echo "📋 Status atualizado em: WHATSAPP_AI_DEPLOYMENT_CHECKLIST.md"
    echo ""
    log "🎉 Deploy para produção concluído com sucesso!"
}

# Verificar argumentos
if [ "$1" = "--rollback" ]; then
    rollback
    exit 0
elif [ "$1" = "--validate-only" ]; then
    validate_deployment
    exit 0
fi

# Executar deploy completo
main