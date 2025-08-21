# 🚀 EO Clínica - Início Rápido (5 minutos)

> **Tenha o sistema funcionando em menos de 5 minutos!**

---

## ⏱️ **Setup Rápido - 5 Passos**

### **1️⃣ Pré-requisitos (30s)**
```bash
# Verificar se tem tudo instalado
node --version    # v18+ requerido
npm --version     # v8+ requerido  
docker --version  # v20+ requerido
```

### **2️⃣ Clone e Instale (2min)**
```bash
# Clone o repositório
git clone https://github.com/josivantarcio/eo-clinica.git
cd eo-clinica

# Instale dependências do backend
npm install

# Instale dependências do frontend
cd frontend && npm install && cd ..
```

### **3️⃣ Configure Ambiente (30s)**
```bash
# Copie o arquivo de ambiente
cp .env.example .env

# ✅ O arquivo já vem configurado para desenvolvimento local
# ✅ Não precisa alterar nada inicialmente
```

### **4️⃣ Inicie o Sistema (1min)**
```bash
# Iniciar tudo automaticamente (RECOMENDADO)
./scripts/start-production.sh

# OU iniciar manualmente:
# Terminal 1: Infraestrutura
docker-compose up -d postgres redis

# Terminal 2: Backend  
npm start

# Terminal 3: Frontend
cd frontend && npm run dev
```

### **5️⃣ Teste o Acesso (30s)**
```bash
# Abra no navegador:
🌐 Frontend: http://localhost:3001
📡 Backend:  http://localhost:3000
📚 API Docs: http://localhost:3000/documentation

# Teste rápido
curl http://localhost:3000/health
# Resposta esperada: {"status":"ok","timestamp":"..."}
```

---

## ✅ **Sistema Funcionando!**

### **🎯 Usuários de Teste**
```
👨‍💼 Admin:        admin@eoclinica.com.br        / Admin123!
👨‍⚕️ Médico:       dr.silva@eoclinica.com.br     / Admin123!
👩‍💼 Recepcionista: recepcao@eoclinica.com.br    / Admin123!
👤 Paciente:     paciente@example.com         / Admin123!
```

### **🔗 Links Importantes**
- **Dashboard:** http://localhost:3001/dashboard
- **Agendamentos:** http://localhost:3001/appointments
- **Módulo Financeiro:** http://localhost:3001/financial
- **Gestão Usuários:** http://localhost:3001/users

---

## 🚨 **Problemas Comuns**

### **❌ Porta já em uso**
```bash
# Matar processos nas portas
pkill -f "node.*3000"
pkill -f "node.*3001"
lsof -ti:3000,3001 | xargs kill -9
```

### **❌ Banco não conecta**
```bash
# Verificar Docker
docker ps
# Deve mostrar postgres e redis rodando

# Resetar banco se necessário
docker-compose down
docker volume prune -f
docker-compose up -d postgres redis
```

### **❌ Dependências faltando**
```bash
# Reinstalar tudo
rm -rf node_modules frontend/node_modules
npm install
cd frontend && npm install && cd ..
```

---

## 📚 **Próximos Passos**

### **🎓 Para Aprender Mais**
1. **📖 [Arquitetura](../02-architecture/OVERVIEW.md)** - Entender o sistema
2. **💻 [Desenvolvimento](../03-development/DEVELOPMENT_GUIDE.md)** - Começar a desenvolver
3. **🔌 [API](../06-api/API_OVERVIEW.md)** - Integrar com a API
4. **🔒 [Segurança](../05-security/SECURITY_OVERVIEW.md)** - Configurações de segurança

### **🛠️ Para Customizar**
1. **🎨 Frontend:** Modificar em `frontend/src/`
2. **⚙️ Backend:** Modificar em `src/`
3. **🗃️ Banco:** Schemas em `src/database/schema.prisma`
4. **🔧 Config:** Variáveis em `.env`

### **🚀 Para Produção**
1. **📋 [Deploy Guide](../04-deployment/PRODUCTION_DEPLOYMENT.md)**
2. **🔒 [Segurança](../05-security/LGPD_COMPLIANCE.md)**
3. **📊 [Monitoramento](../04-deployment/MONITORING.md)**

---

## 🎉 **Parabéns!**

Você tem agora um **sistema completo de agendamento médico com IA** rodando localmente! 

O EO Clínica está pronto para:
- ✅ Gerenciar pacientes e médicos
- ✅ Fazer agendamentos inteligentes
- ✅ Processar pagamentos
- ✅ Chat com IA médica
- ✅ Relatórios e analytics
- ✅ Compliance LGPD

**Tempo total:** ⏱️ Menos de 5 minutos

---

*Precisando de ajuda? Consulte [📚 Troubleshooting](../08-troubleshooting/COMMON_ISSUES.md)*