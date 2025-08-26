# 🔧 N8N Custom Nodes - EO Clínica

## 📋 Visão Geral

Custom nodes específicos para integração do N8N com o sistema EO Clínica, facilitando automações de agendamento, fila de espera e notificações médicas.

## 🎯 Nodes Disponíveis

### 1. EO Clínica API Node

Custom node para interação com todas as APIs do sistema EO Clínica.

#### Configuração do Node

```typescript
// eoClinicaApi.node.ts
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class EoClinicaApi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'EO Clínica API',
    name: 'eoClinicaApi',
    icon: 'file:eoClinica.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with EO Clínica medical system',
    defaults: {
      name: 'EO Clínica API',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'eoClinicaApi',
        required: true,
      },
    ],
    properties: [
      // Resource selection
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Appointment',
            value: 'appointment',
          },
          {
            name: 'Patient',
            value: 'patient',
          },
          {
            name: 'Queue',
            value: 'queue',
          },
          {
            name: 'Notification',
            value: 'notification',
          },
          {
            name: 'Doctor',
            value: 'doctor',
          },
          {
            name: 'Specialty',
            value: 'specialty',
          },
        ],
        default: 'appointment',
      },
      
      // Operations for Queue resource
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['queue'],
          },
        },
        options: [
          {
            name: 'List Queue',
            value: 'list',
            action: 'List patients in queue for specialty',
          },
          {
            name: 'Add to Queue',
            value: 'add',
            action: 'Add patient to waiting queue',
          },
          {
            name: 'Mark Notified',
            value: 'markNotified',
            action: 'Mark patient as notified',
          },
          {
            name: 'Process Response',
            value: 'processResponse',
            action: 'Process patient response to notification',
          },
        ],
        default: 'list',
      },

      // Specialty ID for queue operations
      {
        displayName: 'Specialty ID',
        name: 'specialtyId',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['queue'],
            operation: ['list', 'add'],
          },
        },
        default: '',
        placeholder: 'spec_123',
        description: 'The specialty ID to query queue for',
      },

      // Patient ID for queue operations
      {
        displayName: 'Patient ID',
        name: 'patientId',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['queue'],
            operation: ['add', 'markNotified'],
          },
        },
        default: '',
        placeholder: 'pat_456',
        description: 'The patient ID for queue operations',
      },

      // Priority for adding to queue
      {
        displayName: 'Priority',
        name: 'priority',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['queue'],
            operation: ['add'],
          },
        },
        options: [
          {
            name: 'Emergency',
            value: 'EMERGENCY',
          },
          {
            name: 'High',
            value: 'HIGH',
          },
          {
            name: 'Medium', 
            value: 'MEDIUM',
          },
          {
            name: 'Low',
            value: 'LOW',
          },
        ],
        default: 'MEDIUM',
      },
      
      // Additional options for queue list
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        displayOptions: {
          show: {
            resource: ['queue'],
            operation: ['list'],
          },
        },
        default: {},
        options: [
          {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            typeOptions: {
              minValue: 1,
              maxValue: 100,
            },
            default: 50,
            description: 'Maximum number of results to return',
          },
          {
            displayName: 'Priority Filter',
            name: 'priority',
            type: 'options',
            options: [
              {
                name: 'All',
                value: '',
              },
              {
                name: 'Emergency',
                value: 'EMERGENCY',
              },
              {
                name: 'High',
                value: 'HIGH',
              },
              {
                name: 'Medium',
                value: 'MEDIUM',
              },
              {
                name: 'Low',
                value: 'LOW',
              },
            ],
            default: '',
            description: 'Filter by priority level',
          },
          {
            displayName: 'Include Already Notified',
            name: 'includeNotified',
            type: 'boolean',
            default: false,
            description: 'Whether to include patients notified in last 24h',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    
    const credentials = await this.getCredentials('eoClinicaApi');
    const baseURL = credentials.url as string;
    const apiKey = credentials.apiKey as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData;

        if (resource === 'queue') {
          if (operation === 'list') {
            // List queue for specialty
            const specialtyId = this.getNodeParameter('specialtyId', i) as string;
            const additionalFields = this.getNodeParameter('additionalFields', i) as any;
            
            const queryParams = new URLSearchParams();
            if (additionalFields.limit) {
              queryParams.append('limit', additionalFields.limit.toString());
            }
            if (additionalFields.priority) {
              queryParams.append('priority', additionalFields.priority);
            }
            if (additionalFields.includeNotified) {
              queryParams.append('includeNotified', 'true');
            }

            const response = await fetch(
              `${baseURL}/api/n8n/queue/specialty/${specialtyId}?${queryParams}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            responseData = await response.json();

          } else if (operation === 'add') {
            // Add patient to queue
            const specialtyId = this.getNodeParameter('specialtyId', i) as string;
            const patientId = this.getNodeParameter('patientId', i) as string;
            const priority = this.getNodeParameter('priority', i) as string;

            const response = await fetch(`${baseURL}/api/queue`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                patientId,
                specialtyId,
                priority,
                queuedAt: new Date().toISOString(),
              }),
            });

            responseData = await response.json();

          } else if (operation === 'markNotified') {
            // Mark patient as notified
            const patientId = this.getNodeParameter('patientId', i) as string;
            const notificationData = items[i].json;

            const response = await fetch(
              `${baseURL}/api/n8n/queue/${patientId}/notified`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(notificationData),
              }
            );

            responseData = await response.json();

          } else if (operation === 'processResponse') {
            // Process patient response
            const notificationId = items[i].json.notificationId as string;
            const responsePayload = items[i].json;

            const response = await fetch(
              `${baseURL}/api/n8n/queue/response/${notificationId}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(responsePayload),
              }
            );

            responseData = await response.json();
          }
        }

        if (!responseData?.success) {
          throw new NodeOperationError(
            this.getNode(),
            `EO Clínica API error: ${responseData?.error?.message || 'Unknown error'}`,
            { itemIndex: i }
          );
        }

        returnData.push({
          json: responseData.data || responseData,
          pairedItem: { item: i },
        });

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: error.message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
```

#### Credentials Configuration

```typescript
// eoClinicaApiCredentials.credentials.ts
import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class EoClinicaApiCredentials implements ICredentialType {
  name = 'eoClinicaApi';
  displayName = 'EO Clínica API';
  documentationUrl = 'https://docs.eo-clinica.com/api';
  properties: INodeProperties[] = [
    {
      displayName: 'API URL',
      name: 'url',
      type: 'string',
      default: 'https://api.eo-clinica.com',
      placeholder: 'https://api.eo-clinica.com',
      description: 'Base URL for EO Clínica API',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      placeholder: 'your_api_key_here',
      description: 'API key for authentication',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.url}}',
      url: '/api/health',
    },
  };
}
```

### 2. WhatsApp Business Node (Enhanced)

Custom node aprimorado para WhatsApp Business com templates da EO Clínica.

```typescript
// whatsappBusinessEoClinica.node.ts
export class WhatsAppBusinessEoClinica implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'WhatsApp Business EO Clínica',
    name: 'whatsappBusinessEoClinica',
    icon: 'file:whatsapp.svg',
    group: ['communication'],
    version: 1,
    description: 'Send WhatsApp messages using EO Clínica templates',
    defaults: {
      name: 'WhatsApp Business EO Clínica',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'whatsappBusinessApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Send Template',
            value: 'sendTemplate',
            action: 'Send a template message',
          },
          {
            name: 'Send Text',
            value: 'sendText',
            action: 'Send a text message',
          },
        ],
        default: 'sendTemplate',
      },
      
      {
        displayName: 'Template Name',
        name: 'templateName',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['sendTemplate'],
          },
        },
        options: [
          {
            name: 'Vaga Disponível',
            value: 'vaga_disponivel',
            description: 'Notificação de vaga disponível na fila',
          },
          {
            name: 'Confirmação Agendamento',
            value: 'confirmacao_agendamento', 
            description: 'Confirmação de agendamento realizado',
          },
          {
            name: 'Lembrete Consulta',
            value: 'lembrete_consulta',
            description: 'Lembrete de consulta 24h antes',
          },
          {
            name: 'Cancelamento',
            value: 'cancelamento_consulta',
            description: 'Notificação de cancelamento',
          },
        ],
        default: 'vaga_disponivel',
      },

      {
        displayName: 'Phone Number',
        name: 'phoneNumber',
        type: 'string',
        default: '',
        placeholder: '+5511999999999',
        description: 'Phone number including country code',
        required: true,
      },

      // Template parameters for vaga_disponivel
      {
        displayName: 'Template Parameters',
        name: 'templateParams',
        type: 'collection',
        displayOptions: {
          show: {
            operation: ['sendTemplate'],
            templateName: ['vaga_disponivel'],
          },
        },
        placeholder: 'Add Parameter',
        default: {},
        options: [
          {
            displayName: 'Patient Name',
            name: 'patientName',
            type: 'string',
            default: '',
            description: 'Name of the patient',
            required: true,
          },
          {
            displayName: 'Specialty Name',
            name: 'specialtyName',
            type: 'string',
            default: '',
            description: 'Medical specialty',
            required: true,
          },
          {
            displayName: 'Doctor Name',
            name: 'doctorName',
            type: 'string',
            default: '',
            description: 'Doctor name with title',
            required: true,
          },
          {
            displayName: 'Appointment Date',
            name: 'appointmentDate',
            type: 'string',
            default: '',
            description: 'Formatted appointment date',
            required: true,
          },
          {
            displayName: 'Appointment Time',
            name: 'appointmentTime',
            type: 'string',
            default: '',
            description: 'Formatted appointment time',
            required: true,
          },
          {
            displayName: 'Waiting Days',
            name: 'waitingDays',
            type: 'number',
            default: 0,
            description: 'Days patient has been waiting',
            required: true,
          },
          {
            displayName: 'Notification ID',
            name: 'notificationId',
            type: 'string',
            default: '',
            description: 'Unique notification ID for tracking',
            required: true,
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0);
    
    const credentials = await this.getCredentials('whatsappBusinessApi');
    const accessToken = credentials.accessToken as string;
    const phoneNumberId = credentials.phoneNumberId as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData;

        if (operation === 'sendTemplate') {
          const templateName = this.getNodeParameter('templateName', i) as string;
          const phoneNumber = this.getNodeParameter('phoneNumber', i) as string;
          const templateParams = this.getNodeParameter('templateParams', i) as any;

          // Build template message
          const message: any = {
            messaging_product: 'whatsapp',
            to: phoneNumber.replace(/[^\d+]/g, ''), // Clean phone number
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'pt_BR' },
              components: [],
            },
          };

          // Add parameters based on template
          if (templateName === 'vaga_disponivel') {
            message.template.components = [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: templateParams.patientName },
                  { type: 'text', text: templateParams.specialtyName },
                  { type: 'text', text: templateParams.doctorName },
                  { type: 'text', text: templateParams.appointmentDate },
                  { type: 'text', text: templateParams.appointmentTime },
                  { type: 'text', text: templateParams.waitingDays.toString() },
                ],
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [
                  { type: 'text', text: templateParams.notificationId },
                ],
              },
            ];
          }

          // Send message
          const response = await fetch(
            `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(message),
            }
          );

          responseData = await response.json();

          if (!response.ok) {
            throw new NodeOperationError(
              this.getNode(),
              `WhatsApp API error: ${responseData.error?.message || 'Unknown error'}`,
              { itemIndex: i }
            );
          }
        }

        returnData.push({
          json: responseData,
          pairedItem: { item: i },
        });

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: error.message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
```

### 3. Medical Priority Calculator Node

Node para calcular prioridades baseadas em critérios médicos.

```typescript
// medicalPriorityCalculator.node.ts
export class MedicalPriorityCalculator implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Medical Priority Calculator',
    name: 'medicalPriorityCalculator',
    icon: 'fa:calculator',
    group: ['transform'],
    version: 1,
    description: 'Calculate medical appointment priorities based on clinical criteria',
    defaults: {
      name: 'Medical Priority Calculator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Patient Data Source',
        name: 'dataSource',
        type: 'string',
        default: '',
        description: 'JSON path to patient data in input',
        placeholder: '$.patients',
      },
      
      {
        displayName: 'Priority Factors',
        name: 'priorityFactors',
        type: 'collection',
        placeholder: 'Add Factor',
        default: {},
        options: [
          {
            displayName: 'Age Weight',
            name: 'ageWeight',
            type: 'number',
            default: 1.0,
            description: 'Weight for age factor (elderly = +20 points)',
          },
          {
            displayName: 'Waiting Time Weight',
            name: 'waitingWeight',
            type: 'number',
            default: 1.0,
            description: 'Weight for waiting time (1 point per day)',
          },
          {
            displayName: 'Special Needs Weight',
            name: 'specialNeedsWeight',
            type: 'number',
            default: 1.5,
            description: 'Weight for special needs patients',
          },
          {
            displayName: 'Previous Cancellation Weight',
            name: 'cancellationWeight',
            type: 'number',
            default: 0.5,
            description: 'Weight for previous cancellations (bonus)',
          },
          {
            displayName: 'No-Show Penalty',
            name: 'noShowPenalty',
            type: 'number',
            default: -1.0,
            description: 'Penalty for previous no-shows',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const dataSource = this.getNodeParameter('dataSource', i) as string;
      const priorityFactors = this.getNodeParameter('priorityFactors', i) as any;
      
      // Default weights
      const weights = {
        ageWeight: priorityFactors.ageWeight || 1.0,
        waitingWeight: priorityFactors.waitingWeight || 1.0,
        specialNeedsWeight: priorityFactors.specialNeedsWeight || 1.5,
        cancellationWeight: priorityFactors.cancellationWeight || 0.5,
        noShowPenalty: priorityFactors.noShowPenalty || -1.0,
      };
      
      let patients = items[i].json;
      
      // Extract patients from data source path if specified
      if (dataSource) {
        const path = dataSource.replace(/^\$\./, '');
        patients = path.split('.').reduce((obj, key) => obj?.[key], patients);
      }
      
      // Ensure patients is an array
      if (!Array.isArray(patients)) {
        patients = [patients];
      }
      
      // Calculate priority scores
      const processedPatients = patients.map((patient: any) => {
        const waitingTime = Date.now() - new Date(patient.queuedAt).getTime();
        const waitingDays = waitingTime / (1000 * 60 * 60 * 24);
        
        // Base priority scores
        const priorityScores = {
          'EMERGENCY': 1000,
          'HIGH': 100,
          'MEDIUM': 50,
          'LOW': 10
        };
        
        let score = priorityScores[patient.priority as keyof typeof priorityScores] || 10;
        
        // Apply weights and factors
        score += (waitingDays * weights.waitingWeight);
        
        // Age bonus (65+ years)
        if (patient.age >= 65) {
          score += (20 * weights.ageWeight);
        }
        
        // Special needs bonus
        if (patient.specialNeeds) {
          score += (15 * weights.specialNeedsWeight);
        }
        
        // Previous cancellations bonus
        if (patient.previousCancellations > 0) {
          score += (patient.previousCancellations * 5 * weights.cancellationWeight);
        }
        
        // No-show penalty
        if (patient.noShowCount > 0) {
          score += (patient.noShowCount * 10 * weights.noShowPenalty);
        }
        
        return {
          ...patient,
          priorityScore: Math.max(score, 0), // No negative scores
          waitingDays: Math.round(waitingDays * 100) / 100,
          calculatedAt: new Date().toISOString(),
        };
      });
      
      // Sort by priority score (highest first)
      const sortedPatients = processedPatients.sort((a, b) => b.priorityScore - a.priorityScore);
      
      returnData.push({
        json: {
          patients: sortedPatients,
          totalPatients: sortedPatients.length,
          highestScore: sortedPatients[0]?.priorityScore || 0,
          averageScore: sortedPatients.reduce((sum, p) => sum + p.priorityScore, 0) / sortedPatients.length,
          calculatedAt: new Date().toISOString(),
        },
        pairedItem: { item: i },
      });
    }
    
    return [returnData];
  }
}
```

## 📦 Instalação dos Custom Nodes

### 1. Package Structure

```
n8n-nodes-eo-clinica/
├── package.json
├── credentials/
│   └── EoClinicaApiCredentials.credentials.ts
├── nodes/
│   ├── EoClinicaApi/
│   │   ├── EoClinicaApi.node.ts
│   │   └── eoClinica.svg
│   ├── WhatsAppBusinessEoClinica/
│   │   ├── WhatsAppBusinessEoClinica.node.ts
│   │   └── whatsapp.svg
│   └── MedicalPriorityCalculator/
│       ├── MedicalPriorityCalculator.node.ts
│       └── calculator.svg
└── README.md
```

### 2. Package.json

```json
{
  "name": "n8n-nodes-eo-clinica",
  "version": "1.0.0",
  "description": "N8N custom nodes for EO Clínica medical system integration",
  "keywords": ["n8n-community-node-package", "n8n", "medical", "healthcare"],
  "license": "MIT",
  "homepage": "https://github.com/eo-clinica/n8n-nodes",
  "author": "EO Clínica Tech Team",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/eo-clinica/n8n-nodes.git"
  },
  "main": "index.js",
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "tsc --watch",
    "format": "prettier nodes credentials --write",
    "lint": "eslint nodes credentials package.json",
    "lintfix": "eslint nodes credentials package.json --fix",
    "prepublishOnly": "npm run build && npm run lint -s"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/EoClinicaApiCredentials.credentials.js"
    ],
    "nodes": [
      "dist/nodes/EoClinicaApi/EoClinicaApi.node.js",
      "dist/nodes/WhatsAppBusinessEoClinica/WhatsAppBusinessEoClinica.node.js",
      "dist/nodes/MedicalPriorityCalculator/MedicalPriorityCalculator.node.js"
    ]
  },
  "devDependencies": {
    "@types/node": "^18.16.16",
    "n8n-workflow": "^1.2.0",
    "typescript": "^5.1.3"
  }
}
```

### 3. Instalação

```bash
# Via npm (quando publicado)
npm install n8n-nodes-eo-clinica

# Via n8n community nodes
# Settings > Community Nodes > Install
# Package: n8n-nodes-eo-clinica

# Desenvolvimento local
cd /path/to/n8n
npm install /path/to/n8n-nodes-eo-clinica

# Docker
docker run -it --rm \
  -p 5678:5678 \
  -e N8N_CUSTOM_EXTENSIONS="/data/custom" \
  -v /path/to/n8n-nodes-eo-clinica:/data/custom \
  n8nio/n8n
```

## 🔧 Configuração e Uso

### 1. Configurar Credenciais

**EO Clínica API:**
- URL: `https://api.eo-clinica.com`
- API Key: `[sua_chave_api_n8n]`

**WhatsApp Business API:**
- Access Token: `[seu_token_whatsapp]`  
- Phone Number ID: `[id_do_numero_whatsapp]`

### 2. Exemplo de Workflow

```json
{
  "name": "Gestão Fila Espera - Custom Nodes",
  "nodes": [
    {
      "parameters": {
        "resource": "queue",
        "operation": "list",
        "specialtyId": "={{ $json.specialtyId }}",
        "additionalFields": {
          "limit": 10,
          "priority": "HIGH"
        }
      },
      "name": "Buscar Fila High Priority",
      "type": "eoClinicaApi",
      "position": [400, 300],
      "credentials": {
        "eoClinicaApi": "eo-clinica-credentials"
      }
    },
    {
      "parameters": {
        "dataSource": "$.data",
        "priorityFactors": {
          "ageWeight": 1.2,
          "waitingWeight": 1.5,
          "specialNeedsWeight": 2.0
        }
      },
      "name": "Calcular Prioridades",
      "type": "medicalPriorityCalculator",
      "position": [600, 300]
    },
    {
      "parameters": {
        "operation": "sendTemplate",
        "templateName": "vaga_disponivel",
        "phoneNumber": "={{ $json.patients[0].patientPhone }}",
        "templateParams": {
          "patientName": "={{ $json.patients[0].patientName }}",
          "specialtyName": "Cardiologia",
          "doctorName": "Dr. João Silva",
          "appointmentDate": "15/12/2024",
          "appointmentTime": "14:00",
          "waitingDays": "={{ $json.patients[0].waitingDays }}",
          "notificationId": "queue_123_456"
        }
      },
      "name": "Notificar via WhatsApp",
      "type": "whatsappBusinessEoClinica",
      "position": [800, 300],
      "credentials": {
        "whatsappBusinessApi": "whatsapp-credentials"
      }
    }
  ],
  "connections": {
    "Buscar Fila High Priority": {
      "main": [
        [
          {
            "node": "Calcular Prioridades",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Calcular Prioridades": {
      "main": [
        [
          {
            "node": "Notificar via WhatsApp",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## 📊 Monitoramento e Logs

### Error Handling
```typescript
// Implementado em todos os nodes
try {
  // Node operation
} catch (error) {
  if (this.continueOnFail()) {
    returnData.push({
      json: { 
        error: error.message,
        timestamp: new Date().toISOString(),
        nodeType: this.getNode().type
      },
      pairedItem: { item: i },
    });
    continue;
  }
  throw new NodeOperationError(
    this.getNode(),
    error.message,
    { itemIndex: i }
  );
}
```

### Logging Integration
```typescript
// Adicionar logging em operações críticas
const auditData = {
  action: 'queue_notification_sent',
  patientId: patient.id,
  channel: 'whatsapp',
  executionId: this.getExecutionId(),
  timestamp: new Date().toISOString()
};

await fetch(`${baseURL}/api/audit/log`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(auditData),
});
```

---

## 📞 Suporte

Para dúvidas sobre os custom nodes:

- **GitHub:** https://github.com/eo-clinica/n8n-nodes
- **Email:** tech@eo-clinica.com
- **Documentação:** https://docs.eo-clinica.com/n8n-nodes

**Última atualização:** 26 de Agosto de 2025
**Versão:** 1.0.0