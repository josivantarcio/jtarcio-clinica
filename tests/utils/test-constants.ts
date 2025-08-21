/**
 * 🧪 EO Clínica - Constantes e Helpers para Testes
 * 
 * Este arquivo fornece constantes, helpers e mocks padronizados para uso em todos os testes,
 * garantindo consistência e evitando duplicação de código.
 * 
 * IMPORTANTE: Sempre use essas constantes em vez de valores hard-coded nos testes.
 */

import { 
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
  PAYMENT_STATUS,
  USER_ROLE,
  USER_STATUS,
  CONFLICT_TYPE,
  CONFLICT_SEVERITY,
  RESOLUTION_STRATEGY,
  CANCELLATION_CODE,
  SPECIALTY_CATEGORY,
  AI_INTENT,
  URGENCY_LEVEL,
  BUSINESS_CONSTANTS
} from '../../src/constants/enums';

// =============================================================================
// 📅 APPOINTMENT TEST DATA
// =============================================================================

/**
 * Status de consulta para uso em testes
 * Resolve o problema de enum TypeScript encontrado nos testes originais
 */
export const TEST_APPOINTMENT_STATUS = {
  PENDING: APPOINTMENT_STATUS.PENDING,
  SCHEDULED: APPOINTMENT_STATUS.SCHEDULED,
  CONFIRMED: APPOINTMENT_STATUS.CONFIRMED,
  IN_PROGRESS: APPOINTMENT_STATUS.IN_PROGRESS,
  COMPLETED: APPOINTMENT_STATUS.COMPLETED,
  CANCELLED: APPOINTMENT_STATUS.CANCELLED,
  NO_SHOW: APPOINTMENT_STATUS.NO_SHOW,
  RESCHEDULED: APPOINTMENT_STATUS.RESCHEDULED,
} as const;

/**
 * Tipos de consulta para uso em testes
 */
export const TEST_APPOINTMENT_TYPE = {
  CONSULTATION: APPOINTMENT_TYPE.CONSULTATION,
  FOLLOW_UP: APPOINTMENT_TYPE.FOLLOW_UP,
  EMERGENCY: APPOINTMENT_TYPE.EMERGENCY,
  ROUTINE_CHECKUP: APPOINTMENT_TYPE.ROUTINE_CHECKUP,
  PROCEDURE: APPOINTMENT_TYPE.PROCEDURE,
  SURGERY: APPOINTMENT_TYPE.SURGERY,
} as const;

/**
 * Transições de status válidas para testes de state machine
 */
export const VALID_STATUS_TRANSITIONS = {
  [TEST_APPOINTMENT_STATUS.PENDING]: [
    TEST_APPOINTMENT_STATUS.SCHEDULED, 
    TEST_APPOINTMENT_STATUS.CANCELLED
  ],
  [TEST_APPOINTMENT_STATUS.SCHEDULED]: [
    TEST_APPOINTMENT_STATUS.CONFIRMED, 
    TEST_APPOINTMENT_STATUS.CANCELLED, 
    TEST_APPOINTMENT_STATUS.RESCHEDULED
  ],
  [TEST_APPOINTMENT_STATUS.CONFIRMED]: [
    TEST_APPOINTMENT_STATUS.IN_PROGRESS, 
    TEST_APPOINTMENT_STATUS.CANCELLED, 
    TEST_APPOINTMENT_STATUS.NO_SHOW
  ],
  [TEST_APPOINTMENT_STATUS.IN_PROGRESS]: [
    TEST_APPOINTMENT_STATUS.COMPLETED, 
    TEST_APPOINTMENT_STATUS.CANCELLED
  ],
  [TEST_APPOINTMENT_STATUS.COMPLETED]: [],
  [TEST_APPOINTMENT_STATUS.CANCELLED]: [TEST_APPOINTMENT_STATUS.RESCHEDULED],
  [TEST_APPOINTMENT_STATUS.NO_SHOW]: [TEST_APPOINTMENT_STATUS.RESCHEDULED],
  [TEST_APPOINTMENT_STATUS.RESCHEDULED]: [TEST_APPOINTMENT_STATUS.SCHEDULED]
} as const;

// =============================================================================
// 🏥 MEDICAL TEST DATA
// =============================================================================

/**
 * Especialidades médicas para testes
 */
export const TEST_SPECIALTIES = {
  CLINICA_GERAL: SPECIALTY_CATEGORY.CLINICA_GERAL,
  CARDIOLOGIA: SPECIALTY_CATEGORY.CARDIOLOGIA,
  DERMATOLOGIA: SPECIALTY_CATEGORY.DERMATOLOGIA,
  PEDIATRIA: SPECIALTY_CATEGORY.PEDIATRIA,
  GINECOLOGIA: SPECIALTY_CATEGORY.GINECOLOGIA,
  ORTOPEDIA: SPECIALTY_CATEGORY.ORTOPEDIA,
} as const;

/**
 * Níveis de urgência para testes de emergência
 */
export const TEST_URGENCY_LEVELS = {
  ROUTINE: URGENCY_LEVEL.ROUTINE,
  LOW: URGENCY_LEVEL.LOW,
  MODERATE: URGENCY_LEVEL.MODERATE,
  HIGH: URGENCY_LEVEL.HIGH,
  URGENT: URGENCY_LEVEL.URGENT,
  VERY_URGENT: URGENCY_LEVEL.VERY_URGENT,
  CRITICAL: URGENCY_LEVEL.CRITICAL,
  SEVERE: URGENCY_LEVEL.SEVERE,
  LIFE_THREATENING: URGENCY_LEVEL.LIFE_THREATENING,
  IMMEDIATE: URGENCY_LEVEL.IMMEDIATE,
} as const;

// =============================================================================
// 👥 USER TEST DATA
// =============================================================================

/**
 * Roles de usuário para testes
 */
export const TEST_USER_ROLES = {
  ADMIN: USER_ROLE.ADMIN,
  DOCTOR: USER_ROLE.DOCTOR,
  PATIENT: USER_ROLE.PATIENT,
  RECEPTIONIST: USER_ROLE.RECEPTIONIST,
  NURSE: USER_ROLE.NURSE,
  MANAGER: USER_ROLE.MANAGER,
} as const;

/**
 * Status de usuário para testes
 */
export const TEST_USER_STATUS = {
  ACTIVE: USER_STATUS.ACTIVE,
  INACTIVE: USER_STATUS.INACTIVE,
  SUSPENDED: USER_STATUS.SUSPENDED,
  PENDING_VERIFICATION: USER_STATUS.PENDING_VERIFICATION,
  LOCKED: USER_STATUS.LOCKED,
} as const;

// =============================================================================
// 🤖 AI TEST DATA
// =============================================================================

/**
 * Intents de IA para testes de NLP
 */
export const TEST_AI_INTENTS = {
  SCHEDULE_APPOINTMENT: AI_INTENT.SCHEDULE_APPOINTMENT,
  CANCEL_APPOINTMENT: AI_INTENT.CANCEL_APPOINTMENT,
  RESCHEDULE_APPOINTMENT: AI_INTENT.RESCHEDULE_APPOINTMENT,
  PRICE_INQUIRY: AI_INTENT.PRICE_INQUIRY,
  DOCTOR_AVAILABILITY: AI_INTENT.DOCTOR_AVAILABILITY,
  MEDICAL_INFORMATION: AI_INTENT.MEDICAL_INFORMATION,
  EMERGENCY: AI_INTENT.EMERGENCY,
  GENERAL_INQUIRY: AI_INTENT.GENERAL_INQUIRY,
} as const;

// =============================================================================
// 🗓️ SCHEDULING TEST DATA
// =============================================================================

/**
 * Tipos de conflito para testes de agendamento
 */
export const TEST_CONFLICT_TYPES = {
  DOUBLE_BOOKING: CONFLICT_TYPE.DOUBLE_BOOKING,
  RESOURCE_CONFLICT: CONFLICT_TYPE.RESOURCE_CONFLICT,
  DOCTOR_UNAVAILABLE: CONFLICT_TYPE.DOCTOR_UNAVAILABLE,
  ROOM_UNAVAILABLE: CONFLICT_TYPE.ROOM_UNAVAILABLE,
  OUTSIDE_BUSINESS_HOURS: CONFLICT_TYPE.OUTSIDE_BUSINESS_HOURS,
} as const;

/**
 * Severidade de conflitos para testes
 */
export const TEST_CONFLICT_SEVERITY = {
  LOW: CONFLICT_SEVERITY.LOW,
  MEDIUM: CONFLICT_SEVERITY.MEDIUM,
  HIGH: CONFLICT_SEVERITY.HIGH,
  CRITICAL: CONFLICT_SEVERITY.CRITICAL,
} as const;

// =============================================================================
// 🧪 TEST HELPERS - Funções Auxiliares para Testes
// =============================================================================

/**
 * Gera IDs únicos para testes
 */
export const generateTestId = (prefix: string = 'test'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Gera CPF válido para testes
 */
export const generateValidTestCPF = (): string => {
  return '123.456.789-09'; // CPF válido fixo para testes
};

/**
 * Gera email de teste único
 */
export const generateTestEmail = (domain: string = 'test.com'): string => {
  return `test.${Date.now()}@${domain}`;
};

/**
 * Gera telefone de teste
 */
export const generateTestPhone = (): string => {
  return '(11) 99999-9999';
};

/**
 * Cria data de teste com offset em dias
 */
export const createTestDate = (daysFromNow: number = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

/**
 * Cria horário de teste formatado
 */
export const createTestTime = (hour: number, minute: number = 0): string => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// =============================================================================
// 📊 TEST DATA FACTORIES - Factories para Criação de Dados de Teste
// =============================================================================

/**
 * Factory para criar dados de paciente de teste
 */
export const createTestPatient = (overrides: Record<string, any> = {}) => ({
  id: generateTestId('patient'),
  firstName: 'João',
  lastName: 'Silva',
  email: generateTestEmail(),
  phone: generateTestPhone(),
  cpf: generateValidTestCPF(),
  birthDate: new Date('1990-01-01'),
  status: TEST_USER_STATUS.ACTIVE,
  role: TEST_USER_ROLES.PATIENT,
  ...overrides
});

/**
 * Factory para criar dados de médico de teste
 */
export const createTestDoctor = (overrides: Record<string, any> = {}) => ({
  id: generateTestId('doctor'),
  firstName: 'Dr. Maria',
  lastName: 'Santos',
  email: generateTestEmail(),
  phone: generateTestPhone(),
  cpf: generateValidTestCPF(),
  crm: '123456',
  specialtyId: generateTestId('specialty'),
  status: TEST_USER_STATUS.ACTIVE,
  role: TEST_USER_ROLES.DOCTOR,
  isActive: true,
  acceptsNewPatients: true,
  ...overrides
});

/**
 * Factory para criar dados de consulta de teste
 */
export const createTestAppointment = (overrides: Record<string, any> = {}) => ({
  id: generateTestId('appointment'),
  patientId: generateTestId('patient'),
  doctorId: generateTestId('doctor'),
  specialtyId: generateTestId('specialty'),
  scheduledAt: createTestDate(1),
  duration: BUSINESS_CONSTANTS.DEFAULT_DURATION.CONSULTATION,
  endTime: new Date(createTestDate(1).getTime() + 30 * 60 * 1000),
  status: TEST_APPOINTMENT_STATUS.SCHEDULED,
  type: TEST_APPOINTMENT_TYPE.CONSULTATION,
  reason: 'Consulta de rotina para avaliação médica',
  paymentStatus: PAYMENT_STATUS.PENDING,
  fee: 15000, // R$ 150.00 em centavos
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

/**
 * Factory para criar dados de especialidade de teste
 */
export const createTestSpecialty = (overrides: Record<string, any> = {}) => ({
  id: generateTestId('specialty'),
  name: TEST_SPECIALTIES.CLINICA_GERAL,
  description: 'Clínica Geral - Atendimento médico abrangente',
  duration: BUSINESS_CONSTANTS.DEFAULT_DURATION.CONSULTATION,
  price: 15000, // R$ 150.00 em centavos
  isActive: true,
  ...overrides
});

/**
 * Factory para criar horário disponível de teste
 */
export const createTestAvailableSlot = (overrides: Record<string, any> = {}) => ({
  id: generateTestId('slot'),
  doctorId: generateTestId('doctor'),
  startTime: createTestDate(1),
  endTime: new Date(createTestDate(1).getTime() + 30 * 60 * 1000),
  duration: 30,
  isOptimal: true,
  confidenceScore: 0.9,
  ...overrides
});

/**
 * Factory para criar critério de agendamento de teste
 */
export const createTestSchedulingCriteria = (overrides: Record<string, any> = {}) => ({
  specialtyId: generateTestId('specialty'),
  appointmentType: TEST_APPOINTMENT_TYPE.CONSULTATION,
  duration: BUSINESS_CONSTANTS.DEFAULT_DURATION.CONSULTATION,
  startDate: createTestDate(0),
  endDate: createTestDate(7),
  patientId: generateTestId('patient'),
  urgencyLevel: TEST_URGENCY_LEVELS.ROUTINE,
  isEmergency: false,
  ...overrides
});

/**
 * Factory para criar entrada de fila de teste
 */
export const createTestQueueEntry = (overrides: Record<string, any> = {}) => ({
  id: generateTestId('queue'),
  patientId: generateTestId('patient'),
  specialtyId: generateTestId('specialty'),
  appointmentType: TEST_APPOINTMENT_TYPE.CONSULTATION,
  priorityScore: 5,
  preferredDates: [createTestDate(1), createTestDate(2)],
  preferredTimes: ['09:00', '14:00', '16:00'],
  maxWaitDays: 7,
  urgencyLevel: TEST_URGENCY_LEVELS.ROUTINE,
  createdAt: new Date(),
  autoBookingEnabled: true,
  autoBookingAttempts: 0,
  maxAutoBookingAttempts: 5,
  ...overrides
});

// =============================================================================
// 🔧 TEST VALIDATION HELPERS
// =============================================================================

/**
 * Valida se um status de consulta é válido
 */
export const isValidTestAppointmentStatus = (status: string): boolean => {
  return Object.values(TEST_APPOINTMENT_STATUS).includes(status as any);
};

/**
 * Valida se um tipo de consulta é válido
 */
export const isValidTestAppointmentType = (type: string): boolean => {
  return Object.values(TEST_APPOINTMENT_TYPE).includes(type as any);
};

/**
 * Valida se uma transição de status é permitida
 */
export const isValidStatusTransition = (fromStatus: string, toStatus: string): boolean => {
  const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus as keyof typeof VALID_STATUS_TRANSITIONS];
  return validTransitions ? validTransitions.includes(toStatus as any) : false;
};

/**
 * Calcula score de prioridade para testes de fila
 */
export const calculateTestPriorityScore = (options: {
  urgencyLevel: number;
  appointmentType: string;
  waitingTime: number;
  isVIP: boolean;
  appointmentHistory: number;
}): number => {
  let priorityScore = 0;
  
  // Urgência (peso 40%)
  priorityScore += options.urgencyLevel * 4;
  
  // Tipo de consulta (peso 30%)
  if (options.appointmentType === TEST_APPOINTMENT_TYPE.EMERGENCY) priorityScore += 30;
  else if (options.appointmentType === TEST_APPOINTMENT_TYPE.FOLLOW_UP) priorityScore += 20;
  else priorityScore += 10;
  
  // Tempo de espera (peso 20%)
  priorityScore += Math.min(options.waitingTime * 2, 20);
  
  // Status VIP (peso 10%)
  if (options.isVIP) priorityScore += 10;
  
  // Histórico (bônus para pacientes frequentes)
  if (options.appointmentHistory > 10) priorityScore += 5;

  return priorityScore;
};

/**
 * Calcula taxa de cancelamento para testes financeiros
 */
export const calculateTestCancellationFee = (
  appointmentFee: number, 
  hoursBeforeCancellation: number
): number => {
  const cancellationPolicy = [
    { hoursBeforeAppointment: 48, feePercentage: 0 },
    { hoursBeforeAppointment: 24, feePercentage: 25 },
    { hoursBeforeAppointment: 12, feePercentage: 50 },
    { hoursBeforeAppointment: 2, feePercentage: 75 },
    { hoursBeforeAppointment: 0, feePercentage: 100 }
  ];

  const applicableRule = cancellationPolicy.find(rule => 
    hoursBeforeCancellation >= rule.hoursBeforeAppointment
  ) || cancellationPolicy[cancellationPolicy.length - 1];

  return (appointmentFee * applicableRule.feePercentage) / 100;
};

// =============================================================================
// 🎯 SPECIALIZED TEST DATA
// =============================================================================

/**
 * Dados de teste para emergências médicas
 */
export const EMERGENCY_TEST_DATA = {
  symptoms: [
    'severe chest pain',
    'difficulty breathing',
    'loss of consciousness',
    'severe bleeding',
    'acute abdominal pain'
  ],
  vitalSigns: {
    normal: { systolic: 120, heartRate: 70, temperature: 36.5, oxygenSat: 98 },
    mild: { systolic: 140, heartRate: 90, temperature: 37.5, oxygenSat: 96 },
    severe: { systolic: 190, heartRate: 110, temperature: 38.5, oxygenSat: 95 },
    critical: { systolic: 220, heartRate: 130, temperature: 40, oxygenSat: 85 }
  },
  urgencyLevels: {
    routine: TEST_URGENCY_LEVELS.ROUTINE,
    moderate: TEST_URGENCY_LEVELS.MODERATE,
    urgent: TEST_URGENCY_LEVELS.URGENT,
    critical: TEST_URGENCY_LEVELS.CRITICAL,
    lifeThreatening: TEST_URGENCY_LEVELS.LIFE_THREATENING
  }
} as const;

/**
 * Dados de teste para análise de performance
 */
export const PERFORMANCE_TEST_DATA = {
  targets: {
    API_RESPONSE_TIME_95TH: 200, // milliseconds
    FRONTEND_LOAD_TIME: 3000, // milliseconds  
    DB_QUERY_AVG: 100, // milliseconds
    CONCURRENT_USERS: 100,
    THROUGHPUT_MIN: 50, // requests per second
  },
  memoryLimits: {
    heapUsagePercentage: 80,
    maxHeapSize: 200 * 1024 * 1024, // 200MB
    maxExternalSize: 50 * 1024 * 1024 // 50MB
  }
} as const;

/**
 * Dados de teste para configurações de segurança
 */
export const SECURITY_TEST_DATA = {
  config: {
    JWT_EXPIRY_MINUTES: BUSINESS_CONSTANTS.SECURITY.JWT_EXPIRY_MINUTES,
    REFRESH_TOKEN_DAYS: BUSINESS_CONSTANTS.SECURITY.REFRESH_TOKEN_DAYS,
    MAX_LOGIN_ATTEMPTS: BUSINESS_CONSTANTS.SECURITY.MAX_LOGIN_ATTEMPTS,
    PASSWORD_MIN_LENGTH: BUSINESS_CONSTANTS.SECURITY.PASSWORD_MIN_LENGTH,
    SESSION_TIMEOUT: BUSINESS_CONSTANTS.SECURITY.SESSION_TIMEOUT_MINUTES * 60 * 1000,
  },
  weakPasswords: [
    '123456', 'password', 'abc123', '12345678', 'qwerty', 
    'senha123', 'admin', '', 'aaaaaaa'
  ],
  strongPasswords: [
    'MinhaSenh@123', 'C0mpl3x@Pass!', 'Segur@nça2024', 
    'M3d1c@lSyst3m!', 'Cl1n1c@S3cur3'
  ],
  sqlInjectionAttempts: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin'--",
    "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
    "' UNION SELECT * FROM users --"
  ]
} as const;

// =============================================================================
// 📚 DOCUMENTATION
// =============================================================================

/**
 * COMO USAR ESTE ARQUIVO:
 * 
 * 1. EM TESTES DE UNIDADE:
 *    import { TEST_APPOINTMENT_STATUS, createTestAppointment } from './utils/test-constants';
 *    
 *    const appointment = createTestAppointment({
 *      status: TEST_APPOINTMENT_STATUS.SCHEDULED
 *    });
 * 
 * 2. EM TESTES DE INTEGRAÇÃO:
 *    import { createTestPatient, createTestDoctor } from './utils/test-constants';
 *    
 *    const patient = createTestPatient();
 *    const doctor = createTestDoctor();
 * 
 * 3. EM TESTES DE VALIDAÇÃO:
 *    import { isValidStatusTransition, calculateTestPriorityScore } from './utils/test-constants';
 *    
 *    expect(isValidStatusTransition(oldStatus, newStatus)).toBe(true);
 * 
 * 4. EM TESTES DE PERFORMANCE:
 *    import { PERFORMANCE_TEST_DATA } from './utils/test-constants';
 *    
 *    expect(responseTime).toBeLessThan(PERFORMANCE_TEST_DATA.targets.API_RESPONSE_TIME_95TH);
 */