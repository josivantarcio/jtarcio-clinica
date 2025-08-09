# PROMPT SETOR 4: AUTOMAÇÃO COMPLETA COM N8N
## Sistema de Agendamento de Clínicas com IA Generativa

### CONTEXTO CONTINUADO
Este é o quarto setor. A arquitetura, IA e sistema de agendamento core já estão implementados. Agora focaremos na automação completa usando N8N, criando workflows que orquestram todos os processos, integrações externas e comunicação multi-canal.

### OBJETIVO ESPECÍFICO DESTE SETOR
Implementar automação completa usando N8N workflows, incluindo comunicação multi-canal, integrações externas, orquestração de processos e monitoramento automatizado.

### ESCOPO DESTE SETOR

#### 1. WORKFLOWS PRINCIPAIS
- **Novo Agendamento**: Fluxo completo do pedido até confirmação
- **Reagendamento**: Automação de mudanças de horário
- **Cancelamento**: Processo automatizado de cancelamento
- **Lembretes**: Sistema de notificações temporais
- **Fila de Espera**: Gestão automática de vagas liberadas
- **Emergências**: Fluxo prioritário para urgências

#### 2. INTEGRAÇÕES EXTERNAS
- **Google Calendar**: Sincronização bidirecional
- **WhatsApp Business**: Notificações via WhatsApp
- **SMS Gateway**: Notificações SMS
- **Email Marketing**: Campanhas automatizadas
- **Prontuário Eletrônico**: Sincronização de dados
- **Sistema de Pagamento**: Processamento de taxas

#### 3. COMUNICAÇÃO MULTI-CANAL
- **Email Templates**: Templates dinâmicos
- **SMS Templates**: Mensagens personalizadas  
- **WhatsApp Templates**: Mensagens estruturadas
- **Push Notifications**: Notificações mobile
- **Voice Calls**: Chamadas automatizadas

#### 4. MONITORING E ALERTAS
- **Health Checks**: Monitoramento de sistema
- **Error Handling**: Tratamento de erros
- **Performance Monitoring**: Métricas automatizadas
- **Business Intelligence**: Relatórios automáticos

### WORKFLOWS DETALHADOS

#### 1. WORKFLOW: NOVO AGENDAMENTO
```json
{
  "name": "novo-agendamento",
  "trigger": "webhook",
  "steps": [
    {
      "node": "webhook-trigger",
      "type": "webhook",
      "config": {
        "path": "/webhook/novo-agendamento",
        "method": "POST"
      }
    },
    {
      "node": "validar-dados",
      "type": "code",
      "config": {
        "jsCode": "// Validação dos dados do agendamento"
      }
    },
    {
      "node": "verificar-disponibilidade",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/api/availability/check",
        "method": "POST"
      }
    },
    {
      "node": "criar-agendamento",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/api/appointments",
        "method": "POST"
      }
    },
    {
      "node": "sync-google-calendar",
      "type": "google-calendar",
      "config": {
        "operation": "create",
        "calendar": "primary"
      }
    },
    {
      "node": "enviar-confirmacao",
      "type": "send-email",
      "config": {
        "template": "confirmacao-agendamento"
      }
    },
    {
      "node": "agendar-lembrete",
      "type": "schedule-workflow",
      "config": {
        "workflow": "enviar-lembrete",
        "delay": "24h"
      }
    }
  ]
}
```

#### 2. WORKFLOW: SISTEMA DE LEMBRETES
```json
{
  "name": "sistema-lembretes",
  "trigger": "cron",
  "schedule": "0 8 * * *",
  "steps": [
    {
      "node": "buscar-consultas-hoje",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/api/appointments/today"
      }
    },
    {
      "node": "filtrar-sem-confirmacao",
      "type": "filter",
      "config": {
        "condition": "{{ $json.confirmed !== true }}"
      }
    },
    {
      "node": "split-por-canal",
      "type": "switch",
      "config": {
        "values": ["email", "sms", "whatsapp"]
      }
    },
    {
      "node": "enviar-email-lembrete",
      "type": "send-email",
      "config": {
        "template": "lembrete-consulta"
      }
    },
    {
      "node": "enviar-sms-lembrete",
      "type": "twilio",
      "config": {
        "operation": "send",
        "template": "lembrete-sms"
      }
    },
    {
      "node": "enviar-whatsapp",
      "type": "whatsapp-business",
      "config": {
        "template": "lembrete_consulta"
      }
    },
    {
      "node": "agendar-reenvio",
      "type": "schedule-workflow",
      "config": {
        "workflow": "reenvio-lembrete",
        "delay": "4h",
        "condition": "not_confirmed"
      }
    }
  ]
}
```

#### 3. WORKFLOW: FILA DE ESPERA
```json
{
  "name": "gestao-fila-espera",
  "trigger": "webhook",
  "steps": [
    {
      "node": "cancelamento-detectado",
      "type": "webhook",
      "config": {
        "path": "/webhook/appointment-cancelled"
      }
    },
    {
      "node": "buscar-fila",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/api/queue/{{ $json.specialty }}"
      }
    },
    {
      "node": "ordenar-por-prioridade",
      "type": "sort",
      "config": {
        "field": "priority_score",
        "order": "desc"
      }
    },
    {
      "node": "notificar-primeiro-da-fila",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/api/notifications/queue-available"
      }
    },
    {
      "node": "aguardar-resposta",
      "type": "wait",
      "config": {
        "timeout": "30m"
      }
    },
    {
      "node": "verificar-aceite",
      "type": "if",
      "config": {
        "condition": "{{ $json.accepted === true }}"
      }
    },
    {
      "node": "confirmar-agendamento",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/api/appointments/confirm-from-queue"
      }
    },
    {
      "node": "notificar-proximo",
      "type": "execute-workflow",
      "config": {
        "workflow": "gestao-fila-espera"
      }
    }
  ]
}
```

### INTEGRAÇÕES ESPECÍFICAS

#### 1. GOOGLE CALENDAR INTEGRATION
```typescript
interface GoogleCalendarIntegration {
  // Sincronização bidirecional
  syncAppointment(appointment: Appointment): Promise<CalendarEvent>;
  
  // Webhook para mudanças externas
  handleExternalChange(event: CalendarWebhookEvent): Promise<void>;
  
  // Bulk sync para múltiplas agendas
  bulkSync(doctorIds: string[], dateRange: DateRange): Promise<SyncResult>;
}
```

#### 2. WHATSAPP BUSINESS API
```typescript
interface WhatsAppBusinessIntegration {
  // Envio de templates aprovados
  sendTemplate(phone: string, template: string, params: any[]): Promise<MessageResult>;
  
  // Mensagens interativas
  sendInteractive(phone: string, interactive: InteractiveMessage): Promise<MessageResult>;
  
  // Webhook para respostas
  handleIncomingMessage(webhook: WhatsAppWebhook): Promise<void>;
}
```

#### 3. SMS GATEWAY (TWILIO)
```typescript
interface SMSGatewayIntegration {
  // Envio de SMS
  sendSMS(phone: string, message: string): Promise<SMSResult>;
  
  // SMS com templates
  sendTemplatedSMS(phone: string, template: string, vars: any): Promise<SMSResult>;
  
  // Status tracking
  trackDelivery(messageId: string): Promise<DeliveryStatus>;
}
```

### TAREFAS ESPECÍFICAS

#### 1. SETUP N8N ENVIRONMENT
1. **Configure N8N Instance**
   - Docker setup para N8N
   - Conectar com banco PostgreSQL
   - Configurar variáveis de ambiente
   - Setup de backup automático

2. **Create Custom Nodes**
   - Node personalizado para API do sistema
   - Node para integração com IA
   - Node para processamento de filas
   - Node para métricas customizadas

#### 2. IMPLEMENT CORE WORKFLOWS
1. **Agendamento Workflows**
   - Novo agendamento completo
   - Reagendamento automatizado
   - Cancelamento com notificações
   - Sistema de confirmações

2. **Communication Workflows**
   - Lembretes multi-canal
   - Campanhas de reativação
   - Follow-up pós-consulta
   - Pesquisas de satisfação

#### 3. EXTERNAL INTEGRATIONS
1. **Calendar Integrations**
   - Google Calendar bidirectional sync
   - Outlook integration
   - iCal import/export
   - Conflict resolution

2. **Communication Channels**
   - Email templates e automação
   - SMS gateway integration
   - WhatsApp Business API
   - Push notifications

### TEMPLATES DE MENSAGENS

#### Email Templates:
```html
<!-- Confirmação de Agendamento -->
<template id="confirmacao-agendamento">
  <h2>Consulta Agendada com Sucesso!</h2>
  <p>Olá {{ patient_name }},</p>
  <p>Sua consulta foi agendada:</p>
  <ul>
    <li><strong>Especialidade:</strong> {{ specialty }}</li>
    <li><strong>Médico:</strong> {{ doctor_name }}</li>
    <li><strong>Data:</strong> {{ appointment_date }}</li>
    <li><strong>Horário:</strong> {{ appointment_time }}</li>
    <li><strong>Local:</strong> {{ clinic_address }}</li>
  </ul>
  <p><a href="{{ confirmation_link }}">Confirmar Presença</a></p>
</template>

<!-- Lembrete de Consulta -->
<template id="lembrete-consulta">
  <h2>Lembrete: Consulta Amanhã</h2>
  <p>Olá {{ patient_name }},</p>
  <p>Lembramos que você tem consulta marcada:</p>
  <p><strong>{{ appointment_date }} às {{ appointment_time }}</strong></p>
  <p>Com {{ doctor_name }} - {{ specialty }}</p>
  <p><a href="{{ reschedule_link }}">Reagendar</a> | <a href="{{ cancel_link }}">Cancelar</a></p>
</template>
```

#### SMS Templates:
```
# Confirmação
"🏥 Consulta confirmada para {{ date }} às {{ time }} com Dr(a) {{ doctor }}. Clínica {{ clinic_name }}. Confirme: {{ link }}"

# Lembrete
"🔔 Lembrete: Consulta amanhã {{ date }} às {{ time }}. Dr(a) {{ doctor }}. Para reagendar: {{ link }}"

# Vaga disponível
"✅ Vaga disponível! {{ specialty }} em {{ date }} às {{ time }}. Aceitar até {{ deadline }}: {{ link }}"
```

#### WhatsApp Templates:
```json
{
  "name": "lembrete_consulta",
  "language": "pt_BR",
  "components": [
    {
      "type": "BODY",
      "parameters": [
        {"type": "TEXT", "text": "{{patient_name}}"},
        {"type": "TEXT", "text": "{{appointment_date}}"},
        {"type": "TEXT", "text": "{{appointment_time}}"},
        {"type": "TEXT", "text": "{{doctor_name}}"}
      ]
    },
    {
      "type": "BUTTON",
      "sub_type": "URL",
      "parameters": [
        {"type": "TEXT", "text": "{{confirmation_code}}"}
      ]
    }
  ]
}
```

### MONITORING E ALERTAS

#### 1. Health Check Workflows:
```json
{
  "name": "health-check-system",
  "trigger": "cron",
  "schedule": "*/5 * * * *",
  "steps": [
    {
      "node": "check-api-health",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/health"
      }
    },
    {
      "node": "check-database",
      "type": "postgres",
      "config": {
        "query": "SELECT 1"
      }
    },
    {
      "node": "check-ai-service",
      "type": "http-request",
      "config": {
        "url": "{{ $env.CLAUDE_API_URL }}/health"
      }
    },
    {
      "node": "alert-if-down",
      "type": "if",
      "config": {
        "condition": "{{ $json.status !== 'healthy' }}"
      }
    }
  ]
}
```

#### 2. Business Metrics:
```json
{
  "name": "daily-metrics",
  "trigger": "cron", 
  "schedule": "0 23 * * *",
  "steps": [
    {
      "node": "collect-metrics",
      "type": "http-request",
      "config": {
        "url": "{{ $env.API_BASE_URL }}/api/metrics/daily"
      }
    },
    {
      "node": "generate-report",
      "type": "code",
      "config": {
        "jsCode": "// Generate daily business report"
      }
    },
    {
      "node": "send-to-admin",
      "type": "send-email",
      "config": {
        "template": "daily-report"
      }
    }
  ]
}
```

### ERROR HANDLING E RECOVERY

#### Estratégias de Retry:
```json
{
  "retry": {
    "attempts": 3,
    "delay": "exponential",
    "base_delay": 1000,
    "max_delay": 30000
  },
  "fallback": {
    "action": "notify_admin",
    "continue": true
  }
}
```

### PERFORMANCE OPTIMIZATION

#### Parallel Processing:
```json
{
  "node": "parallel-notifications",
  "type": "merge",
  "config": {
    "mode": "parallel",
    "branches": [
      {"workflow": "send-email"},
      {"workflow": "send-sms"}, 
      {"workflow": "send-whatsapp"}
    ]
  }
}
```

### OUTPUT ESPERADO
- N8N instance configurada e funcionando
- Todos os workflows principais implementados
- Integrações externas funcionando
- Sistema de templates implementado
- Monitoramento automatizado ativo
- Error handling robusto
- Performance otimizada
- Documentação completa dos workflows

### PRÓXIMO SETOR
Após completar este setor, seguiremos para o **Setor 5: Frontend, UX/UI e Interface do Usuário**, onde criaremos todas as interfaces de usuário, dashboards administrativos e experiência do paciente.

---

**IMPORTANTE**: Foque na confiabilidade dos workflows. Implemente retry logic, fallbacks e monitoring extensivo. Os workflows são críticos para a operação da clínica.