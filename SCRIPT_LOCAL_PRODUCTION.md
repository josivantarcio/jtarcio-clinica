# 🚀 **Script start-production.sh - Execução Local**

> **Data:** 29 de Agosto de 2025  
> **Status:** ✅ MODIFICADO PARA EXECUÇÃO LOCAL  
> **Mudança:** Docker → Serviços Locais

---

## 🎯 **Modificação Realizada:**

### **❌ ANTES - Docker Mode:**
```bash
# Iniciava containers Docker
start_docker_services() {
    COMPOSE_HTTP_TIMEOUT=120 docker-compose --env-file .env.production up -d postgres redis chromadb clickhouse n8n waha nginx pgladmin
}
```

### **✅ AGORA - Local Mode:**
```bash
# Inicia serviços localmente
start_local_services() {
    start_backend_service    # Backend na porta 3000
    start_frontend_service   # Frontend na porta 3001
}
```

---

## 🔧 **Funções Implementadas:**

### **📊 start_local_services():**
- ✅ **Verifica conflitos de porta** antes de iniciar
- ✅ **Inicia Backend** na porta 3000
- ✅ **Aguarda estabilização** (5s)
- ✅ **Inicia Frontend** na porta 3001  
- ✅ **Validação completa** de ambos os serviços

### **🔧 start_backend_service():**
```bash
# Instala dependências se necessário
npm install (se node_modules não existe)

# Gera cliente Prisma
npm run db:generate

# Inicia servidor em background
nohup npm run start > logs/backend.log 2>&1 &

# Valida resposta HTTP
curl -s http://localhost:3000/health (30 tentativas)
```

### **🌐 start_frontend_service():**
```bash
# Move para diretório frontend
cd frontend

# Instala dependências se necessário  
npm install (se node_modules não existe)

# Inicia servidor em background
nohup PORT=3001 npm run dev > ../logs/frontend.log 2>&1 &

# Valida resposta HTTP
curl -s http://localhost:3001 (30 tentativas)
```

---

## 🎯 **Vantagens da Execução Local:**

### **⚡ Performance:**
- **Sem overhead Docker** - Execução nativa
- **Hot reload** - Desenvolvimento mais rápido
- **Debug direto** - Logs em tempo real

### **🔧 Simplicidade:**
- **Sem containers** - Menos complexidade
- **Logs diretos** - `logs/backend.log`, `logs/frontend.log`
- **PIDs salvos** - Controle direto dos processos

### **🐛 Debug:**
- **Acesso direto aos processos**
- **Logs em arquivos separados**
- **Kill direto por PID**

---

## 📋 **Como Usar:**

### **🚀 Execução Completa:**
```bash
./scripts/start-production.sh
```

### **🧪 Teste Rápido:**
```bash
./scripts/test-start-local.sh
```

### **🛑 Parar Serviços:**
```bash
# Via PIDs (recomendado)
kill $BACKEND_PID $FRONTEND_PID

# Via processo
pkill -f "node.*300[01]"

# Via Ctrl+C no script principal
```

---

## 📊 **Saída do Script:**

### **✅ Sucesso:**
```
[SUCCESS] Backend iniciado com sucesso na porta 3000
[SUCCESS] Frontend iniciado com sucesso na porta 3001  
[SUCCESS] Serviços locais iniciados com sucesso (Backend: 3000, Frontend: 3001)

SERVIÇOS DISPONÍVEIS
   Frontend:     http://localhost:3001 (Local)
   Backend:      http://localhost:3000 (Local)
   API Docs:     http://localhost:3000/documentation

Backend PID:  12345
Frontend PID: 12346
Arquitetura:  Híbrida (Docker + Local)
```

### **⚠️ Controle:**
```bash
# Parar Backend
kill 12345

# Parar Frontend  
kill 12346

# Parar Todos
pkill -f "node.*300[01]"
```

---

## 🔍 **Validação Automática:**

### **📋 Health Checks:**
1. **Backend**: `curl -s http://localhost:3000/health`
2. **Frontend**: `curl -s http://localhost:3001`
3. **Tentativas**: 30 tentativas x 2s = 60s timeout
4. **Logs**: Salvos em `logs/backend.log` e `logs/frontend.log`

### **🎯 Monitoramento:**
- **PIDs salvos** em variáveis globais
- **Processo em background** com `nohup`
- **Logs contínuos** em arquivos separados
- **Cleanup automático** com Ctrl+C

---

## 🏆 **Resultado:**

**✅ SCRIPT MODIFICADO COM SUCESSO**
- **Execução**: 100% Local (sem Docker)
- **Backend**: Porta 3000 com validação
- **Frontend**: Porta 3001 com hot reload
- **Logs**: Arquivos separados para debug
- **Controle**: PIDs salvos para stop/restart

**🎯 PRONTO PARA PRODUÇÃO LOCAL!**