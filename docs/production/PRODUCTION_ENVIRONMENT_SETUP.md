# 🚀 Production Environment Setup Guide

> **Complete guide for setting up secure production environment variables for EO Clínica**

## 🔄 Quick Setup Process

### 1. Generate Production Secrets

```bash
# Make the script executable
chmod +x scripts/generate-production-secrets.sh

# Generate all secure secrets
./scripts/generate-production-secrets.sh
```

This will generate:
- 🔐 **JWT tokens** (64-char cryptographically secure)
- 🔒 **Encryption keys** (32-char AES-256 compatible)
- 💾 **Database passwords** (24-char secure)
- 🔑 **API keys and webhook tokens**
- 👤 **Default system passwords**

### 2. Copy Production Template

```bash
# Copy the production template
cp .env.production .env.production.local

# Edit with your secure values
vim .env.production.local  # or your preferred editor
```

### 3. Replace All Placeholders

Replace these **CRITICAL** placeholders with real values:

#### 🔐 Security Keys (Use generated values)
```env
JWT_SECRET=GENERATE_64_CHAR_SECRET_KEY_HERE_FOR_PRODUCTION
JWT_REFRESH_SECRET=GENERATE_DIFFERENT_64_CHAR_REFRESH_KEY_HERE
MASTER_ENCRYPTION_KEY=GENERATE_32_CHARACTER_ENCRYPTION_KEY
ENCRYPTION_KEY=GENERATE_32_CHARACTER_ENCRYPTION_KEY
```

#### 💾 Database Credentials
```env
DB_PASSWORD=YOUR_PRODUCTION_DB_PASSWORD
REDIS_PASSWORD=YOUR_PRODUCTION_REDIS_PASSWORD
CLICKHOUSE_PASSWORD=STRONG_CLICKHOUSE_PASSWORD_PRODUCTION
```

#### 🤖 AI Integration
```env
GEMINI_API_KEY=YOUR_PRODUCTION_GEMINI_API_KEY_HERE
ANTHROPIC_API_KEY=YOUR_PRODUCTION_ANTHROPIC_KEY_HERE
```

#### 📱 WhatsApp Business API
```env
WHATSAPP_ACCESS_TOKEN=YOUR_PRODUCTION_WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID=YOUR_PRODUCTION_PHONE_NUMBER_ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN=STRONG_WEBHOOK_VERIFY_TOKEN_PRODUCTION
WAHA_API_KEY=YOUR_PRODUCTION_WAHA_API_KEY_HERE
```

#### 🔄 N8N Automation
```env
N8N_PASSWORD=STRONG_N8N_PASSWORD_PRODUCTION
N8N_ENCRYPTION_KEY=GENERATE_STRONG_N8N_ENCRYPTION_KEY_32_CHARS
N8N_API_KEY=YOUR_PRODUCTION_N8N_API_KEY_HERE
```

#### 🌐 Domain & SSL
```env
DOMAIN=yourdomain.com
CORS_ORIGIN=https://yourdomain.com
WAHA_WEBHOOK_URL=https://yourdomain.com/api/v1/webhooks/whatsapp
N8N_WEBHOOK_BASE_URL=https://yourdomain.com/webhook
```

#### 📧 Email Configuration
```env
SMTP_USER=YOUR_PRODUCTION_EMAIL@gmail.com
SMTP_PASS=YOUR_PRODUCTION_APP_PASSWORD
```

---

## 🛡️ Security Checklist

### ✅ Required Actions

- [ ] **Generate all cryptographic secrets** using the provided script
- [ ] **Replace ALL placeholder values** (never use defaults in production)
- [ ] **Set strong database passwords** (minimum 16 characters)
- [ ] **Configure your actual domain name** (no localhost in production)
- [ ] **Set up SSL certificates** for HTTPS
- [ ] **Validate all API keys** are for production services
- [ ] **Enable security features** (Helmet, CSP, Rate Limiting)
- [ ] **Never commit** `.env.production.local` to version control

### 🔒 Security Best Practices

1. **Use strong passwords everywhere**
   - Minimum 16 characters for passwords
   - 32 characters for encryption keys
   - 64 characters for JWT secrets

2. **Enable all security features**
   ```env
   HELMET_ENABLED=true
   CSP_ENABLED=true
   PRIVACY_DATA_ENCRYPTION=true
   EMERGENCY_ESCALATION_ENABLED=true
   ENABLE_AUDIT_LOGS=true
   ```

3. **Set proper rate limiting**
   ```env
   RATE_LIMIT_MAX_REQUESTS=100  # Adjust based on your needs
   RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   ```

4. **Configure LGPD compliance**
   ```env
   DATA_RETENTION_DAYS=2555        # 7 years
   AUDIT_LOG_RETENTION_DAYS=3650   # 10 years
   PRIVACY_DATA_ENCRYPTION=true
   ```

---

## 📝 API Keys Setup Guide

### 🤖 Gemini AI (Required)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to `GEMINI_API_KEY`

### 🤖 Claude AI (Optional)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Copy the key to `ANTHROPIC_API_KEY`

### 📱 WhatsApp Business API

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a WhatsApp Business app
3. Get your access token and phone number ID
4. Set up webhook with the generated verify token

### 📧 Gmail SMTP (Optional)

1. Enable 2-factor authentication on your Gmail
2. Generate an App Password
3. Use your Gmail and app password

---

## 🔍 Environment Validation

### Run Security Validation

```bash
# Validate your production environment
chmod +x scripts/security-validation.sh
./scripts/security-validation.sh
```

This script checks:
- ✅ All required environment variables are set
- ✅ Database and Redis connections work
- ✅ Security settings are properly configured
- ✅ LGPD compliance is enabled
- ✅ API keys are valid format

### Expected Results

```
🎆 VALIDATION RESULTS:
✅ Testes Passaram: 25
❌ Testes Falharam: 0
⚠️  Avisos: 2

🎯 Score de Segurança: 100% (25/25)
🎉 VALIDAÇÃO DE SEGURANÇA: APROVADA!
✅ Sistema pronto para deploy em produção
```

---

## 💿 Production Deployment

### Deploy with Docker Compose

```bash
# Set production environment
export NODE_ENV=production

# Load production variables
source .env.production.local

# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
./scripts/docker-health-check.sh
```

### Post-Deployment Verification

```bash
# Check all services are healthy
docker-compose -f docker-compose.prod.yml ps

# Test API endpoints
curl -f http://localhost:3000/health
curl -f http://localhost:3001  # Frontend

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## ⚠️ Important Security Notes

### 🚫 What NOT to do

- **Never commit** `.env.production.local` to Git
- **Never use** development keys in production
- **Never share** production secrets in chat/email
- **Never use** weak passwords or default values
- **Never expose** internal ports to the internet

### 🔒 What TO do

- **Use** a password manager for all secrets
- **Rotate** secrets every 90 days
- **Monitor** access logs regularly
- **Backup** your environment configuration securely
- **Test** the security validation script regularly

### 📨 Emergency Procedures

**If secrets are compromised:**

1. **Immediately rotate all affected secrets**
2. **Regenerate JWT and encryption keys**
3. **Update all affected services**
4. **Monitor for unauthorized access**
5. **Notify users if data may be affected (LGPD compliance)**

---

## 📞 Support

If you encounter issues during setup:

1. **Check the logs** first: `docker-compose logs`
2. **Run the validation script**: `./scripts/security-validation.sh`
3. **Verify all placeholders** are replaced with real values
4. **Check network connectivity** for external APIs
5. **Review the troubleshooting guide**: `/docs/TROUBLESHOOTING.md`

---

**🎆 You're ready for production! Deploy safely and securely.**