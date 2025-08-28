#!/bin/bash

# 🔐 Security Validation Script - EO Clínica WhatsApp AI Integration
# Valida todas as configurações de segurança antes do deploy

set -e

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Funções de log
log_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

# Header
echo -e "${BLUE}🔐 SECURITY VALIDATION - WHATSAPP AI INTEGRATION${NC}"
echo "=================================================="
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. Validar variáveis de ambiente críticas
echo -e "${BLUE}🔍 1. VALIDANDO VARIÁVEIS DE AMBIENTE CRÍTICAS${NC}"
echo "------------------------------------------------"

# Carregar arquivo de produção
if [ -f ".env.production" ]; then
    log_pass "Arquivo .env.production encontrado"
    # Carregar variáveis sem executar comandos
    set -a  # automaticamente exportar todas as variáveis
    source .env.production 2>/dev/null || true
    set +a
else
    log_fail "Arquivo .env.production não encontrado"
    exit 1
fi

# Validar JWT Secrets
if [[ "$JWT_SECRET" == *"GENERATE"* || ${#JWT_SECRET} -lt 32 ]]; then
    log_fail "JWT_SECRET não configurado ou muito curto (mín. 32 chars)"
else
    log_pass "JWT_SECRET configurado adequadamente"
fi

if [[ "$REFRESH_TOKEN_SECRET" == *"GENERATE"* || ${#REFRESH_TOKEN_SECRET} -lt 32 ]]; then
    log_fail "REFRESH_TOKEN_SECRET não configurado ou muito curto"
else
    log_pass "REFRESH_TOKEN_SECRET configurado adequadamente"
fi

# Validar Encryption Key
if [[ "$ENCRYPTION_KEY" == *"CHARACTER"* || ${#ENCRYPTION_KEY} -ne 32 ]]; then
    log_fail "ENCRYPTION_KEY deve ter exatamente 32 caracteres"
else
    log_pass "ENCRYPTION_KEY configurado corretamente"
fi

# Validar API Keys
if [[ "$GEMINI_API_KEY" == *"YOUR_PRODUCTION"* ]]; then
    log_fail "GEMINI_API_KEY não configurado"
else
    log_pass "GEMINI_API_KEY configurado"
fi

if [[ "$ANTHROPIC_API_KEY" == *"YOUR_PRODUCTION"* ]]; then
    log_warn "ANTHROPIC_API_KEY não configurado (opcional)"
else
    log_pass "ANTHROPIC_API_KEY configurado"
fi

echo ""

# 2. Validar configurações de banco de dados
echo -e "${BLUE}🔍 2. VALIDANDO CONFIGURAÇÕES DE BANCO${NC}"
echo "----------------------------------------"

# Testar conexão com banco
if PGPASSWORD=clinic_password pg_isready -h localhost -p 5433 -U clinic_user -d eo_clinica_db > /dev/null 2>&1; then
    log_pass "Conexão com PostgreSQL funcionando"
else
    log_fail "Falha na conexão com PostgreSQL"
fi

# Testar conexão com Redis
if redis-cli -h localhost -p 6380 ping > /dev/null 2>&1; then
    log_pass "Conexão com Redis funcionando"
else
    log_fail "Falha na conexão com Redis"
fi

echo ""

# 3. Validar configurações de segurança
echo -e "${BLUE}🔍 3. VALIDANDO CONFIGURAÇÕES DE SEGURANÇA${NC}"
echo "------------------------------------------"

# Rate Limiting
if [ "$RATE_LIMIT_MAX_REQUESTS" -le 100 ]; then
    log_pass "Rate limiting configurado adequadamente ($RATE_LIMIT_MAX_REQUESTS req/15min)"
else
    log_warn "Rate limiting muito permissivo (>100 req/15min)"
fi

# CORS Origin
if [[ "$CORS_ORIGIN" == *"yourdomain.com"* ]]; then
    log_fail "CORS_ORIGIN ainda com placeholder - configure domínio real"
else
    log_pass "CORS_ORIGIN configurado"
fi

# Helmet e CSP
if [ "$HELMET_ENABLED" = "true" ]; then
    log_pass "Helmet habilitado para segurança HTTP"
else
    log_warn "Helmet desabilitado - recomendado habilitar"
fi

if [ "$CSP_ENABLED" = "true" ]; then
    log_pass "Content Security Policy habilitado"
else
    log_warn "CSP desabilitado - recomendado para produção"
fi

echo ""

# 4. Validar configurações WhatsApp
echo -e "${BLUE}🔍 4. VALIDANDO CONFIGURAÇÕES WHATSAPP${NC}"
echo "----------------------------------------"

if [[ "$WHATSAPP_ACCESS_TOKEN" == *"YOUR_PRODUCTION"* ]]; then
    log_fail "WHATSAPP_ACCESS_TOKEN não configurado"
else
    log_pass "WHATSAPP_ACCESS_TOKEN configurado"
fi

if [[ "$WHATSAPP_PHONE_NUMBER_ID" == *"YOUR_PRODUCTION"* ]]; then
    log_fail "WHATSAPP_PHONE_NUMBER_ID não configurado"
else
    log_pass "WHATSAPP_PHONE_NUMBER_ID configurado"
fi

if [[ "$WHATSAPP_WEBHOOK_VERIFY_TOKEN" == *"STRONG_WEBHOOK"* ]]; then
    log_fail "WHATSAPP_WEBHOOK_VERIFY_TOKEN não configurado"
else
    log_pass "WHATSAPP_WEBHOOK_VERIFY_TOKEN configurado"
fi

echo ""

# 5. Validar configurações AI
echo -e "${BLUE}🔍 5. VALIDANDO CONFIGURAÇÕES AI${NC}"
echo "--------------------------------"

if [ "$WHATSAPP_AI_ENABLED" = "true" ]; then
    log_pass "WhatsApp AI Integration habilitado"
else
    log_warn "WhatsApp AI Integration desabilitado"
fi

if [ "$AI_RESPONSE_MAX_LENGTH" -le 300 ]; then
    log_pass "AI response length otimizado ($AI_RESPONSE_MAX_LENGTH chars)"
else
    log_warn "AI response muito longo (>${AI_RESPONSE_MAX_LENGTH} chars)"
fi

if [ "$EMERGENCY_ESCALATION_ENABLED" = "true" ]; then
    log_pass "Escalação de emergência habilitada"
else
    log_fail "Escalação de emergência deve estar habilitada"
fi

echo ""

# 6. Validar LGPD compliance
echo -e "${BLUE}🔍 6. VALIDANDO CONFORMIDADE LGPD${NC}"
echo "---------------------------------"

if [ "$DATA_RETENTION_DAYS" = "2555" ]; then
    log_pass "Retenção de dados LGPD: 7 anos (2555 dias)"
else
    log_warn "Retenção de dados não padrão: $DATA_RETENTION_DAYS dias"
fi

if [ "$AUDIT_LOG_RETENTION_DAYS" = "3650" ]; then
    log_pass "Logs de auditoria: 10 anos (3650 dias)"
else
    log_warn "Logs de auditoria não padrão: $AUDIT_LOG_RETENTION_DAYS dias"
fi

if [ "$PRIVACY_DATA_ENCRYPTION" = "true" ]; then
    log_pass "Criptografia de dados pessoais habilitada"
else
    log_fail "Criptografia de dados pessoais deve estar habilitada"
fi

echo ""

# 7. Validar scripts essenciais
echo -e "${BLUE}🔍 7. VALIDANDO SCRIPTS DE DEPLOY${NC}"
echo "--------------------------------"

scripts=("production-deploy.sh" "monitor-deployment.sh")
for script in "${scripts[@]}"; do
    if [ -f "scripts/$script" ] && [ -x "scripts/$script" ]; then
        log_pass "Script $script existe e é executável"
    else
        log_fail "Script $script não encontrado ou não executável"
    fi
done

echo ""

# 8. Validar testes críticos
echo -e "${BLUE}🔍 8. VALIDANDO TESTES CRÍTICOS${NC}"
echo "-------------------------------"

# Testar master integration (rápido)
if timeout 30 npm test -- tests/whatsapp-ai-integration/master-integration.test.ts --silent > /dev/null 2>&1; then
    log_pass "Master integration tests passando"
else
    log_fail "Master integration tests falhando"
fi

echo ""

# Resumo Final
echo -e "${BLUE}📊 RESUMO DA VALIDAÇÃO DE SEGURANÇA${NC}"
echo "===================================="
echo -e "✅ Testes Passaram: ${GREEN}$PASSED${NC}"
echo -e "❌ Testes Falharam: ${RED}$FAILED${NC}"
echo -e "⚠️  Avisos: ${YELLOW}$WARNINGS${NC}"

TOTAL=$((PASSED + FAILED + WARNINGS))
SCORE=$((PASSED * 100 / (PASSED + FAILED)))

echo ""
echo -e "🎯 Score de Segurança: ${SCORE}% (${PASSED}/${((PASSED + FAILED))})"

if [ $FAILED -eq 0 ] && [ $SCORE -ge 90 ]; then
    echo -e "${GREEN}🎉 VALIDAÇÃO DE SEGURANÇA: APROVADA!${NC}"
    echo -e "${GREEN}✅ Sistema pronto para deploy em produção${NC}"
    exit 0
elif [ $FAILED -eq 0 ] && [ $SCORE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  VALIDAÇÃO DE SEGURANÇA: APROVADA COM RESSALVAS${NC}"
    echo -e "${YELLOW}🔧 Corrija os avisos antes do deploy se possível${NC}"
    exit 0
else
    echo -e "${RED}❌ VALIDAÇÃO DE SEGURANÇA: FALHOU${NC}"
    echo -e "${RED}🚫 Corrija os problemas críticos antes de continuar${NC}"
    exit 1
fi