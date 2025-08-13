import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  SALT_ROUNDS: z.string().transform(Number).default(12),

  // AI Integration
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_API_VERSION: z.string().default('2023-06-01'),

  // ChromaDB
  CHROMA_HOST: z.string().default('localhost'),
  CHROMA_PORT: z.string().transform(Number).default(8000),
  CHROMA_COLLECTION_NAME: z.string().default('clinic_conversations'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_SECURE: z.string().transform(val => val === 'true').default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // WhatsApp
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  // Google Calendar
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // N8N
  N8N_WEBHOOK_URL: z.string().optional(),
  N8N_API_KEY: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // LGPD
  DATA_RETENTION_DAYS: z.string().transform(Number).default(2555),
  AUDIT_LOG_RETENTION_DAYS: z.string().transform(Number).default(3650),

  // Timezone
  TIMEZONE: z.string().default('America/Sao_Paulo'),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default(10485760),
  ALLOWED_FILE_TYPES: z.string().default('jpg,jpeg,png,pdf,doc,docx'),

  // Health Check
  HEALTH_CHECK_TIMEOUT: z.string().transform(Number).default(5000),

  // Feature Flags
  ENABLE_AI_INTEGRATION: z.string().transform(val => val === 'true').default(true),
  ENABLE_WHATSAPP_INTEGRATION: z.string().transform(val => val === 'true').default(false),
  ENABLE_GOOGLE_CALENDAR: z.string().transform(val => val === 'true').default(false),
  ENABLE_AUDIT_LOGS: z.string().transform(val => val === 'true').default(true),
});

// Validate and export environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('[ERROR] Invalid environment variables:', error);
  process.exit(1);
}

export { env };
export type Env = typeof env;