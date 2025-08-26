# EO CLÍNICA - API Documentation
## Complete REST API Reference - Version 1.3.4

### 🌐 BASE URL
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.eoclinica.com.br/api/v1`

### 🆕 LATEST ADDITIONS - Settings API
Adicionados endpoints completos para gerenciamento de configurações de usuário:
- **GET** `/auth/me` - Perfil do usuário autenticado
- **GET** `/users/profile` - Perfil completo com configurações
- **PATCH** `/users/profile` - Atualizar perfil e settings
- **JWT Middleware** - Sistema de autenticação completo
- **Production**: `https://api.eo-clinica.com/api/v1`

### 🔐 AUTHENTICATION

All protected endpoints require JWT authentication:

```bash
Authorization: Bearer <jwt_token>
```

**Token Lifecycle:**
- **Access Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 7 days
- **MFA Required**: For admin operations

---

## 🔑 AUTHENTICATION ENDPOINTS

### POST `/auth/login`
User authentication with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "PATIENT",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    },
    "mfaRequired": false
  }
}
```

### POST `/auth/register`
Register new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+5511999999999",
  "role": "PATIENT"
}
```

### POST `/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

### POST `/auth/logout`
Invalidate user session and tokens.

### POST `/auth/forgot-password`
Request password reset via email.

### POST `/auth/reset-password`
Reset password using reset token.

---

## 👤 USER MANAGEMENT ENDPOINTS

### GET `/users/me`
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "PATIENT",
    "status": "ACTIVE",
    "patientProfile": {
      "allergies": ["Penicilina"],
      "medications": ["Ibuprofeno"]
    }
  }
}
```

### PATCH `/users/me`
Update current user profile.

### GET `/users` 🔒 *Admin Only*
List all users with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `role`: Filter by user role
- `status`: Filter by user status
- `search`: Search by name or email

### GET `/users/:id` 🔒 *Admin/Self Only*
Get user details by ID.

### PATCH `/users/:id` 🔒 *Admin/Self Only*
Update user information.

### DELETE `/users/:id` 🔒 *Admin Only*
Soft delete user account.

---

## 🏥 APPOINTMENT ENDPOINTS

### POST `/appointments`
Create new appointment.

**Request:**
```json
{
  "doctorId": "uuid",
  "specialtyId": "uuid",
  "scheduledAt": "2024-12-10T14:30:00Z",
  "type": "CONSULTATION",
  "reason": "Consulta de rotina",
  "symptoms": "Dor de cabeça frequente"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "doctorId": "uuid",
    "specialtyId": "uuid",
    "scheduledAt": "2024-12-10T14:30:00Z",
    "endTime": "2024-12-10T15:00:00Z",
    "status": "SCHEDULED",
    "type": "CONSULTATION",
    "reason": "Consulta de rotina",
    "confirmationCode": "ABC123"
  }
}
```

### GET `/appointments`
List appointments with filters.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status
- `doctorId`: Filter by doctor
- `patientId`: Filter by patient (auto-applied for patients)
- `startDate`, `endDate`: Date range filter
- `specialtyId`: Filter by specialty

### GET `/appointments/:id`
Get appointment details.

### PATCH `/appointments/:id`
Update appointment information.

### POST `/appointments/:id/reschedule`
Reschedule appointment to new time.

**Request:**
```json
{
  "newScheduledAt": "2024-12-11T15:00:00Z",
  "reason": "Conflito de agenda"
}
```

### POST `/appointments/:id/cancel`
Cancel appointment.

**Request:**
```json
{
  "reason": "Não pode comparecer",
  "cancelledBy": "PATIENT"
}
```

### POST `/appointments/:id/confirm`
Confirm appointment attendance.

### POST `/appointments/:id/complete`
Mark appointment as completed with clinical notes.

**Request:**
```json
{
  "diagnosis": "Cefaleia tensional",
  "prescription": "Ibuprofeno 600mg",
  "notes": "Paciente apresentou melhora dos sintomas",
  "followUpRequired": true
}
```

---

## 📅 AVAILABILITY ENDPOINTS

### GET `/availability/doctor/:doctorId`
Get doctor availability for scheduling.

**Query Parameters:**
- `startDate`: Start date for availability check
- `endDate`: End date (default: 30 days from start)
- `duration`: Appointment duration in minutes

**Response:**
```json
{
  "success": true,
  "data": {
    "doctorId": "uuid",
    "availableSlots": [
      {
        "date": "2024-12-10",
        "slots": [
          {
            "startTime": "14:30",
            "endTime": "15:00",
            "available": true
          }
        ]
      }
    ]
  }
}
```

### GET `/availability/specialty/:specialtyId`
Get availability by medical specialty.

### POST `/availability/bulk-check`
Check availability for multiple doctors/times.

**Request:**
```json
{
  "requests": [
    {
      "doctorId": "uuid",
      "date": "2024-12-10",
      "startTime": "14:30",
      "duration": 30
    }
  ]
}
```

---

## 🏥 SPECIALTIES ENDPOINTS

### GET `/specialties`
List all medical specialties.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Cardiologia",
      "description": "Especialidade médica cardiovascular",
      "duration": 45,
      "isActive": true,
      "doctorsCount": 5
    }
  ]
}
```

### GET `/specialties/:id`
Get specialty details.

### GET `/specialties/:id/doctors`
Get doctors by specialty.

### POST `/specialties` 🔒 *Admin Only*
Create new medical specialty.

### PATCH `/specialties/:id` 🔒 *Admin Only*
Update specialty information.

---

## 🤖 AI CHAT ENDPOINTS

### POST `/chat/conversations`
Start new conversation with AI.

**Request:**
```json
{
  "message": "Olá, gostaria de agendar uma consulta"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "message": {
      "id": "uuid",
      "role": "assistant",
      "content": "Olá! Posso ajudá-lo com o agendamento. Qual especialidade você precisa?"
    }
  }
}
```

### POST `/chat/conversations/:id/messages`
Send message to existing conversation.

### GET `/chat/conversations/:id/messages`
Get conversation message history.

### GET `/chat/conversations`
List user conversations.

### DELETE `/chat/conversations/:id`
Delete conversation and messages.

---

## 📧 NOTIFICATION ENDPOINTS

### GET `/notifications`
Get user notifications.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (PENDING, SENT, DELIVERED, FAILED)
- `type`: Filter by type (EMAIL, SMS, WHATSAPP, PUSH)

### PATCH `/notifications/:id/read`
Mark notification as read.

### POST `/notifications/preferences`
Update notification preferences.

**Request:**
```json
{
  "emailEnabled": true,
  "smsEnabled": false,
  "whatsappEnabled": true,
  "appointmentReminders": true,
  "marketingCommunications": false
}
```

---

## 🔍 AUDIT ENDPOINTS

### GET `/audit/logs` 🔒 *Admin Only*
Get audit logs with filters.

**Query Parameters:**
- `userId`: Filter by user
- `action`: Filter by action type
- `resource`: Filter by resource type
- `startDate`, `endDate`: Date range
- `page`, `limit`: Pagination

### GET `/audit/my-history`
Get current user's audit history.

### GET `/audit/statistics` 🔒 *Admin Only*
Get audit statistics and analytics.

### GET `/audit/export` 🔒 *Admin Only*
Export audit logs (CSV/JSON).

---

## 🔐 SECURITY ENDPOINTS

### POST `/security/mfa/setup`
Setup Multi-Factor Authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "data:image/png;base64,...",
    "backupCodes": ["12345678", "87654321"]
  }
}
```

### POST `/security/mfa/verify`
Verify and enable MFA.

**Request:**
```json
{
  "token": "123456"
}
```

### POST `/security/mfa/authenticate`
Authenticate with MFA token.

### POST `/security/mfa/sms`
Send SMS code for authentication.

### DELETE `/security/mfa/disable`
Disable MFA for account.

---

## 📊 LGPD COMPLIANCE ENDPOINTS

### POST `/lgpd/consent`
Record user consent for data processing.

**Request:**
```json
{
  "consentType": "MEDICAL_DATA_PROCESSING",
  "granted": true,
  "version": "1.0"
}
```

### GET `/lgpd/consents`
Get user consent history.

### POST `/lgpd/data-export`
Request data export (portability).

**Request:**
```json
{
  "requestType": "PORTABILITY",
  "requestedData": ["identificationData", "medicalData", "appointmentData"]
}
```

### POST `/lgpd/data-deletion`
Request data deletion/anonymization.

**Request:**
```json
{
  "requestType": "ANONYMIZATION",
  "reason": "Não utiliza mais os serviços"
}
```

### GET `/lgpd/data-mapping`
Get complete data mapping for user.

---

## 📈 ANALYTICS ENDPOINTS

### GET `/analytics/dashboard` 🔒 *Doctor/Admin*
Get dashboard analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": {
      "total": 150,
      "thisWeek": 25,
      "confirmed": 120,
      "cancelled": 15
    },
    "patients": {
      "total": 85,
      "new": 5,
      "returning": 20
    },
    "revenue": {
      "thisMonth": 15000.00,
      "lastMonth": 12500.00,
      "growth": 20
    }
  }
}
```

### GET `/analytics/appointments` 🔒 *Doctor/Admin*
Get appointment analytics.

### GET `/analytics/patients` 🔒 *Doctor/Admin*
Get patient analytics.

### GET `/analytics/revenue` 🔒 *Admin Only*
Get revenue analytics.

---

## 🔄 N8N WORKFLOW ENDPOINTS

### GET `/api/n8n/workflows` 🔒 *Admin Only*
Lista workflows N8N ativos com informações detalhadas.

**Headers:**
```
Authorization: Bearer [admin_token]
```

**Query Parameters:**
- `status` (opcional): Filtrar por status (active, inactive, error)
- `category` (opcional): Filtrar por categoria (queue, notifications, appointments)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "gestao-fila-espera",
      "name": "Gestão Fila de Espera",
      "active": true,
      "category": "queue",
      "lastExecuted": "2024-12-12T10:00:00.000Z",
      "successRate": 98.5,
      "description": "Automatiza notificações de vagas disponíveis",
      "triggers": ["slot_available"],
      "nodes": 13,
      "avgExecutionTime": 2500
    }
  ],
  "stats": {
    "total": 8,
    "active": 6,
    "inactive": 2
  }
}
```

### POST `/api/n8n/workflows/:id/trigger` 🔒 *Admin Only*
Dispara manualmente um workflow N8N específico.

**Headers:**
```
Authorization: Bearer [admin_token]
Content-Type: application/json
```

**Request Body:**
```json
{
  "inputData": {
    "specialtyId": "spec_101",
    "date": "2024-12-15T14:00:00.000Z",
    "duration": 30,
    "reason": "manual_trigger"
  },
  "waitForExecution": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow iniciado com sucesso",
  "data": {
    "executionId": "exec_456",
    "workflowId": "gestao-fila-espera",
    "status": "running",
    "startedAt": "2024-12-12T10:00:00.000Z"
  }
}
```

### GET `/api/n8n/executions` 🔒 *Admin Only*
Recupera histórico de execuções de workflows N8N.

**Headers:**
```
Authorization: Bearer [admin_token]
```

**Query Parameters:**
- `workflowId` (opcional): Filtrar por workflow específico
- `status` (opcional): Filtrar por status (success, error, running, canceled)
- `dateFrom` (opcional): Data de início (ISO 8601)
- `dateTo` (opcional): Data de fim (ISO 8601)
- `page` (opcional): Página (padrão: 1)
- `limit` (opcional): Limite por página (padrão: 20, máx: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "exec_456",
      "workflowId": "gestao-fila-espera",
      "workflowName": "Gestão Fila de Espera",
      "status": "success",
      "startedAt": "2024-12-12T10:00:00.000Z",
      "finishedAt": "2024-12-12T10:02:30.000Z",
      "executionTime": 2500,
      "inputData": {
        "specialtyId": "spec_101",
        "date": "2024-12-15T14:00:00.000Z"
      },
      "outputData": {
        "notifiedPatients": 1,
        "channelsUsed": ["email", "whatsapp"]
      },
      "nodeExecutions": 13,
      "errorMessage": null
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### GET `/api/n8n/executions/:id/details` 🔒 *Admin Only*
Detalhes específicos de uma execução de workflow.

**Headers:**
```
Authorization: Bearer [admin_token]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exec_456",
    "workflowId": "gestao-fila-espera",
    "status": "success",
    "startedAt": "2024-12-12T10:00:00.000Z",
    "finishedAt": "2024-12-12T10:02:30.000Z",
    "executionTime": 2500,
    "nodeExecutions": [
      {
        "nodeName": "Webhook Vaga Disponível",
        "nodeType": "webhook",
        "status": "success",
        "executionTime": 45,
        "inputData": {...},
        "outputData": {...}
      }
    ],
    "logs": [
      {
        "level": "info",
        "message": "Workflow iniciado com dados válidos",
        "timestamp": "2024-12-12T10:00:00.000Z"
      }
    ]
  }
}
```

### GET `/api/n8n/health`
Verifica saúde do sistema N8N e conectividade.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "n8nVersion": "1.15.0",
    "apiConnectivity": true,
    "webhooksActive": true,
    "lastWorkflowExecution": "2024-12-12T10:00:00.000Z",
    "activeWorkflows": 6,
    "queueLength": 0,
    "credentialsValid": {
      "whatsapp": true,
      "twilio": true,
      "smtp": true
    }
  }
}
```

### 🔗 N8N Integration Endpoints para Fila de Espera

#### POST `/api/n8n/webhooks/slot-available`
Webhook do sistema EO Clínica para N8N quando vaga fica disponível.

**Headers:**
```
Content-Type: application/json
X-N8N-Webhook-Secret: [webhook_secret_from_env]
```

**Request Body:**
```json
{
  "specialtyId": "spec_101",
  "specialtyName": "Cardiologia", 
  "doctorId": "doc_789",
  "doctorName": "Dr. João Silva",
  "availableDate": "2024-12-15T14:00:00.000Z",
  "duration": 30,
  "reason": "cancellation",
  "urgency": "normal",
  "metadata": {
    "originalAppointmentId": "apt_123",
    "cancellationTime": "2024-12-12T09:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow de fila iniciado",
  "data": {
    "executionId": "exec_789",
    "queueProcessed": true,
    "notificationsSent": 1
  }
}
```

#### GET `/api/n8n/queue/specialty/:specialtyId`
Custom node endpoint para buscar fila de espera.

**Headers:**
```
Authorization: Bearer [n8n_api_key]
```

**Query Parameters:**
- `limit` (opcional): Máximo registros (padrão: 50)
- `priority` (opcional): Filtro prioridade (EMERGENCY, HIGH, MEDIUM, LOW)
- `includeNotified` (opcional): Incluir já notificados 24h (padrão: false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "queue_123",
      "patientId": "pat_456", 
      "patientName": "Maria Santos",
      "patientEmail": "maria@email.com",
      "patientPhone": "+5511999999999",
      "priority": "HIGH",
      "queuedAt": "2024-12-01T10:00:00.000Z",
      "waitingDays": 7.5,
      "age": 45,
      "specialNeeds": false,
      "previousCancellations": 0,
      "noShowCount": 0,
      "lastNotified": null,
      "preferredChannels": ["email", "whatsapp"],
      "priorityScore": 127.5
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 50
  },
  "queueStats": {
    "emergency": 2,
    "high": 5, 
    "medium": 6,
    "low": 2,
    "avgWaitingDays": 5.3
  }
}
```

#### PATCH `/api/n8n/queue/:patientId/notified`
Marca paciente como notificado via N8N workflow.

**Headers:**
```
Authorization: Bearer [n8n_api_key]
Content-Type: application/json
```

**Request Body:**
```json
{
  "notificationId": "queue_123_456789",
  "notifiedAt": "2024-12-12T10:00:00.000Z",
  "channels": ["email", "sms", "whatsapp"],
  "responseDeadline": "2024-12-12T12:00:00.000Z",
  "slot": {
    "specialtyId": "spec_101",
    "doctorId": "doc_789", 
    "date": "2024-12-15T14:00:00.000Z",
    "duration": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Paciente marcado como notificado",
  "data": {
    "patientId": "pat_456",
    "notificationId": "queue_123_456789",
    "followupScheduled": true,
    "responseWindow": "2 horas"
  }
}
```

#### POST `/api/n8n/queue/response/:notificationId`
Processa resposta do paciente (aceitar/recusar vaga).

**Headers:**
```
Authorization: Bearer [n8n_api_key]
Content-Type: application/json
```

**Request Body:**
```json
{
  "response": "accept",
  "patientId": "pat_456",
  "respondedAt": "2024-12-12T11:30:00.000Z", 
  "channel": "whatsapp",
  "metadata": {
    "userAgent": "WhatsApp/2.23.20.0",
    "source": "n8n_webhook"
  }
}
```

**Response (Accept):**
```json
{
  "success": true,
  "message": "Vaga aceita - Agendamento iniciado",
  "data": {
    "notificationId": "queue_123_456789",
    "response": "accept", 
    "nextStep": "schedule_appointment",
    "appointmentWindow": "15 minutos",
    "windowExpiresAt": "2024-12-12T13:45:00.000Z",
    "appointmentUrl": "https://eo-clinica.com/agendar/queue_123_456789"
  }
}
```

**Response (Decline):**
```json
{
  "success": true,
  "message": "Vaga recusada - Próximo paciente será notificado",
  "data": {
    "notificationId": "queue_123_456789",
    "response": "decline",
    "nextStep": "notify_next_patient",
    "nextPatient": {
      "id": "pat_789",
      "name": "José Santos",
      "priority": "MEDIUM"
    }
  }
}
```

---

## ⚡ WEBHOOK ENDPOINTS

### 📱 WhatsApp Business Integration

#### POST `/api/webhooks/whatsapp`
Webhook do WhatsApp Business API para receber status de mensagens e respostas dos usuários.

**Headers:**
```
Content-Type: application/json
X-Hub-Signature-256: [signature_from_meta]
```

**Request Body (Message Status):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550123456",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "wamid.gBGGSFcCNhA3AG0iAgKYjqcHE1Y=",
                "status": "delivered",
                "timestamp": "1702380123",
                "recipient_id": "5511999999999",
                "conversation": {
                  "id": "CONVERSATION_ID",
                  "expiration_timestamp": "1702466523"
                },
                "pricing": {
                  "billable": true,
                  "pricing_model": "CBP",
                  "category": "template"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Request Body (Incoming Message):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550123456",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "messages": [
              {
                "from": "5511999999999",
                "id": "wamid.gBGGSFcCNhA3AG0iAgKYjqcHE2Y=",
                "timestamp": "1702380123",
                "text": {
                  "body": "1"
                },
                "type": "text",
                "context": {
                  "from": "15550123456",
                  "id": "wamid.gBGGSFcCNhA3AG0iAgKYjqcHE1Y="
                }
              }
            ],
            "contacts": [
              {
                "profile": {
                  "name": "Maria Santos"
                },
                "wa_id": "5511999999999"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processado",
  "data": {
    "processedMessages": 1,
    "processedStatuses": 0,
    "n8nTriggered": true
  }
}
```

#### 🔗 WhatsApp + N8N Integration Workflows

**Fluxo de Notificação de Vaga:**
1. Sistema EO Clínica → N8N Webhook (`/api/n8n/webhooks/slot-available`)
2. N8N processa fila e envia WhatsApp template `vaga_disponivel`
3. Paciente responde no WhatsApp
4. Webhook `/api/webhooks/whatsapp` recebe resposta
5. Sistema processa resposta via `/api/n8n/queue/response/:notificationId`

**Templates WhatsApp configurados:**
- `vaga_disponivel`: Notificação de vaga com botões aceitar/recusar
- `confirmacao_agendamento`: Confirmação após aceitar vaga
- `lembrete_consulta`: Lembrete 24h antes da consulta
- `cancelamento_consulta`: Notificação de cancelamento

### 📟 SMS Integration (Twilio)

#### POST `/api/webhooks/sms`
Webhook do Twilio para status de entrega de SMS.

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
X-Twilio-Signature: [signature_from_twilio]
```

**Request Body (Form Data):**
```
MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MessageStatus=delivered
To=%2B5511999999999
From=%2B15550123456
AccountSid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ApiVersion=2010-04-01
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

### 📅 Calendar Integration

#### POST `/api/webhooks/calendar`
Webhook do Google Calendar para notificações de mudanças.

**Headers:**
```
Content-Type: application/json
X-Goog-Channel-ID: [channel_id]
X-Goog-Channel-Token: [verification_token]
X-Goog-Resource-ID: [resource_id]
X-Goog-Resource-URI: [resource_uri]
X-Goog-Resource-State: [sync, exists, not_exists]
```

**Request Body:**
```json
{
  "kind": "calendar#event",
  "etag": "\"3200000000000000\"",
  "id": "event123",
  "status": "confirmed",
  "htmlLink": "https://calendar.google.com/event?eid=...",
  "created": "2024-12-12T10:00:00.000Z",
  "updated": "2024-12-12T10:30:00.000Z",
  "summary": "Consulta - Dr. Silva",
  "start": {
    "dateTime": "2024-12-15T14:00:00-03:00",
    "timeZone": "America/Sao_Paulo"
  },
  "end": {
    "dateTime": "2024-12-15T14:30:00-03:00", 
    "timeZone": "America/Sao_Paulo"
  },
  "attendees": [
    {
      "email": "patient@email.com",
      "responseStatus": "accepted"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Calendar event processed",
  "data": {
    "eventId": "event123",
    "action": "updated",
    "syncedToSystem": true
  }
}
```

---

## 🏥 SYSTEM ENDPOINTS

### GET `/health`
System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-09T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "ai": "healthy"
  },
  "version": "1.0.0"
}
```

### GET `/version`
Get system version information.

---

## 📝 ERROR RESPONSES

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### Error Codes
- `VALIDATION_ERROR` (400): Input validation failed
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## 📊 PAGINATION

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field
- `sortOrder`: 'asc' or 'desc' (default: 'desc')

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🔐 RATE LIMITING

- **Default**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Password Reset**: 3 requests per hour per email
- **MFA**: 5 attempts per 15 minutes per user

**Headers:**
- `X-Rate-Limit-Limit`: Request limit
- `X-Rate-Limit-Remaining`: Remaining requests
- `X-Rate-Limit-Reset`: Reset timestamp

---

## 🧪 TESTING

### Postman Collection
Import the complete API collection: `docs/postman/eo-clinica-api.json`

### Test Users
```json
{
  "admin": "admin@eo-clinica.com",
  "doctor": "dr.silva@eo-clinica.com",
  "patient": "paciente@example.com",
  "receptionist": "recepcao@eo-clinica.com"
}
```
**Password**: `Admin123!` (for all test users)

---

## ⚙️ USER SETTINGS ENDPOINTS - NEW v1.3.4

### GET `/auth/me`
Obter perfil completo do usuário autenticado com configurações.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm1abc123def456",
    "email": "user@example.com",
    "name": "João Silva",
    "firstName": "João",
    "lastName": "Silva",
    "role": "PATIENT",
    "phone": "+55 11 99999-9999",
    "timezone": "America/Sao_Paulo",
    "bio": "Biografia do usuário",
    "settings": {
      "notifications": {
        "email": true,
        "sms": true,
        "appointmentReminders": true,
        "reminderTiming": 24
      },
      "privacy": {
        "profileVisibility": "contacts",
        "shareActivityStatus": true
      },
      "appearance": {
        "theme": "light",
        "fontSize": "medium"
      },
      "security": {
        "twoFactorEnabled": false,
        "sessionTimeout": 60
      }
    }
  }
}
```

### GET `/users/profile`
Endpoint alternativo para obter perfil (mesmo retảrno que `/auth/me`).

### PATCH `/users/profile`
Atualizar perfil e configurações do usuário.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "firstName": "João",
  "lastName": "Silva Santos",
  "phone": "+55 11 98765-4321",
  "bio": "Nova biografia",
  "settings": {
    "notifications": {
      "email": false,
      "sms": true,
      "appointmentReminders": true,
      "reminderTiming": 48
    },
    "privacy": {
      "profileVisibility": "private",
      "shareActivityStatus": false
    },
    "appearance": {
      "theme": "dark",
      "fontSize": "large"
    },
    "security": {
      "twoFactorEnabled": true,
      "sessionTimeout": 120
    }
  }
}
```

**Response:** Objeto completo do usuário atualizado (mesmo formato do GET).

### Estrutura de Configurações

#### Notificações (`settings.notifications`)
- `email`: boolean - Notificações por email
- `sms`: boolean - Notificações por SMS  
- `push`: boolean - Notificações push
- `appointmentReminders`: boolean - Lembretes de consulta
- `cancellationAlerts`: boolean - Alertas de cancelamento
- `reminderTiming`: number - Horas antes (1, 2, 6, 24, 48)

#### Privacidade (`settings.privacy`)
- `profileVisibility`: "public" | "contacts" | "private"
- `shareActivityStatus`: boolean
- `allowDirectMessages`: boolean
- `showOnlineStatus`: boolean

#### Aparência (`settings.appearance`)  
- `theme`: "light" | "dark" | "system"
- `fontSize`: "small" | "medium" | "large"
- `reducedMotion`: boolean
- `highContrast`: boolean

#### Segurança (`settings.security`)
- `twoFactorEnabled`: boolean
- `loginNotifications`: boolean  
- `sessionTimeout`: number (minutos)

### Códigos de Erro Settings
- `401 UNAUTHORIZED`: Token inválido ou expirado
- `404 NOT_FOUND`: Usuário não encontrado
- `400 BAD_REQUEST`: Dados inválidos no request
- `500 INTERNAL_ERROR`: Erro interno do servidor

### Segurança e Armazenamento
- **JWT Middleware**: Validação completa de tokens
- **Role-based Access**: Controle por perfil de usuário
- **Encrypted Storage**: Configurações no campo `encryptedData`
- **Input Validation**: Sanitização e validação rigorosa

---

**🔗 Interactive API Explorer**: `/documentation` (Swagger UI)