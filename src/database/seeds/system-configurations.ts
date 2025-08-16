import { PrismaClient } from '../generated/client';

// Simple logger for seed
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
};

const systemConfigurations = [
  // Business Rules
  {
    key: 'APPOINTMENT_MIN_ADVANCE_HOURS',
    value: '2',
    description: 'Minimum hours in advance to schedule an appointment',
    category: 'business_rules',
  },
  {
    key: 'APPOINTMENT_CANCEL_MIN_HOURS',
    value: '24',
    description: 'Minimum hours in advance to cancel an appointment',
    category: 'business_rules',
  },
  {
    key: 'APPOINTMENT_MAX_RESCHEDULES',
    value: '2',
    description: 'Maximum number of reschedules allowed per appointment',
    category: 'business_rules',
  },
  {
    key: 'CLINIC_WORKING_HOURS_START',
    value: '07:00',
    description: 'Clinic opening time on weekdays',
    category: 'working_hours',
  },
  {
    key: 'CLINIC_WORKING_HOURS_END',
    value: '19:00',
    description: 'Clinic closing time on weekdays',
    category: 'working_hours',
  },
  {
    key: 'CLINIC_SATURDAY_HOURS_START',
    value: '08:00',
    description: 'Clinic opening time on Saturday',
    category: 'working_hours',
  },
  {
    key: 'CLINIC_SATURDAY_HOURS_END',
    value: '14:00',
    description: 'Clinic closing time on Saturday',
    category: 'working_hours',
  },
  {
    key: 'CLINIC_SUNDAY_CLOSED',
    value: 'true',
    description: 'Whether clinic is closed on Sunday',
    category: 'working_hours',
  },

  // Notification Settings
  {
    key: 'APPOINTMENT_REMINDER_HOURS',
    value: '24',
    description: 'Hours before appointment to send reminder',
    category: 'notifications',
  },
  {
    key: 'EMAIL_NOTIFICATIONS_ENABLED',
    value: 'true',
    description: 'Whether email notifications are enabled',
    category: 'notifications',
  },
  {
    key: 'SMS_NOTIFICATIONS_ENABLED',
    value: 'false',
    description: 'Whether SMS notifications are enabled',
    category: 'notifications',
  },
  {
    key: 'WHATSAPP_NOTIFICATIONS_ENABLED',
    value: 'false',
    description: 'Whether WhatsApp notifications are enabled',
    category: 'notifications',
  },

  // AI Integration Settings
  {
    key: 'AI_CONVERSATION_ENABLED',
    value: 'true',
    description: 'Whether AI conversation feature is enabled',
    category: 'ai_integration',
  },
  {
    key: 'AI_APPOINTMENT_BOOKING_ENABLED',
    value: 'true',
    description: 'Whether AI can book appointments',
    category: 'ai_integration',
  },
  {
    key: 'AI_CONVERSATION_TIMEOUT_MINUTES',
    value: '30',
    description: 'Timeout for AI conversations in minutes',
    category: 'ai_integration',
  },

  // Security Settings
  {
    key: 'SESSION_TIMEOUT_MINUTES',
    value: '60',
    description: 'User session timeout in minutes',
    category: 'security',
  },
  {
    key: 'MAX_LOGIN_ATTEMPTS',
    value: '5',
    description: 'Maximum login attempts before account lockout',
    category: 'security',
  },
  {
    key: 'PASSWORD_MIN_LENGTH',
    value: '8',
    description: 'Minimum password length',
    category: 'security',
  },
  {
    key: 'REQUIRE_EMAIL_VERIFICATION',
    value: 'true',
    description: 'Whether email verification is required for new accounts',
    category: 'security',
  },

  // LGPD Compliance
  {
    key: 'DATA_RETENTION_DAYS',
    value: '2555',
    description: 'Number of days to retain patient data (7 years)',
    category: 'lgpd',
  },
  {
    key: 'AUDIT_LOG_RETENTION_DAYS',
    value: '3650',
    description: 'Number of days to retain audit logs (10 years)',
    category: 'lgpd',
  },
  {
    key: 'AUTOMATIC_DATA_ANONYMIZATION',
    value: 'true',
    description:
      'Whether to automatically anonymize data after retention period',
    category: 'lgpd',
  },

  // Feature Flags
  {
    key: 'FEATURE_ONLINE_CONSULTATION',
    value: 'false',
    description: 'Whether online consultation feature is available',
    category: 'features',
  },
  {
    key: 'FEATURE_PAYMENT_INTEGRATION',
    value: 'false',
    description: 'Whether payment integration is enabled',
    category: 'features',
  },
  {
    key: 'FEATURE_MULTI_CLINIC',
    value: 'false',
    description: 'Whether multi-clinic support is enabled',
    category: 'features',
  },

  // Clinic Information
  {
    key: 'CLINIC_NAME',
    value: 'EO Clínica',
    description: 'Name of the clinic',
    category: 'clinic_info',
  },
  {
    key: 'CLINIC_ADDRESS',
    value: 'Rua das Flores, 123 - Centro - São Paulo/SP',
    description: 'Address of the clinic',
    category: 'clinic_info',
  },
  {
    key: 'CLINIC_PHONE',
    value: '+55 11 1234-5678',
    description: 'Main phone number of the clinic',
    category: 'clinic_info',
  },
  {
    key: 'CLINIC_EMAIL',
    value: 'contato@eoclinica.com.br',
    description: 'Main email address of the clinic',
    category: 'clinic_info',
  },
  {
    key: 'CLINIC_CNPJ',
    value: '12.345.678/0001-90',
    description: 'CNPJ of the clinic',
    category: 'clinic_info',
    isEncrypted: true,
  },
];

export async function seedSystemConfigurations(
  prisma: PrismaClient,
): Promise<void> {
  try {
    logger.info('Seeding system configurations...');

    for (const config of systemConfigurations) {
      await prisma.systemConfiguration.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          description: config.description,
          category: config.category,
          isEncrypted: config.isEncrypted || false,
        },
        create: config,
      });
    }

    const count = await prisma.systemConfiguration.count();
    logger.info(`[SUCCESS] Seeded ${count} system configurations`);
  } catch (error) {
    logger.error('[ERROR] Failed to seed system configurations:', error);
    throw error;
  }
}
