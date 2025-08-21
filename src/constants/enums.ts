/**
 * 🔧 EO Clínica - Enums e Constantes Centralizadas
 *
 * Este arquivo centraliza todos os enums e constantes utilizados em todo o projeto,
 * tanto no código principal quanto nos testes, evitando inconsistências.
 *
 * IMPORTANTE: Use sempre essas constantes em vez de strings literais ou enums duplicados.
 */

// =============================================================================
// 📅 APPOINTMENT - Status e Tipos de Consulta
// =============================================================================

export const APPOINTMENT_STATUS = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  RESCHEDULED: 'RESCHEDULED',
} as const;

export const APPOINTMENT_TYPE = {
  CONSULTATION: 'CONSULTATION',
  FOLLOW_UP: 'FOLLOW_UP',
  EMERGENCY: 'EMERGENCY',
  ROUTINE_CHECKUP: 'ROUTINE_CHECKUP',
  PROCEDURE: 'PROCEDURE',
  SURGERY: 'SURGERY',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

// =============================================================================
// 🏥 SCHEDULING - Agendamento e Conflitos
// =============================================================================

export const CONFLICT_TYPE = {
  DOUBLE_BOOKING: 'DOUBLE_BOOKING',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  DOCTOR_UNAVAILABLE: 'DOCTOR_UNAVAILABLE',
  ROOM_UNAVAILABLE: 'ROOM_UNAVAILABLE',
  EQUIPMENT_UNAVAILABLE: 'EQUIPMENT_UNAVAILABLE',
  OUTSIDE_BUSINESS_HOURS: 'OUTSIDE_BUSINESS_HOURS',
  INSUFFICIENT_BUFFER: 'INSUFFICIENT_BUFFER',
  SPECIALTY_MISMATCH: 'SPECIALTY_MISMATCH',
} as const;

export const CONFLICT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const RESOLUTION_STRATEGY = {
  AUTO_RESCHEDULE: 'AUTO_RESCHEDULE',
  MANUAL_INTERVENTION: 'MANUAL_INTERVENTION',
  OVERFLOW_BOOKING: 'OVERFLOW_BOOKING',
  WAITLIST: 'WAITLIST',
  RESOURCE_SUBSTITUTION: 'RESOURCE_SUBSTITUTION',
} as const;

export const CANCELLATION_CODE = {
  PATIENT_REQUEST: 'PATIENT_REQUEST',
  DOCTOR_UNAVAILABLE: 'DOCTOR_UNAVAILABLE',
  MEDICAL_EMERGENCY: 'MEDICAL_EMERGENCY',
  EQUIPMENT_FAILURE: 'EQUIPMENT_FAILURE',
  WEATHER_CONDITIONS: 'WEATHER_CONDITIONS',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  NO_SHOW: 'NO_SHOW',
  LATE_ARRIVAL: 'LATE_ARRIVAL',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
} as const;

// =============================================================================
// 👥 USER - Usuários e Autenticação
// =============================================================================

export const USER_ROLE = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
  RECEPTIONIST: 'RECEPTIONIST',
  NURSE: 'NURSE',
  MANAGER: 'MANAGER',
} as const;

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  LOCKED: 'LOCKED',
} as const;

// =============================================================================
// 💰 FINANCIAL - Sistema Financeiro
// =============================================================================

export const TRANSACTION_TYPE = {
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
  FEE: 'FEE',
  INSURANCE_CLAIM: 'INSURANCE_CLAIM',
  DISCOUNT: 'DISCOUNT',
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PROCESSING: 'PROCESSING',
  DISPUTED: 'DISPUTED',
} as const;

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  PIX: 'PIX',
  BANK_TRANSFER: 'BANK_TRANSFER',
  INSURANCE: 'INSURANCE',
  INSTALLMENT: 'INSTALLMENT',
} as const;

// =============================================================================
// 🔒 SECURITY - Segurança e Auditoria
// =============================================================================

export const AUTH_ACTION = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  FAILED_LOGIN: 'FAILED_LOGIN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
} as const;

export const AUDIT_EVENT = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  BACKUP: 'BACKUP',
  RESTORE: 'RESTORE',
} as const;

export const LOG_LEVEL = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE',
} as const;

// =============================================================================
// 🏥 MEDICAL - Informações Médicas
// =============================================================================

export const SPECIALTY_CATEGORY = {
  CLINICA_GERAL: 'CLINICA_GERAL',
  CARDIOLOGIA: 'CARDIOLOGIA',
  DERMATOLOGIA: 'DERMATOLOGIA',
  PEDIATRIA: 'PEDIATRIA',
  GINECOLOGIA: 'GINECOLOGIA',
  ORTOPEDIA: 'ORTOPEDIA',
  NEUROLOGIA: 'NEUROLOGIA',
  PSIQUIATRIA: 'PSIQUIATRIA',
  OFTALMOLOGIA: 'OFTALMOLOGIA',
  OTORRINOLARINGOLOGIA: 'OTORRINOLARINGOLOGIA',
  UROLOGIA: 'UROLOGIA',
  ENDOCRINOLOGIA: 'ENDOCRINOLOGIA',
} as const;

export const URGENCY_LEVEL = {
  ROUTINE: 1,
  LOW: 2,
  MODERATE: 3,
  HIGH: 4,
  URGENT: 5,
  VERY_URGENT: 6,
  CRITICAL: 7,
  SEVERE: 8,
  LIFE_THREATENING: 9,
  IMMEDIATE: 10,
} as const;

// =============================================================================
// 🤖 AI - Inteligência Artificial
// =============================================================================

export const AI_INTENT = {
  SCHEDULE_APPOINTMENT: 'SCHEDULE_APPOINTMENT',
  CANCEL_APPOINTMENT: 'CANCEL_APPOINTMENT',
  RESCHEDULE_APPOINTMENT: 'RESCHEDULE_APPOINTMENT',
  PRICE_INQUIRY: 'PRICE_INQUIRY',
  DOCTOR_AVAILABILITY: 'DOCTOR_AVAILABILITY',
  MEDICAL_INFORMATION: 'MEDICAL_INFORMATION',
  EMERGENCY: 'EMERGENCY',
  GENERAL_INQUIRY: 'GENERAL_INQUIRY',
  COMPLAINT: 'COMPLAINT',
  GREETING: 'GREETING',
  GOODBYE: 'GOODBYE',
} as const;

export const AI_CONFIDENCE_THRESHOLD = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  MINIMUM: 0.3,
} as const;

// =============================================================================
// 📊 PERFORMANCE - Métricas e Performance
// =============================================================================

export const PERFORMANCE_METRIC = {
  RESPONSE_TIME: 'RESPONSE_TIME',
  THROUGHPUT: 'THROUGHPUT',
  ERROR_RATE: 'ERROR_RATE',
  AVAILABILITY: 'AVAILABILITY',
  MEMORY_USAGE: 'MEMORY_USAGE',
  CPU_USAGE: 'CPU_USAGE',
  DATABASE_CONNECTIONS: 'DATABASE_CONNECTIONS',
  CACHE_HIT_RATE: 'CACHE_HIT_RATE',
} as const;

export const ALERT_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
} as const;

// =============================================================================
// 🌐 SYSTEM - Configurações do Sistema
// =============================================================================

export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export const TIME_ZONE = {
  SAO_PAULO: 'America/Sao_Paulo',
  UTC: 'UTC',
} as const;

export const LANGUAGE = {
  PT_BR: 'pt-BR',
  EN_US: 'en-US',
  ES_ES: 'es-ES',
} as const;

// =============================================================================
// 📱 NOTIFICATION - Notificações
// =============================================================================

export const NOTIFICATION_TYPE = {
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  SECURITY_ALERT: 'SECURITY_ALERT',
  AI_RECOMMENDATION: 'AI_RECOMMENDATION',
} as const;

export const NOTIFICATION_CHANNEL = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
} as const;

// =============================================================================
// 📊 BUSINESS RULES - Regras de Negócio
// =============================================================================

export const BUSINESS_CONSTANTS = {
  // Horários de funcionamento padrão
  DEFAULT_WORKING_HOURS: {
    START: '08:00',
    END: '18:00',
    LUNCH_START: '12:00',
    LUNCH_END: '13:00',
  },

  // Durações padrão (em minutos)
  DEFAULT_DURATION: {
    CONSULTATION: 30,
    FOLLOW_UP: 20,
    EMERGENCY: 45,
    ROUTINE_CHECKUP: 30,
    PROCEDURE: 60,
    SURGERY: 120,
  },

  // Limites do sistema
  LIMITS: {
    MAX_APPOINTMENTS_PER_DAY: 20,
    MAX_RESCHEDULE_COUNT: 3,
    MAX_QUEUE_WAIT_DAYS: 30,
    MIN_ADVANCE_BOOKING_HOURS: 1,
    MAX_ADVANCE_BOOKING_DAYS: 90,
    CANCELLATION_POLICY_HOURS: 24,
  },

  // Configurações financeiras
  FINANCIAL: {
    CURRENCY: 'BRL',
    DECIMAL_PLACES: 2,
    DEFAULT_TAX_RATE: 0.05, // 5%
    LATE_PAYMENT_FEE_RATE: 0.02, // 2%
    INSURANCE_PROCESSING_DAYS: 15,
  },

  // Configurações de segurança
  SECURITY: {
    PASSWORD_MIN_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    SESSION_TIMEOUT_MINUTES: 30,
    JWT_EXPIRY_MINUTES: 60,
    REFRESH_TOKEN_DAYS: 7,
    PASSWORD_RESET_EXPIRY_HOURS: 2,
  },

  // Configurações de performance
  PERFORMANCE: {
    API_TIMEOUT_MS: 30000,
    CACHE_TTL_MINUTES: 15,
    MAX_CONCURRENT_REQUESTS: 100,
    DATABASE_POOL_SIZE: 20,
    RATE_LIMIT_REQUESTS_PER_MINUTE: 100,
  },
} as const;

// =============================================================================
// 🎯 UTILITY TYPES - Tipos Utilitários
// =============================================================================

// Extrair valores dos objetos const assertion para uso como tipos
export type AppointmentStatusType = keyof typeof APPOINTMENT_STATUS;
export type AppointmentTypeType = keyof typeof APPOINTMENT_TYPE;
export type PaymentStatusType = keyof typeof PAYMENT_STATUS;
export type UserRoleType = keyof typeof USER_ROLE;
export type UserStatusType = keyof typeof USER_STATUS;
export type TransactionTypeType = keyof typeof TRANSACTION_TYPE;
export type TransactionStatusType = keyof typeof TRANSACTION_STATUS;
export type PaymentMethodType = keyof typeof PAYMENT_METHOD;
export type ConflictTypeType = keyof typeof CONFLICT_TYPE;
export type ConflictSeverityType = keyof typeof CONFLICT_SEVERITY;
export type ResolutionStrategyType = keyof typeof RESOLUTION_STRATEGY;
export type CancellationCodeType = keyof typeof CANCELLATION_CODE;
export type SpecialtyCategoryType = keyof typeof SPECIALTY_CATEGORY;
export type AIIntentType = keyof typeof AI_INTENT;
export type NotificationTypeType = keyof typeof NOTIFICATION_TYPE;
export type NotificationChannelType = keyof typeof NOTIFICATION_CHANNEL;

// Arrays para validação e iteração
export const APPOINTMENT_STATUS_VALUES = Object.values(APPOINTMENT_STATUS);
export const APPOINTMENT_TYPE_VALUES = Object.values(APPOINTMENT_TYPE);
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);
export const USER_ROLE_VALUES = Object.values(USER_ROLE);
export const USER_STATUS_VALUES = Object.values(USER_STATUS);
export const TRANSACTION_TYPE_VALUES = Object.values(TRANSACTION_TYPE);
export const TRANSACTION_STATUS_VALUES = Object.values(TRANSACTION_STATUS);
export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHOD);
export const CONFLICT_TYPE_VALUES = Object.values(CONFLICT_TYPE);
export const CONFLICT_SEVERITY_VALUES = Object.values(CONFLICT_SEVERITY);
export const RESOLUTION_STRATEGY_VALUES = Object.values(RESOLUTION_STRATEGY);
export const CANCELLATION_CODE_VALUES = Object.values(CANCELLATION_CODE);
export const SPECIALTY_CATEGORY_VALUES = Object.values(SPECIALTY_CATEGORY);
export const AI_INTENT_VALUES = Object.values(AI_INTENT);
export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPE);
export const NOTIFICATION_CHANNEL_VALUES = Object.values(NOTIFICATION_CHANNEL);

// =============================================================================
// 🔧 VALIDATION HELPERS - Helpers de Validação
// =============================================================================

/**
 * Valida se um valor é um status de consulta válido
 */
export const isValidAppointmentStatus = (
  status: string,
): status is AppointmentStatusType => {
  return APPOINTMENT_STATUS_VALUES.includes(status as (typeof APPOINTMENT_STATUS_VALUES)[number]);
};

/**
 * Valida se um valor é um tipo de consulta válido
 */
export const isValidAppointmentType = (
  type: string,
): type is AppointmentTypeType => {
  return APPOINTMENT_TYPE_VALUES.includes(type as (typeof APPOINTMENT_TYPE_VALUES)[number]);
};

/**
 * Valida se um valor é um role de usuário válido
 */
export const isValidUserRole = (role: string): role is UserRoleType => {
  return USER_ROLE_VALUES.includes(role as (typeof USER_ROLE_VALUES)[number]);
};

/**
 * Valida se um valor é um status de usuário válido
 */
export const isValidUserStatus = (status: string): status is UserStatusType => {
  return USER_STATUS_VALUES.includes(status as (typeof USER_STATUS_VALUES)[number]);
};

/**
 * Obtém a duração padrão baseada no tipo de consulta
 */
export const getDefaultDuration = (appointmentType: string): number => {
  switch (appointmentType) {
    case APPOINTMENT_TYPE.CONSULTATION:
      return BUSINESS_CONSTANTS.DEFAULT_DURATION.CONSULTATION;
    case APPOINTMENT_TYPE.FOLLOW_UP:
      return BUSINESS_CONSTANTS.DEFAULT_DURATION.FOLLOW_UP;
    case APPOINTMENT_TYPE.EMERGENCY:
      return BUSINESS_CONSTANTS.DEFAULT_DURATION.EMERGENCY;
    case APPOINTMENT_TYPE.ROUTINE_CHECKUP:
      return BUSINESS_CONSTANTS.DEFAULT_DURATION.ROUTINE_CHECKUP;
    case APPOINTMENT_TYPE.PROCEDURE:
      return BUSINESS_CONSTANTS.DEFAULT_DURATION.PROCEDURE;
    case APPOINTMENT_TYPE.SURGERY:
      return BUSINESS_CONSTANTS.DEFAULT_DURATION.SURGERY;
    default:
      return BUSINESS_CONSTANTS.DEFAULT_DURATION.CONSULTATION;
  }
};

/**
 * Obtém o nível de urgência baseado no tipo de consulta
 */
export const getUrgencyLevel = (appointmentType: string): number => {
  switch (appointmentType) {
    case APPOINTMENT_TYPE.EMERGENCY:
      return URGENCY_LEVEL.LIFE_THREATENING;
    case APPOINTMENT_TYPE.PROCEDURE:
    case APPOINTMENT_TYPE.SURGERY:
      return URGENCY_LEVEL.HIGH;
    case APPOINTMENT_TYPE.FOLLOW_UP:
      return URGENCY_LEVEL.MODERATE;
    case APPOINTMENT_TYPE.ROUTINE_CHECKUP:
      return URGENCY_LEVEL.LOW;
    default:
      return URGENCY_LEVEL.ROUTINE;
  }
};

/**
 * Verifica se um tipo de consulta é considerado emergência
 */
export const isEmergencyType = (appointmentType: string): boolean => {
  return appointmentType === APPOINTMENT_TYPE.EMERGENCY;
};

/**
 * Obtém a cor/badge baseada no status da consulta
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case APPOINTMENT_STATUS.SCHEDULED:
      return 'blue';
    case APPOINTMENT_STATUS.CONFIRMED:
      return 'green';
    case APPOINTMENT_STATUS.IN_PROGRESS:
      return 'yellow';
    case APPOINTMENT_STATUS.COMPLETED:
      return 'green';
    case APPOINTMENT_STATUS.CANCELLED:
      return 'red';
    case APPOINTMENT_STATUS.NO_SHOW:
      return 'gray';
    case APPOINTMENT_STATUS.RESCHEDULED:
      return 'orange';
    default:
      return 'gray';
  }
};

// =============================================================================
// 📝 DOCUMENTATION
// =============================================================================

/**
 * COMO USAR ESTE ARQUIVO:
 *
 * 1. EM CÓDIGO PRINCIPAL:
 *    import { APPOINTMENT_STATUS, APPOINTMENT_TYPE } from '@/constants/enums';
 *
 *    const appointment = {
 *      status: APPOINTMENT_STATUS.SCHEDULED,
 *      type: APPOINTMENT_TYPE.CONSULTATION
 *    };
 *
 * 2. EM TESTES:
 *    import { APPOINTMENT_STATUS, APPOINTMENT_TYPE } from '../src/constants/enums';
 *
 *    expect(appointment.status).toBe(APPOINTMENT_STATUS.SCHEDULED);
 *
 * 3. VALIDAÇÃO ZOD:
 *    import { APPOINTMENT_STATUS_VALUES } from '@/constants/enums';
 *
 *    const schema = z.object({
 *      status: z.enum(APPOINTMENT_STATUS_VALUES)
 *    });
 *
 * 4. HELPERS:
 *    import { isValidAppointmentStatus, getDefaultDuration } from '@/constants/enums';
 *
 *    if (isValidAppointmentStatus(status)) {
 *      const duration = getDefaultDuration(appointmentType);
 *    }
 */
