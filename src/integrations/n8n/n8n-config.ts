import { config } from '../../../config/env';

/**
 * N8N Configuration for EO Clínica Automation
 * Handles all N8N-related configurations, security, and environment setup
 */

export interface N8NConfig {
  baseUrl: string;
  webhookUrl: string;
  basicAuth: {
    username: string;
    password: string;
  };
  database: {
    type: 'postgres';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  encryption: {
    key: string;
  };
  timezone: string;
  maxExecutions: number;
  retentionDays: number;
}

export const n8nConfig: N8NConfig = {
  baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
  webhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678',
  basicAuth: {
    username: process.env.N8N_BASIC_AUTH_USER || 'admin',
    password: process.env.N8N_BASIC_AUTH_PASSWORD || 'admin123'
  },
  database: {
    type: 'postgres',
    host: process.env.N8N_DB_HOST || 'postgres',
    port: parseInt(process.env.N8N_DB_PORT || '5432'),
    database: process.env.N8N_DB_DATABASE || 'eo_clinica_db',
    username: process.env.N8N_DB_USERNAME || 'clinic_user',
    password: process.env.N8N_DB_PASSWORD || 'clinic_password'
  },
  encryption: {
    key: process.env.N8N_ENCRYPTION_KEY || 'eo-clinica-n8n-encryption-key-2024'
  },
  timezone: 'America/Sao_Paulo',
  maxExecutions: 10000,
  retentionDays: 90
};

/**
 * Environment variables for N8N Docker configuration
 */
export const n8nEnvironmentVariables = {
  // Basic Configuration
  N8N_BASIC_AUTH_ACTIVE: 'true',
  N8N_BASIC_AUTH_USER: n8nConfig.basicAuth.username,
  N8N_BASIC_AUTH_PASSWORD: n8nConfig.basicAuth.password,
  
  // Host Configuration
  N8N_HOST: '0.0.0.0',
  N8N_PORT: '5678',
  N8N_PROTOCOL: 'http',
  
  // Webhook Configuration
  WEBHOOK_URL: n8nConfig.webhookUrl,
  
  // Database Configuration
  DB_TYPE: n8nConfig.database.type,
  DB_POSTGRESDB_HOST: n8nConfig.database.host,
  DB_POSTGRESDB_PORT: n8nConfig.database.port.toString(),
  DB_POSTGRESDB_DATABASE: n8nConfig.database.database,
  DB_POSTGRESDB_USER: n8nConfig.database.username,
  DB_POSTGRESDB_PASSWORD: n8nConfig.database.password,
  
  // Security
  N8N_ENCRYPTION_KEY: n8nConfig.encryption.key,
  N8N_USER_MANAGEMENT_JWT_SECRET: process.env.JWT_SECRET || 'eo-clinica-jwt-secret',
  
  // Execution Configuration
  EXECUTIONS_MODE: 'queue',
  EXECUTIONS_DATA_SAVE_ON_ERROR: 'all',
  EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'all',
  EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS: 'true',
  EXECUTIONS_DATA_PRUNE: 'true',
  EXECUTIONS_DATA_MAX_AGE: n8nConfig.retentionDays.toString(),
  
  // Queue Configuration
  QUEUE_BULL_REDIS_HOST: 'redis',
  QUEUE_BULL_REDIS_PORT: '6379',
  QUEUE_HEALTH_CHECK_ACTIVE: 'true',
  
  // Timezone
  GENERIC_TIMEZONE: n8nConfig.timezone,
  TZ: n8nConfig.timezone,
  
  // Custom Nodes
  N8N_CUSTOM_EXTENSIONS: '/home/node/.n8n/custom',
  
  // Logging
  N8N_LOG_LEVEL: 'info',
  N8N_LOG_OUTPUT: 'console',
  
  // Security Headers
  N8N_SECURE_COOKIE: 'false', // Set to true in production with HTTPS
  N8N_METRICS: 'true',
  
  // Clinic-specific configuration
  CLINIC_API_BASE_URL: process.env.API_BASE_URL || 'http://app:3000',
  CLINIC_AI_API_URL: process.env.CLAUDE_API_URL || 'https://api.anthropic.com',
  CLINIC_FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001'
};

/**
 * N8N Custom Node Credentials for EO Clínica integrations
 */
export const customCredentials = {
  'eoClinicaApi': {
    name: 'EO Clínica API',
    displayName: 'EO Clínica API',
    documentationUrl: 'https://docs.eo-clinica.com/api',
    properties: [
      {
        displayName: 'Base URL',
        name: 'baseUrl',
        type: 'string',
        default: process.env.API_BASE_URL || 'http://app:3000'
      },
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        typeOptions: {
          password: true
        },
        default: ''
      }
    ]
  },
  'whatsappBusiness': {
    name: 'WhatsApp Business API',
    displayName: 'WhatsApp Business',
    documentationUrl: 'https://developers.facebook.com/docs/whatsapp',
    properties: [
      {
        displayName: 'Phone Number ID',
        name: 'phoneNumberId',
        type: 'string',
        default: ''
      },
      {
        displayName: 'Access Token',
        name: 'accessToken',
        type: 'string',
        typeOptions: {
          password: true
        },
        default: ''
      },
      {
        displayName: 'Webhook Verify Token',
        name: 'webhookVerifyToken',
        type: 'string',
        typeOptions: {
          password: true
        },
        default: ''
      }
    ]
  },
  'twilioSms': {
    name: 'Twilio SMS',
    displayName: 'Twilio SMS Gateway',
    documentationUrl: 'https://www.twilio.com/docs/sms',
    properties: [
      {
        displayName: 'Account SID',
        name: 'accountSid',
        type: 'string',
        default: ''
      },
      {
        displayName: 'Auth Token',
        name: 'authToken',
        type: 'string',
        typeOptions: {
          password: true
        },
        default: ''
      },
      {
        displayName: 'From Phone Number',
        name: 'fromPhoneNumber',
        type: 'string',
        default: ''
      }
    ]
  },
  'googleCalendar': {
    name: 'Google Calendar',
    displayName: 'Google Calendar Integration',
    documentationUrl: 'https://developers.google.com/calendar',
    properties: [
      {
        displayName: 'Client ID',
        name: 'clientId',
        type: 'string',
        default: ''
      },
      {
        displayName: 'Client Secret',
        name: 'clientSecret',
        type: 'string',
        typeOptions: {
          password: true
        },
        default: ''
      },
      {
        displayName: 'Refresh Token',
        name: 'refreshToken',
        type: 'string',
        typeOptions: {
          password: true
        },
        default: ''
      }
    ]
  }
};

/**
 * Workflow execution settings with error handling and retry logic
 */
export const workflowSettings = {
  retryOnFail: true,
  maxRetries: 3,
  retryInterval: 1000, // 1 second
  saveDataErrorExecution: 'all',
  saveDataSuccessExecution: 'all',
  saveManualExecutions: true,
  callerPolicy: 'workflowsFromSameOwner',
  errorWorkflow: 'error-handler-workflow',
  timezone: n8nConfig.timezone
};

/**
 * Security configurations for production deployment
 */
export const securityConfig = {
  // CORS Configuration
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3001',
      process.env.ADMIN_URL || 'http://localhost:3002'
    ],
    credentials: true
  },
  
  // Rate limiting
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Webhook security
  webhook: {
    maxPayloadSize: '10mb',
    timeout: 30000, // 30 seconds
    verifySignature: true
  }
};