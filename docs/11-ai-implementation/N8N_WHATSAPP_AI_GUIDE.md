# 🤖 N8N + WhatsApp AI Integration - Guia Completo

## 📋 **Como Acessar o N8N**

### 🚀 **1. Iniciar o N8N**
```bash
# Iniciar todos os serviços
docker-compose up -d

# Ou apenas o N8N (após postgres/redis)
docker-compose up postgres redis -d
docker-compose up n8n -d
```

### 🌐 **2. Acesso Web**
- **URL**: http://localhost:5678
- **Usuário**: `admin`
- **Senha**: `admin123`
- **Protocolo**: HTTP (desenvolvimento)

### 🔧 **3. Configurações Disponíveis**

#### 🗄️ **Banco de Dados Integrado**
- **Tipo**: PostgreSQL
- **Host**: `postgres` (container) / `localhost:5433` (host)
- **Database**: `eo_clinica_db`
- **Usuário**: `clinic_user`
- **Senha**: `clinic_password`
- **Tabelas disponíveis**: Users, Doctors, Appointments, Specialties

#### 📦 **Redis Queue**
- **Host**: `redis` (container) / `localhost:6380` (host)
- **Porta**: 6379 (interna) / 6380 (externa)
- **Uso**: Filas de execução, cache de sessões

#### 🔗 **Webhooks**
- **Base URL**: http://localhost:5678/
- **Webhook de teste**: http://localhost:5678/webhook/test
- **WhatsApp Webhook**: http://localhost:5678/webhook/whatsapp

## 🤖 **Dados Disponíveis para WhatsApp AI**

### 👥 **Tabela Users (Pacientes)**
```sql
-- Campos disponíveis:
SELECT id, name, email, phone, cpf, birth_date, created_at 
FROM users 
WHERE role = 'PATIENT'
```

### 👨‍⚕️ **Tabela Doctors**
```sql
-- Médicos disponíveis:
SELECT u.name, u.email, u.phone, d.crm, s.name as specialty
FROM users u
JOIN doctors d ON u.id = d.user_id
JOIN specialties s ON d.specialty_id = s.id
WHERE u.role = 'DOCTOR' AND u.active = true
```

### 📅 **Tabela Appointments**
```sql
-- Agendamentos:
SELECT id, patient_id, doctor_id, appointment_date, 
       status, notes, created_at
FROM appointments
WHERE status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
```

### 🏥 **Tabela Specialties**
```sql
-- Especialidades médicas:
SELECT id, name, description, price, duration
FROM specialties 
WHERE active = true
```

## 🔄 **Workflows WhatsApp AI Recomendados**

### 📱 **1. Workflow: Receber Mensagem WhatsApp**
```json
{
  "name": "WhatsApp Message Processor",
  "nodes": [
    {
      "name": "Webhook WhatsApp",
      "type": "n8n-nodes-base.webhook",
      "webhookId": "whatsapp-incoming",
      "httpMethod": "POST"
    },
    {
      "name": "Extract Message Data",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            {
              "name": "phone_number",
              "value": "={{ $json.entry[0].changes[0].value.contacts[0].wa_id }}"
            },
            {
              "name": "message_text", 
              "value": "={{ $json.entry[0].changes[0].value.messages[0].text.body }}"
            },
            {
              "name": "message_type",
              "value": "={{ $json.entry[0].changes[0].value.messages[0].type }}"
            }
          ]
        }
      }
    }
  ]
}
```

### 🤖 **2. Workflow: Processar com Gemini AI**
```json
{
  "name": "Gemini AI Medical Assistant",
  "nodes": [
    {
      "name": "Call Gemini API",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent",
        "method": "POST",
        "authentication": "genericCredentialType",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "contents": [{
            "parts": [{
              "text": "Você é um assistente médico profissional. Responda em português: {{ $json.message_text }}"
            }]
          }],
          "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048
          }
        }
      }
    }
  ]
}
```

### 📅 **3. Workflow: Verificar Agenda Disponível**
```json
{
  "name": "Check Doctor Availability",
  "nodes": [
    {
      "name": "Query Available Doctors",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT d.id, u.name, s.name as specialty, s.price FROM doctors d JOIN users u ON d.user_id = u.id JOIN specialties s ON d.specialty_id = s.id WHERE u.active = true AND s.name ILIKE '%{{ $json.specialty }}%'"
      }
    },
    {
      "name": "Check Available Times",
      "type": "n8n-nodes-base.postgres", 
      "parameters": {
        "query": "SELECT appointment_date FROM appointments WHERE doctor_id = {{ $json.doctor_id }} AND appointment_date::date = '{{ $json.requested_date }}'::date"
      }
    }
  ]
}
```

### 📞 **4. Workflow: Criar Agendamento**
```json
{
  "name": "Create Appointment",
  "nodes": [
    {
      "name": "Find or Create Patient",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO users (name, phone, role) VALUES ('{{ $json.patient_name }}', '{{ $json.phone_number }}', 'PATIENT') ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id"
      }
    },
    {
      "name": "Create Appointment",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES ({{ $json.patient_id }}, {{ $json.doctor_id }}, '{{ $json.appointment_date }}', 'SCHEDULED', 'Agendado via WhatsApp AI') RETURNING id"
      }
    }
  ]
}
```

## 🔗 **Integrações Disponíveis**

### 📡 **APIs do Sistema EO Clínica**
- **Base URL**: http://host.docker.internal:3000/api/v1
- **Auth**: Bearer token (JWT)
- **Endpoints**:
  - `GET /users` - Listar pacientes
  - `GET /doctors` - Listar médicos
  - `GET /appointments` - Listar consultas
  - `POST /appointments` - Criar consulta
  - `GET /specialties` - Listar especialidades

### 🎤 **WAHA (WhatsApp HTTP API)**
- **URL**: http://localhost:3001 (quando ativo)
- **Endpoints**:
  - `POST /api/sendText` - Enviar mensagem texto
  - `POST /api/sendImage` - Enviar imagem
  - `GET /api/sessions` - Listar sessões

### 🤖 **Gemini Pro AI**
- **API**: https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent
- **Chave**: Configurada em GEMINI_API_KEY
- **Modelo**: gemini-1.5-pro-002
- **Uso**: Processamento de linguagem natural médica

## 📊 **Variáveis de Ambiente N8N**

```bash
# Configurações básicas
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123

# Database
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_DATABASE=eo_clinica_db
DB_POSTGRESDB_USER=clinic_user
DB_POSTGRESDB_PASSWORD=clinic_password

# Webhooks
WEBHOOK_URL=http://localhost:5678/

# Security
N8N_ENCRYPTION_KEY=eo-clinica-n8n-encryption-key-2024
```

## 🧪 **Cenários de Teste**

### 📱 **1. Teste de Mensagem WhatsApp**
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

### 🏥 **2. Teste de Especialidade**
```json
{
  "specialty": "cardiologia",
  "patient_name": "João Silva",
  "phone_number": "5511999999999",
  "requested_date": "2024-08-30"
}
```

### 📅 **3. Teste de Agendamento**
```json
{
  "patient_id": 1,
  "doctor_id": 1,
  "appointment_date": "2024-08-30 14:00:00",
  "notes": "Consulta de rotina via WhatsApp"
}
```

## 🔧 **Comandos Úteis**

```bash
# Iniciar N8N
docker-compose up n8n -d

# Ver logs do N8N
docker logs eo-clinica2_n8n_1 -f

# Acessar container N8N
docker exec -it eo-clinica2_n8n_1 /bin/sh

# Backup workflows
docker exec eo-clinica2_n8n_1 n8n export:workflow --all --output=/tmp/workflows.json

# Restaurar workflows  
docker exec eo-clinica2_n8n_1 n8n import:workflow --input=/tmp/workflows.json
```

## 🎯 **Próximos Passos**

1. **Iniciar N8N**: `docker-compose up n8n -d`
2. **Acessar**: http://localhost:5678 (admin/admin123)
3. **Importar workflows** da seção de exemplos
4. **Configurar credenciais** (Gemini API, WhatsApp)
5. **Testar integração** com dados reais

---

## 🚀 **Status**: Pronto para configuração e uso com WhatsApp AI Integration!

> 💡 **Dica**: Use os dados de exemplo acima para criar seus primeiros workflows e integrar com o sistema EO Clínica.