#!/bin/bash

# 🔐 Production Secrets Generator - EO Clínica
# Generates all secure keys and passwords needed for production

set -e

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}🔐 PRODUCTION SECRETS GENERATOR - EO CLÍNICA${NC}"
echo "===================================================="
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANT: These are cryptographically secure secrets for production${NC}"
echo -e "${YELLOW}⚠️  Save them securely and never commit to version control${NC}"
echo ""

# Funções para gerar segredos
generate_64_char_key() {
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
}

generate_32_char_key() {
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

generate_strong_password() {
    node -e "console.log(require('crypto').randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 24))"
}

generate_webhook_token() {
    node -e "console.log('whv_' + require('crypto').randomBytes(32).toString('hex'))"
}

generate_api_key() {
    node -e "console.log('ak_' + require('crypto').randomBytes(32).toString('hex'))"
}

# Verificar se Node.js está disponível
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale Node.js para gerar os segredos.${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Gerando segredos de produção...${NC}"
echo ""

# JWT Secrets
echo -e "${GREEN}# ===============================================${NC}"
echo -e "${GREEN}# JWT CONFIGURATION (🔐 CRITICAL)${NC}"
echo -e "${GREEN}# ===============================================${NC}"
JWT_SECRET=$(generate_64_char_key)
JWT_REFRESH_SECRET=$(generate_64_char_key)
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

# Encryption Keys
echo -e "${GREEN}# ===============================================${NC}"
echo -e "${GREEN}# ENCRYPTION CONFIGURATION (🔐 CRITICAL)${NC}"
echo -e "${GREEN}# ===============================================${NC}"
MASTER_ENCRYPTION_KEY=$(generate_32_char_key)
ENCRYPTION_KEY=$(generate_32_char_key)
echo "MASTER_ENCRYPTION_KEY=$MASTER_ENCRYPTION_KEY"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""

# Database Passwords
echo -e "${GREEN}# ===============================================${NC}"
echo -e "${GREEN}# DATABASE PASSWORDS (💾 SECURE)${NC}"
echo -e "${GREEN}# ===============================================${NC}"
DB_PASSWORD=$(generate_strong_password)
REDIS_PASSWORD=$(generate_strong_password)
CLICKHOUSE_PASSWORD=$(generate_strong_password)
echo "DB_PASSWORD=$DB_PASSWORD"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo "CLICKHOUSE_PASSWORD=$CLICKHOUSE_PASSWORD"
echo ""

# N8N Configuration
echo -e "${GREEN}# ===============================================${NC}"
echo -e "${GREEN}# N8N WORKFLOW AUTOMATION (🔄 SECURE)${NC}"
echo -e "${GREEN}# ===============================================${NC}"
N8N_PASSWORD=$(generate_strong_password)
N8N_ENCRYPTION_KEY=$(generate_32_char_key)
N8N_API_KEY=$(generate_api_key)
echo "N8N_PASSWORD=$N8N_PASSWORD"
echo "N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY"
echo "N8N_API_KEY=$N8N_API_KEY"
echo ""

# WhatsApp Configuration
echo -e "${GREEN}# ===============================================${NC}"
echo -e "${GREEN}# WHATSAPP CONFIGURATION (📱 SECURE)${NC}"
echo -e "${GREEN}# ===============================================${NC}"
WHATSAPP_WEBHOOK_VERIFY_TOKEN=$(generate_webhook_token)
WAHA_API_KEY=$(generate_api_key)
echo "WHATSAPP_WEBHOOK_VERIFY_TOKEN=$WHATSAPP_WEBHOOK_VERIFY_TOKEN"
echo "WAHA_API_KEY=$WAHA_API_KEY"
echo ""

# Default Passwords
echo -e "${GREEN}# ===============================================${NC}"
echo -e "${GREEN}# SYSTEM DEFAULTS (👤 SECURE)${NC}"
echo -e "${GREEN}# ===============================================${NC}"
SEED_DEFAULT_PASSWORD=$(generate_strong_password)
echo "SEED_DEFAULT_PASSWORD=$SEED_DEFAULT_PASSWORD"
echo ""

# Save to temporary file
TEMP_FILE="/tmp/eo-clinica-production-secrets-$(date +%Y%m%d-%H%M%S).env"

cat > "$TEMP_FILE" << EOF
# ===============================================
# 🚀 GENERATED PRODUCTION SECRETS
# Generated on: $(date '+%Y-%m-%d %H:%M:%S')
# ===============================================
# ⚠️ CRITICAL: Keep these values secure!
# Replace the placeholders in .env.production with these values

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# Encryption Configuration
MASTER_ENCRYPTION_KEY=$MASTER_ENCRYPTION_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Database Passwords
DB_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
CLICKHOUSE_PASSWORD=$CLICKHOUSE_PASSWORD

# N8N Configuration
N8N_PASSWORD=$N8N_PASSWORD
N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY
N8N_API_KEY=$N8N_API_KEY

# WhatsApp Configuration
WHATSAPP_WEBHOOK_VERIFY_TOKEN=$WHATSAPP_WEBHOOK_VERIFY_TOKEN
WAHA_API_KEY=$WAHA_API_KEY

# System Defaults
SEED_DEFAULT_PASSWORD=$SEED_DEFAULT_PASSWORD
EOF

echo -e "${BLUE}💾 Segredos salvos em: ${TEMP_FILE}${NC}"
echo ""

# Instructions
echo -e "${YELLOW}📄 NEXT STEPS:${NC}"
echo -e "${YELLOW}1. Copy the values above to your .env.production file${NC}"
echo -e "${YELLOW}2. Replace the remaining placeholders (API keys, domain, etc.)${NC}"
echo -e "${YELLOW}3. Store these secrets securely (password manager, vault, etc.)${NC}"
echo -e "${YELLOW}4. Delete the temporary file: rm $TEMP_FILE${NC}"
echo -e "${YELLOW}5. Never commit .env.production to version control${NC}"
echo ""

echo -e "${GREEN}✓ Production secrets generated successfully!${NC}"
echo ""

# Security reminder
echo -e "${RED}⚠️  SECURITY REMINDER:${NC}"
echo -e "${RED}- These secrets provide full access to your system${NC}"
echo -e "${RED}- Store them in a secure password manager${NC}"
echo -e "${RED}- Use different secrets for staging and production${NC}"
echo -e "${RED}- Rotate secrets regularly (every 90 days)${NC}"
echo -e "${RED}- Monitor for any unauthorized access${NC}"
echo ""

echo -e "${BLUE}🚀 Ready for production deployment!${NC}"