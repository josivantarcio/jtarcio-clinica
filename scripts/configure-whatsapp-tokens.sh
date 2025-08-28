#!/bin/bash

# 🔧 WhatsApp Business API - Token Configuration Script
# Este script ajuda a configurar os tokens do WhatsApp Business API de forma segura

set -e

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 WHATSAPP BUSINESS API - CONFIGURAÇÃO DE TOKENS${NC}"
echo "=================================================="

# Verificar se arquivo .env.production existe
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo .env.production encontrado${NC}"
echo ""

# Função para configurar token
configure_token() {
    local token_name=$1
    local token_description=$2
    local current_value=$3
    
    echo -e "${BLUE}🔧 Configurando: $token_name${NC}"
    echo "Descrição: $token_description"
    echo "Valor atual: $current_value"
    echo ""
    
    if [[ "$current_value" == *"YOUR_PRODUCTION"* || "$current_value" == *"STRONG_"* ]]; then
        echo -e "${YELLOW}⚠️  Token não configurado (usando placeholder)${NC}"
        echo "Por favor, configure este token manualmente no arquivo .env.production"
        echo ""
        return 1
    else
        echo -e "${GREEN}✅ Token já configurado${NC}"
        echo ""
        return 0
    fi
}

# Obter valores atuais
ACCESS_TOKEN=$(grep "WHATSAPP_ACCESS_TOKEN=" .env.production | cut -d= -f2)
PHONE_NUMBER_ID=$(grep "WHATSAPP_PHONE_NUMBER_ID=" .env.production | cut -d= -f2)
WEBHOOK_VERIFY_TOKEN=$(grep "WHATSAPP_WEBHOOK_VERIFY_TOKEN=" .env.production | cut -d= -f2)

echo -e "${BLUE}📋 VERIFICANDO TOKENS ATUAIS${NC}"
echo "=============================="

# Configurar cada token
configure_token "WHATSAPP_ACCESS_TOKEN" "Token de acesso da Meta/Facebook para WhatsApp Business API" "$ACCESS_TOKEN"
ACCESS_TOKEN_CONFIGURED=$?

configure_token "WHATSAPP_PHONE_NUMBER_ID" "ID do número de telefone no WhatsApp Business" "$PHONE_NUMBER_ID"  
PHONE_ID_CONFIGURED=$?

configure_token "WHATSAPP_WEBHOOK_VERIFY_TOKEN" "Token de verificação do webhook" "$WEBHOOK_VERIFY_TOKEN"
WEBHOOK_CONFIGURED=$?

echo -e "${BLUE}📝 INSTRUÇÕES PARA CONFIGURAÇÃO MANUAL${NC}"
echo "====================================="
echo ""
echo "Para obter os tokens necessários:"
echo ""
echo "1. 🌐 Acesse: https://developers.facebook.com/"
echo "2. 📱 Crie uma aplicação WhatsApp Business"
echo "3. 🔑 Obtenha o Access Token na seção WhatsApp > Getting Started"
echo "4. 📞 Obtenha o Phone Number ID na mesma seção"
echo "5. 🔐 Gere um Webhook Verify Token seguro (ex: openssl rand -hex 32)"
echo ""

echo -e "${BLUE}🛠️  COMANDOS PARA CONFIGURAÇÃO MANUAL${NC}"
echo "=================================="
echo ""

if [ $ACCESS_TOKEN_CONFIGURED -ne 0 ]; then
    echo "# Configurar Access Token:"
    echo "sed -i 's/WHATSAPP_ACCESS_TOKEN=.*/WHATSAPP_ACCESS_TOKEN=SEU_ACCESS_TOKEN_AQUI/' .env.production"
    echo ""
fi

if [ $PHONE_ID_CONFIGURED -ne 0 ]; then
    echo "# Configurar Phone Number ID:"
    echo "sed -i 's/WHATSAPP_PHONE_NUMBER_ID=.*/WHATSAPP_PHONE_NUMBER_ID=SEU_PHONE_NUMBER_ID_AQUI/' .env.production"
    echo ""
fi

if [ $WEBHOOK_CONFIGURED -ne 0 ]; then
    echo "# Configurar Webhook Verify Token:"
    echo "sed -i 's/WHATSAPP_WEBHOOK_VERIFY_TOKEN=.*/WHATSAPP_WEBHOOK_VERIFY_TOKEN=SEU_WEBHOOK_TOKEN_AQUI/' .env.production"
    echo ""
fi

echo -e "${BLUE}🔄 APÓS CONFIGURAR OS TOKENS${NC}"
echo "========================="
echo ""
echo "1. Execute novamente este script para validar"
echo "2. Reinicie a API: pkill -f 'tsx src/index.ts' && NODE_ENV=production PORT=3000 npx tsx src/index.ts &"
echo "3. Teste os webhooks: curl http://localhost:3000/api/v1/webhooks/whatsapp"
echo ""

# Resumo final
TOTAL_TOKENS=3
CONFIGURED_COUNT=0

if [ $ACCESS_TOKEN_CONFIGURED -eq 0 ]; then ((CONFIGURED_COUNT++)); fi
if [ $PHONE_ID_CONFIGURED -eq 0 ]; then ((CONFIGURED_COUNT++)); fi  
if [ $WEBHOOK_CONFIGURED -eq 0 ]; then ((CONFIGURED_COUNT++)); fi

echo -e "${BLUE}📊 RESUMO DA CONFIGURAÇÃO${NC}"
echo "========================"
echo "Tokens configurados: $CONFIGURED_COUNT/$TOTAL_TOKENS"

if [ $CONFIGURED_COUNT -eq $TOTAL_TOKENS ]; then
    echo -e "${GREEN}🎉 Todos os tokens estão configurados!${NC}"
    echo -e "${GREEN}✅ WhatsApp Business API pronto para uso${NC}"
    exit 0
else
    REMAINING=$((TOTAL_TOKENS - CONFIGURED_COUNT))
    echo -e "${YELLOW}⚠️  $REMAINING tokens ainda precisam ser configurados${NC}"
    echo -e "${YELLOW}📋 Siga as instruções acima para completar a configuração${NC}"
    exit 1
fi