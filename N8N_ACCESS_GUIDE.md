# 🚀 N8N Acessível - Instruções Completas

## ✅ **STATUS: N8N ATIVO E FUNCIONANDO**

### 🌐 **Acesso via Tunnel**
- **URL**: https://n5fnplagk0urkw9rjwnm5rle.hooks.n8n.cloud/
- **Usuário**: josivantarcio@msn.com
- **Senha**: Admin123!

---

## 📋 **PASSO A PASSO PARA IMPORTAR WORKFLOWS**

### 1. 🌐 **Acessar N8N**
1. Abra seu navegador
2. Acesse: **https://n5fnplagk0urkw9rjwnm5rle.hooks.n8n.cloud/**
3. Faça login com:
   - **Email**: `josivantarcio@msn.com`
   - **Senha**: `Admin123!`

### 2. 📥 **Importar Workflows WhatsApp AI**

#### **Método Manual (Recomendado):**

**2.1. Workflow 1: WhatsApp Message Processor**
1. No N8N, clique em **"Workflows"** no menu lateral
2. Clique no botão **"New Workflow"**
3. Delete o node padrão
4. Clique em **"Add node"** e adicione **"Webhook"**
   - Path: `whatsapp-incoming`
   - HTTP Method: `POST`
5. Adicione **"Set"** node:
   - phone_number: `={{ $json.entry[0].changes[0].value.contacts[0].wa_id }}`
   - message_text: `={{ $json.entry[0].changes[0].value.messages[0].text.body }}`
   - message_type: `={{ $json.entry[0].changes[0].value.messages[0].type }}`
6. Adicione **"HTTP Request"** node:
   - URL: `http://localhost:3000/api/v1/ai/process-message`
   - Method: `POST`
   - Headers: Content-Type: `application/json`
   - Body: JSON com phone_number, message, message_type
7. Conecte os nodes e salve como **"WhatsApp AI - Message Processor"**

**2.2. Workflow 2: Appointment Scheduler**
1. Criar novo workflow
2. **Webhook** node: path `schedule-appointment`
3. **HTTP Request** para buscar médicos disponíveis
4. **HTTP Request** para criar agendamento
5. Salvar como **"WhatsApp AI - Appointment Scheduler"**

**2.3. Workflow 3: Emergency Escalation**
1. Criar novo workflow  
2. **Webhook** node: path `emergency-detected`
3. **HTTP Request** para notificar equipe médica
4. Salvar como **"WhatsApp AI - Emergency Escalation"**

### 3. 🔧 **Configurar Integração com EO Clínica API**

**3.1. Configurar URLs dos endpoints:**
- **Base API**: `http://localhost:3000/api/v1`
- **Process Message**: `/ai/process-message`
- **Create Appointment**: `/appointments`
- **Emergency Notification**: `/notifications/emergency`

**3.2. Testar Webhooks:**
- **Message Processor**: https://n5fnplagk0urkw9rjwnm5rle.hooks.n8n.cloud/webhook/whatsapp-incoming
- **Appointment Scheduler**: https://n5fnplagk0urkw9rjwnm5rle.hooks.n8n.cloud/webhook/schedule-appointment  
- **Emergency Escalation**: https://n5fnplagk0urkw9rjwnm5rle.hooks.n8n.cloud/webhook/emergency-detected

---

## 🧪 **DADOS DE TESTE**

### 📱 **Teste 1: Mensagem WhatsApp**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "contacts": [{"wa_id": "5511999999999"}],
        "messages": [{
          "type": "text", 
          "text": {"body": "Olá, gostaria de agendar uma consulta"}
        }]
      }
    }]
  }]
}
```

### 📅 **Teste 2: Agendamento**
```json
{
  "patient_name": "João Silva",
  "phone_number": "5511999999999",
  "specialty": "cardiologia",
  "requested_date": "2024-08-30"
}
```

### 🚨 **Teste 3: Emergência**
```json
{
  "phone_number": "5511999999999",
  "message": "Estou com dor no peito muito forte",
  "urgency_level": "HIGH"
}
```

---

## ⚡ **INTEGRAÇÃO COM EO CLÍNICA**

### 🔗 **APIs Disponíveis**
Quando a API EO Clínica estiver rodando (PORT 3000):

1. **Processar Mensagem AI**: `POST /api/v1/ai/process-message`
2. **Criar Agendamento**: `POST /api/v1/appointments` 
3. **Notificação Emergência**: `POST /api/v1/notifications/emergency`
4. **Listar Médicos**: `GET /api/v1/doctors`
5. **Listar Especialidades**: `GET /api/v1/specialties`

### 🧪 **Para testar com API local:**
1. Inicie a API EO Clínica: `PORT=3000 npx tsx src/index.ts`
2. Teste os workflows no N8N
3. Verifique logs da API para confirmar recebimento

---

## 📊 **STATUS ATUAL**

### ✅ **Funcionando:**
- ✅ N8N Tunnel ativo: https://n5fnplagk0urkw9rjwnm5rle.hooks.n8n.cloud/
- ✅ Autenticação configurada (josivantarcio@msn.com / Admin123!)
- ✅ SQLite database funcional
- ✅ Webhooks prontos para configuração

### 🔄 **Próximos Passos:**
1. **Acessar N8N** e fazer login
2. **Criar workflows** manualmente (instruções acima)
3. **Testar integração** com dados de exemplo
4. **Conectar API EO Clínica** quando necessário

---

## 🔧 **Comandos Úteis**

```bash
# Ver status N8N
tail -f n8n-tunnel.log

# Parar N8N
pkill -f n8n

# Verificar processos N8N
ps aux | grep n8n
```

---

## 🎯 **ACESSO IMEDIATO**

**🌐 URL**: https://n5fnplagk0urkw9rjwnm5rle.hooks.n8n.cloud/
**👤 Login**: josivantarcio@msn.com
**🔐 Senha**: Admin123!

**O N8N está funcionando e pronto para uso!** 🚀