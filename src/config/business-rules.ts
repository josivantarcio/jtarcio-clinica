import { AppointmentType } from '@/types/appointment';

// Specialty configurations with duration and buffer times
export const SPECIALTY_CONFIG = {
  CLINICA_GERAL: {
    duration: 30,
    bufferTime: 10,
    allowOverbooking: false,
    maxAdvanceBookingDays: 60,
    requiresEquipment: false,
  },
  CARDIOLOGIA: {
    duration: 45,
    bufferTime: 15,
    allowOverbooking: false,
    maxAdvanceBookingDays: 90,
    requiresEquipment: true,
  },
  PEDIATRIA: {
    duration: 40,
    bufferTime: 10,
    allowOverbooking: true,
    maxAdvanceBookingDays: 30,
    requiresEquipment: false,
  },
  DERMATOLOGIA: {
    duration: 30,
    bufferTime: 5,
    allowOverbooking: false,
    maxAdvanceBookingDays: 45,
    requiresEquipment: true,
  },
  GINECOLOGIA: {
    duration: 45,
    bufferTime: 15,
    allowOverbooking: false,
    maxAdvanceBookingDays: 60,
    requiresEquipment: true,
  },
  OFTALMOLOGIA: {
    duration: 35,
    bufferTime: 10,
    allowOverbooking: false,
    maxAdvanceBookingDays: 30,
    requiresEquipment: true,
  },
  ORTOPEDIA: {
    duration: 40,
    bufferTime: 15,
    allowOverbooking: false,
    maxAdvanceBookingDays: 45,
    requiresEquipment: false,
  },
  NEUROLOGIA: {
    duration: 50,
    bufferTime: 20,
    allowOverbooking: false,
    maxAdvanceBookingDays: 90,
    requiresEquipment: true,
  },
} as const;

// Appointment type configurations
export const APPOINTMENT_TYPE_CONFIG = {
  CONSULTATION: {
    baseDuration: 30,
    bufferMultiplier: 1,
    allowSameDay: true,
    requiresReason: true,
  },
  FOLLOW_UP: {
    baseDuration: 25,
    bufferMultiplier: 0.8,
    allowSameDay: true,
    requiresReason: false,
  },
  EMERGENCY: {
    baseDuration: 45,
    bufferMultiplier: 0.5,
    allowSameDay: true,
    requiresReason: true,
    priority: 1,
    overrideCapacity: true,
  },
  ROUTINE_CHECKUP: {
    baseDuration: 35,
    bufferMultiplier: 1.2,
    allowSameDay: false,
    requiresReason: false,
  },
} as const;

// Cancellation policies (times in hours before appointment)
export const CANCELLATION_POLICY = {
  FREE_CANCELLATION_HOURS: 24,
  PARTIAL_FEE_HOURS: 12,
  FULL_FEE_HOURS: 2,
  FEES: {
    FREE: 0,
    PARTIAL: 0.3, // 30%
    MODERATE: 0.5, // 50%
    FULL: 1.0, // 100%
  },
} as const;

// Rescheduling rules
export const RESCHEDULING_RULES = {
  MAX_RESCHEDULES_PER_APPOINTMENT: 2,
  FREE_RESCHEDULE_HOURS: 48,
  SAME_DAY_RESCHEDULE_ALLOWED: false,
  MIN_NOTICE_HOURS: 2,
} as const;

// Emergency handling rules
export const EMERGENCY_RULES = {
  MAX_DAILY_EMERGENCY_SLOTS: 3,
  EMERGENCY_BUFFER_PERCENTAGE: 0.15, // 15% of daily capacity
  AUTO_OVERRIDE_CAPACITY: true,
  PRIORITY_SCORE_THRESHOLD: 8,
} as const;

// Queue management configuration
export const QUEUE_CONFIG = {
  MAX_QUEUE_SIZE_PER_DOCTOR: 50,
  MAX_QUEUE_SIZE_PER_SPECIALTY: 200,
  NOTIFICATION_INTERVALS: [24, 12, 6, 2], // hours before available slot
  AUTO_REMOVE_AFTER_HOURS: 72,
  PRIORITY_DECAY_HOURS: 24,
} as const;

// Business hours and constraints
export const TIME_CONSTRAINTS = {
  BUSINESS_START_TIME: '07:00',
  BUSINESS_END_TIME: '19:00',
  LUNCH_START_TIME: '12:00',
  LUNCH_END_TIME: '13:00',
  MIN_SLOT_DURATION: 15,
  MAX_SLOT_DURATION: 120,
  BOOKING_ADVANCE_LIMIT_DAYS: 180,
  SAME_DAY_CUTOFF_HOUR: 8,
} as const;

// Patient classification and VIP rules
export const PATIENT_CLASSIFICATION = {
  VIP: {
    maxReschedules: 5,
    priorityScore: 10,
    advanceBookingDays: 365,
    allowOverbooking: true,
    bufferTimeReduction: 0.5,
  },
  REGULAR: {
    maxReschedules: 2,
    priorityScore: 5,
    advanceBookingDays: 90,
    allowOverbooking: false,
    bufferTimeReduction: 1.0,
  },
  NEW_PATIENT: {
    maxReschedules: 1,
    priorityScore: 3,
    advanceBookingDays: 60,
    allowOverbooking: false,
    bufferTimeReduction: 1.2,
    requiresPreScreening: true,
  },
} as const;

// No-show policies
export const NO_SHOW_POLICY = {
  STRIKES_BEFORE_SUSPENSION: 3,
  SUSPENSION_PERIOD_DAYS: 30,
  AUTOMATIC_REMINDER_HOURS: [24, 4, 1],
  CONFIRMATION_REQUIRED_HOURS: 24,
  LATE_ARRIVAL_TOLERANCE_MINUTES: 15,
} as const;

// Resource management
export const RESOURCE_CONFIG = {
  ROOM_TYPES: {
    CONSULTATION: { capacity: 1, equipmentRequired: [] },
    PROCEDURE: { capacity: 1, equipmentRequired: ['medical_equipment'] },
    EMERGENCY: { capacity: 1, equipmentRequired: ['emergency_kit'] },
    CARDIOLOGY: { capacity: 1, equipmentRequired: ['ecg', 'ultrasound'] },
    RADIOLOGY: { capacity: 1, equipmentRequired: ['xray', 'ultrasound'] },
  },
  EQUIPMENT_BOOKING_BUFFER: 30, // minutes
  ROOM_CLEANING_TIME: 15, // minutes between patients
} as const;

// Smart scheduling preferences
export const SCHEDULING_PREFERENCES = {
  OPTIMAL_UTILIZATION_TARGET: 0.85, // 85% capacity utilization
  PATIENT_PREFERENCE_WEIGHT: 0.3,
  DOCTOR_PREFERENCE_WEIGHT: 0.4,
  EFFICIENCY_WEIGHT: 0.3,
  MAX_CONSECUTIVE_APPOINTMENTS: 8,
  PREFERRED_BREAK_DURATION: 15, // minutes every 2 hours
} as const;

// Holiday and leave management
export const LEAVE_MANAGEMENT = {
  ADVANCE_NOTICE_DAYS: 30,
  EMERGENCY_LEAVE_APPROVAL_HOURS: 4,
  MAX_CONSECUTIVE_DAYS_OFF: 14,
  HOLIDAY_ADVANCE_BOOKING_RESTRICTION: true,
} as const;

export type SpecialtyName = keyof typeof SPECIALTY_CONFIG;
export type AppointmentTypeConfig = typeof APPOINTMENT_TYPE_CONFIG[AppointmentType];
export type PatientClassification = keyof typeof PATIENT_CLASSIFICATION;

// Utility functions for business rules
export class BusinessRules {
  static getSpecialtyConfig(specialtyName: string) {
    const normalizedName = specialtyName.toUpperCase().replace(/\s+/g, '_') as SpecialtyName;
    return SPECIALTY_CONFIG[normalizedName] || SPECIALTY_CONFIG.CLINICA_GERAL;
  }

  static getAppointmentTypeConfig(type: AppointmentType) {
    return APPOINTMENT_TYPE_CONFIG[type];
  }

  static calculateCancellationFee(hoursBeforeAppointment: number, appointmentFee: number): number {
    if (hoursBeforeAppointment >= CANCELLATION_POLICY.FREE_CANCELLATION_HOURS) {
      return appointmentFee * CANCELLATION_POLICY.FEES.FREE;
    }
    
    if (hoursBeforeAppointment >= CANCELLATION_POLICY.PARTIAL_FEE_HOURS) {
      return appointmentFee * CANCELLATION_POLICY.FEES.PARTIAL;
    }
    
    if (hoursBeforeAppointment >= CANCELLATION_POLICY.FULL_FEE_HOURS) {
      return appointmentFee * CANCELLATION_POLICY.FEES.MODERATE;
    }
    
    return appointmentFee * CANCELLATION_POLICY.FEES.FULL;
  }

  static canReschedule(rescheduleCount: number, hoursBeforeAppointment: number): boolean {
    if (rescheduleCount >= RESCHEDULING_RULES.MAX_RESCHEDULES_PER_APPOINTMENT) {
      return false;
    }
    
    if (hoursBeforeAppointment < RESCHEDULING_RULES.MIN_NOTICE_HOURS) {
      return false;
    }
    
    return true;
  }

  static calculatePriorityScore(
    appointmentType: AppointmentType,
    patientClassification: PatientClassification,
    urgencyLevel: number = 5,
    waitingTime: number = 0
  ): number {
    const baseScore = PATIENT_CLASSIFICATION[patientClassification].priorityScore;
    const typeBonus = appointmentType === 'EMERGENCY' ? 5 : 0;
    const urgencyBonus = urgencyLevel > 7 ? 3 : urgencyLevel > 5 ? 1 : 0;
    const waitingBonus = Math.min(Math.floor(waitingTime / 24), 3); // Max 3 points for waiting
    
    return baseScore + typeBonus + urgencyBonus + waitingBonus;
  }

  static isBusinessHour(time: string): boolean {
    const [hours, minutes] = time.split(':').map(Number);
    const timeValue = hours * 60 + minutes;
    const startTime = TIME_CONSTRAINTS.BUSINESS_START_TIME.split(':').map(Number);
    const endTime = TIME_CONSTRAINTS.BUSINESS_END_TIME.split(':').map(Number);
    const lunchStart = TIME_CONSTRAINTS.LUNCH_START_TIME.split(':').map(Number);
    const lunchEnd = TIME_CONSTRAINTS.LUNCH_END_TIME.split(':').map(Number);
    
    const startValue = startTime[0] * 60 + startTime[1];
    const endValue = endTime[0] * 60 + endTime[1];
    const lunchStartValue = lunchStart[0] * 60 + lunchStart[1];
    const lunchEndValue = lunchEnd[0] * 60 + lunchEnd[1];
    
    return timeValue >= startValue && 
           timeValue <= endValue && 
           (timeValue < lunchStartValue || timeValue >= lunchEndValue);
  }
}