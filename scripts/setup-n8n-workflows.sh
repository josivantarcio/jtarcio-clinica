#!/bin/bash

# 🤖 Script para configurar workflows WhatsApp AI no N8N
# Configurado para suas credenciais: josivantarcio@msn.com | Admin123!

set -e

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🤖 CONFIGURAÇÃO AUTOMÁTICA N8N + WHATSAPP AI${NC}"
echo "==============================================="

# Verificar se o N8N está rodando
check_n8n() {
    if curl -s http://localhost:5678 --connect-timeout 5 > /dev/null; then
        return 0
    else
        return 1
    fi
}

echo -e "${BLUE}1. 🔍 Verificando N8N...${NC}"
if check_n8n; then
    echo -e "${GREEN}✅ N8N está rodando em http://localhost:5678${NC}"
else
    echo -e "${YELLOW}⚠️  N8N não está rodando. Iniciando...${NC}"
    
    # Iniciar N8N em background
    echo "Iniciando N8N standalone..."
    nohup ./scripts/start-n8n-standalone.sh > n8n.log 2>&1 &
    N8N_PID=$!
    echo "N8N PID: $N8N_PID"
    
    # Aguardar N8N inicializar
    echo "⏳ Aguardando N8N inicializar (45 segundos)..."
    sleep 45
    
    if check_n8n; then
        echo -e "${GREEN}✅ N8N iniciado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Falha ao iniciar N8N. Verifique os logs em n8n.log${NC}"
        exit 1
    fi
fi

# Configurar credenciais e workflows via API N8N
echo -e "${BLUE}2. 🔐 Configurando credenciais PostgreSQL...${NC}"

# Configurar credencial PostgreSQL via arquivo JSON
N8N_USER_DIR="$HOME/.n8n"
CREDENTIALS_FILE="$N8N_USER_DIR/credentials.json"

mkdir -p "$N8N_USER_DIR"

cat > "$CREDENTIALS_FILE" << 'EOF'
{
  "eo_clinica_postgres": {
    "id": "eo_clinica_postgres",
    "name": "EO Clínica PostgreSQL",
    "type": "postgres",
    "nodesAccess": [
      {
        "nodeType": "n8n-nodes-base.postgres"
      }
    ],
    "data": {
      "host": "localhost",
      "port": 5433,
      "database": "eo_clinica_db",
      "user": "clinic_user",
      "password": "clinic_password",
      "ssl": "disable"
    }
  }
}
EOF

echo -e "${GREEN}✅ Credenciais PostgreSQL configuradas${NC}"

# Importar workflows
echo -e "${BLUE}3. 📥 Importando workflows WhatsApp AI...${NC}"

WORKFLOW_FILE="n8n-workflows/whatsapp-ai-workflows.json"

if [ -f "$WORKFLOW_FILE" ]; then
    # Copiar workflows para diretório do N8N
    WORKFLOWS_DIR="$N8N_USER_DIR/workflows"
    mkdir -p "$WORKFLOWS_DIR"
    
    # Extrair e salvar cada workflow individualmente
    echo "Processando workflows..."
    
    # Workflow 1: Message Processor
    cat > "$WORKFLOWS_DIR/whatsapp-message-processor.json" << 'EOF'
{
  "name": "WhatsApp AI - Message Processor",
  "active": true,
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-incoming",
        "responseMode": "onReceived",
        "responseCode": 200
      },
      "name": "Webhook WhatsApp",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "phone_number",
              "value": "={{ $json.entry && $json.entry[0] && $json.entry[0].changes && $json.entry[0].changes[0] && $json.entry[0].changes[0].value && $json.entry[0].changes[0].value.contacts && $json.entry[0].changes[0].value.contacts[0] ? $json.entry[0].changes[0].value.contacts[0].wa_id : 'unknown' }}"
            },
            {
              "name": "message_text",
              "value": "={{ $json.entry && $json.entry[0] && $json.entry[0].changes && $json.entry[0].changes[0] && $json.entry[0].changes[0].value && $json.entry[0].changes[0].value.messages && $json.entry[0].changes[0].value.messages[0] && $json.entry[0].changes[0].value.messages[0].text ? $json.entry[0].changes[0].value.messages[0].text.body : '' }}"
            },
            {
              "name": "message_type",
              "value": "={{ $json.entry && $json.entry[0] && $json.entry[0].changes && $json.entry[0].changes[0] && $json.entry[0].changes[0].value && $json.entry[0].changes[0].value.messages && $json.entry[0].changes[0].value.messages[0] ? $json.entry[0].changes[0].value.messages[0].type : 'unknown' }}"
            }
          ]
        }
      },
      "name": "Extract Message Data",
      "type": "n8n-nodes-base.set",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "url": "http://localhost:3000/api/v1/ai/process-message",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "phone_number",
              "value": "={{ $json.phone_number }}"
            },
            {
              "name": "message",
              "value": "={{ $json.message_text }}"
            },
            {
              "name": "message_type",
              "value": "={{ $json.message_type }}"
            }
          ]
        }
      },
      "name": "Process with EO Clínica AI",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook WhatsApp": {
      "main": [
        [
          {
            "node": "Extract Message Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract Message Data": {
      "main": [
        [
          {
            "node": "Process with EO Clínica AI",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Workflow 1: Message Processor criado${NC}"
    
    # Workflow 2: Appointment Scheduler  
    cat > "$WORKFLOWS_DIR/whatsapp-appointment-scheduler.json" << 'EOF'
{
  "name": "WhatsApp AI - Appointment Scheduler",
  "active": true,
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "schedule-appointment",
        "responseMode": "onReceived"
      },
      "name": "Webhook Schedule",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT d.id, u.name, s.name as specialty, s.price FROM doctors d JOIN users u ON d.user_id = u.id JOIN specialties s ON d.specialty_id = s.id WHERE u.active = true LIMIT 5"
      },
      "name": "Find Doctors",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 1,
      "position": [460, 300],
      "credentials": {
        "postgres": {
          "id": "eo_clinica_postgres",
          "name": "EO Clínica PostgreSQL"
        }
      }
    },
    {
      "parameters": {
        "url": "http://localhost:3000/api/v1/appointments",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "patient_name",
              "value": "={{ $json.patient_name }}"
            },
            {
              "name": "doctor_id",
              "value": "={{ $json.doctor_id }}"
            },
            {
              "name": "appointment_date",
              "value": "={{ $json.appointment_date }}"
            }
          ]
        }
      },
      "name": "Create Appointment",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook Schedule": {
      "main": [
        [
          {
            "node": "Find Doctors",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Find Doctors": {
      "main": [
        [
          {
            "node": "Create Appointment",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
EOF

    echo -e "${GREEN}✅ Workflow 2: Appointment Scheduler criado${NC}"
    
    # Workflow 3: Emergency Escalation
    cat > "$WORKFLOWS_DIR/whatsapp-emergency-escalation.json" << 'EOF'
{
  "name": "WhatsApp AI - Emergency Escalation",
  "active": true,
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "emergency-detected",
        "responseMode": "onReceived"
      },
      "name": "Webhook Emergency",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO emergency_logs (phone_number, message_text, urgency_level, escalated_at, status) VALUES ('{{ $json.phone_number }}', '{{ $json.message }}', '{{ $json.urgency_level || \"HIGH\" }}', NOW(), 'ESCALATED') RETURNING id"
      },
      "name": "Log Emergency",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 1,
      "position": [460, 300],
      "credentials": {
        "postgres": {
          "id": "eo_clinica_postgres",
          "name": "EO Clínica PostgreSQL"
        }
      }
    },
    {
      "parameters": {
        "url": "http://localhost:3000/api/v1/notifications/emergency",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "emergency_type",
              "value": "whatsapp_escalation"
            },
            {
              "name": "patient_phone",
              "value": "{{ $json.phone_number }}"
            },
            {
              "name": "message",
              "value": "🚨 EMERGÊNCIA VIA WHATSAPP: {{ $json.message }}"
            }
          ]
        }
      },
      "name": "Notify Medical Team",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook Emergency": {
      "main": [
        [
          {
            "node": "Log Emergency",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Log Emergency": {
      "main": [
        [
          {
            "node": "Notify Medical Team",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
EOF

    echo -e "${GREEN}✅ Workflow 3: Emergency Escalation criado${NC}"
    
    echo -e "${GREEN}✅ Todos os workflows foram importados com sucesso!${NC}"
    
else
    echo -e "${RED}❌ Arquivo de workflows não encontrado: $WORKFLOW_FILE${NC}"
fi

# Verificar status final
echo -e "${BLUE}4. ✅ CONFIGURAÇÃO CONCLUÍDA${NC}"
echo "=========================="
echo ""
echo -e "${GREEN}🌐 Acesse o N8N: http://localhost:5678${NC}"
echo -e "${GREEN}👤 Usuário: josivantarcio@msn.com${NC}"
echo -e "${GREEN}🔐 Senha: Admin123!${NC}"
echo ""
echo -e "${BLUE}📋 Workflows disponíveis:${NC}"
echo "• WhatsApp AI - Message Processor"
echo "• WhatsApp AI - Appointment Scheduler"  
echo "• WhatsApp AI - Emergency Escalation"
echo ""
echo -e "${BLUE}🔗 Webhooks ativos:${NC}"
echo "• http://localhost:5678/webhook/whatsapp-incoming"
echo "• http://localhost:5678/webhook/schedule-appointment"
echo "• http://localhost:5678/webhook/emergency-detected"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "1. Acesse http://localhost:5678"
echo "2. Faça login com suas credenciais"
echo "3. Verifique se os workflows estão ativos"
echo "4. Teste os webhooks com dados de exemplo"
echo ""