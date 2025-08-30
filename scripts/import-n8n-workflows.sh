#!/bin/bash

# 🚀 Script para Importar Workflows WhatsApp AI no N8N
# Configurado para suas credenciais: josivantarcio@msn.com | Admin123!

set -e

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 IMPORTANDO WORKFLOWS WHATSAPP AI PARA N8N${NC}"
echo "=============================================="

echo "📋 Suas credenciais configuradas:"
echo "• Email: josivantarcio@msn.com"
echo "• Senha: Admin123!"
echo ""

# Verificar se N8N está rodando
echo -e "${BLUE}1. 🔍 Verificando N8N...${NC}"
if ! curl -s http://localhost:5678 --connect-timeout 3 > /dev/null; then
    echo -e "${YELLOW}⚠️  N8N não está rodando. Iniciando...${NC}"
    docker-compose up n8n -d
    echo "⏳ Aguardando N8N inicializar (30 segundos)..."
    sleep 30
fi

# Verificar novamente
if curl -s http://localhost:5678 --connect-timeout 5 > /dev/null; then
    echo -e "${GREEN}✅ N8N está acessível em http://localhost:5678${NC}"
else
    echo -e "${RED}❌ N8N não está respondendo. Execute: docker-compose up n8n -d${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}2. 📁 Verificando arquivos de workflow...${NC}"

# Verificar se o arquivo de workflows existe
WORKFLOW_FILE="n8n-workflows/whatsapp-ai-workflows.json"
if [ -f "$WORKFLOW_FILE" ]; then
    echo -e "${GREEN}✅ Workflows encontrados: $WORKFLOW_FILE${NC}"
else
    echo -e "${RED}❌ Arquivo de workflows não encontrado: $WORKFLOW_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}3. 🔐 INSTRUÇÕES PARA IMPORTAÇÃO MANUAL${NC}"
echo "========================================"
echo ""
echo "Como o N8N requer interface web para configuração inicial,"
echo "siga estas instruções:"
echo ""
echo "📋 PASSOS:"
echo ""
echo "1. 🌐 Abra seu navegador e acesse:"
echo "   ${BLUE}http://localhost:5678${NC}"
echo ""
echo "2. 👤 Configure suas credenciais na primeira vez:"
echo "   Email: ${GREEN}josivantarcio@msn.com${NC}"
echo "   Senha: ${GREEN}Admin123!${NC}"
echo "   Nome: ${GREEN}Josivan Tarcio${NC}"
echo ""
echo "3. 📥 Importar Workflows:"
echo "   • Clique em 'Workflows' no menu lateral"
echo "   • Clique no botão 'Import from file'"
echo "   • Selecione o arquivo: ${BLUE}$(pwd)/$WORKFLOW_FILE${NC}"
echo "   • Confirme a importação"
echo ""
echo "4. 🔧 Configurar Credenciais PostgreSQL:"
echo "   • Vá em 'Settings' > 'Credentials'"
echo "   • Adicione nova credencial 'PostgreSQL'"
echo "   • Nome: ${GREEN}EO Clínica PostgreSQL${NC}"
echo "   • Host: ${GREEN}postgres${NC} (ou localhost se não funcionar)"
echo "   • Port: ${GREEN}5432${NC}"
echo "   • Database: ${GREEN}eo_clinica_db${NC}"
echo "   • User: ${GREEN}clinic_user${NC}"
echo "   • Password: ${GREEN}clinic_password${NC}"
echo ""
echo "5. ✅ Ativar Workflows:"
echo "   • Clique no toggle ao lado de cada workflow para ativar"
echo "   • Workflows disponíveis:"
echo "     ${GREEN}• WhatsApp AI - Message Processor${NC}"
echo "     ${GREEN}• WhatsApp AI - Appointment Scheduler${NC}" 
echo "     ${GREEN}• WhatsApp AI - Emergency Escalation${NC}"
echo ""

echo -e "${BLUE}🧪 TESTANDO ACESSO AO N8N${NC}"
echo "========================="

# Tentar fazer uma requisição simples para verificar se está funcionando
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5678)
if [ "$response" = "200" ] || [ "$response" = "302" ]; then
    echo -e "${GREEN}✅ N8N respondendo corretamente (HTTP $response)${NC}"
    echo -e "${GREEN}🌐 Acesse: http://localhost:5678${NC}"
else
    echo -e "${RED}⚠️  N8N respondeu com HTTP $response${NC}"
    echo "Pode ainda estar inicializando..."
fi

echo ""
echo -e "${BLUE}📊 STATUS DOS CONTAINERS${NC}"
echo "========================"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(n8n|postgres|redis)" || echo "Containers não encontrados"

echo ""
echo -e "${BLUE}🚀 PRÓXIMOS PASSOS APÓS IMPORTAÇÃO${NC}"
echo "=================================="
echo ""
echo "1. Configure suas credenciais no N8N (josivantarcio@msn.com)"
echo "2. Importe os workflows do arquivo JSON"
echo "3. Configure as credenciais PostgreSQL"
echo "4. Ative os workflows"
echo "5. Teste os webhooks:"
echo "   • http://localhost:5678/webhook/whatsapp-incoming"
echo "   • http://localhost:5678/webhook/schedule-appointment"
echo "   • http://localhost:5678/webhook/emergency-detected"
echo ""
echo -e "${GREEN}✅ Workflows WhatsApp AI estão prontos para importação!${NC}"
echo ""
echo "🔗 Arquivo de workflows: $(pwd)/$WORKFLOW_FILE"
echo "📖 Documentação completa: docs/11-ai-implementation/N8N_WHATSAPP_AI_GUIDE.md"