import { z } from 'zod';
import { AppointmentStatus, AppointmentType } from './appointment';

// Core scheduling interfaces
export interface SchedulingCriteria {
  doctorId?: string;
  specialtyId: string;
  appointmentType: AppointmentType;
  duration: number;
  startDate: Date;
  endDate: Date;
  patientId: string;
  preferredTimes?: string[];
  urgencyLevel?: number;
  isEmergency?: boolean;
}

export interface AvailableSlot {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  isOptimal: boolean;
  confidenceScore: number;
  roomId?: string;
  equipmentIds?: string[];
  bufferBefore?: number;
  bufferAfter?: number;
  metadata?: {
    slotType: 'REGULAR' | 'EMERGENCY' | 'OVERFLOW';
    utilizationScore: number;
    patientPreferenceMatch: number;
  };
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  involvedAppointments: string[];
  resolution?: ConflictResolution;
  autoResolvable: boolean;
  createdAt: Date;
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  suggestedActions: ConflictAction[];
  estimatedImpact: number;
  requiresApproval: boolean;
}

export interface ConflictAction {
  type: 'RESCHEDULE' | 'CANCEL' | 'REASSIGN' | 'OVERFLOW' | 'NOTIFY';
  appointmentId: string;
  newSlot?: AvailableSlot;
  reason: string;
  priority: number;
}

export interface QueueEntry {
  id: string;
  patientId: string;
  doctorId?: string;
  specialtyId: string;
  appointmentType: AppointmentType;
  priorityScore: number;
  preferredDates: Date[];
  preferredTimes: string[];
  maxWaitDays: number;
  urgencyLevel: number;
  createdAt: Date;
  notifiedAt?: Date;
  estimatedWaitTime?: number;
  autoBookingEnabled: boolean;
}

export interface OptimizationResult {
  originalSchedule: ScheduleSlot[];
  optimizedSchedule: ScheduleSlot[];
  improvements: {
    utilizationIncrease: number;
    bufferOptimization: number;
    patientSatisfactionScore: number;
    doctorEfficiencyScore: number;
  };
  changes: ScheduleChange[];
}

export interface ScheduleSlot {
  id: string;
  appointmentId?: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  type: 'APPOINTMENT' | 'BUFFER' | 'BREAK' | 'BLOCKED';
  metadata?: any;
}

export interface ScheduleChange {
  type: 'MOVE' | 'CANCEL' | 'ADD' | 'MODIFY';
  appointmentId: string;
  oldSlot?: ScheduleSlot;
  newSlot?: ScheduleSlot;
  reason: string;
  impact: number;
}

export interface AppointmentBooking {
  patientId: string;
  doctorId: string;
  specialtyId: string;
  slotId: string;
  appointmentType: AppointmentType;
  duration: number;
  reason?: string;
  symptoms?: string;
  notes?: string;
  urgencyLevel?: number;
  preferredLanguage?: string;
  specialRequests?: string[];
}

export interface CancellationReason {
  code: CancellationCode;
  description: string;
  initiatedBy: 'PATIENT' | 'DOCTOR' | 'SYSTEM' | 'ADMIN';
  refundable: boolean;
  fee?: number;
}

// Enums
export enum ConflictType {
  DOUBLE_BOOKING = 'DOUBLE_BOOKING',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  DOCTOR_UNAVAILABLE = 'DOCTOR_UNAVAILABLE',
  ROOM_UNAVAILABLE = 'ROOM_UNAVAILABLE',
  EQUIPMENT_UNAVAILABLE = 'EQUIPMENT_UNAVAILABLE',
  OUTSIDE_BUSINESS_HOURS = 'OUTSIDE_BUSINESS_HOURS',
  INSUFFICIENT_BUFFER = 'INSUFFICIENT_BUFFER',
  SPECIALTY_MISMATCH = 'SPECIALTY_MISMATCH',
}

export enum ConflictSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ResolutionStrategy {
  AUTO_RESCHEDULE = 'AUTO_RESCHEDULE',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION',
  OVERFLOW_BOOKING = 'OVERFLOW_BOOKING',
  WAITLIST = 'WAITLIST',
  RESOURCE_SUBSTITUTION = 'RESOURCE_SUBSTITUTION',
}

export enum CancellationCode {
  PATIENT_REQUEST = 'PATIENT_REQUEST',
  DOCTOR_UNAVAILABLE = 'DOCTOR_UNAVAILABLE',
  MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  WEATHER_CONDITIONS = 'WEATHER_CONDITIONS',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NO_SHOW = 'NO_SHOW',
  LATE_ARRIVAL = 'LATE_ARRIVAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
}

// Zod schemas for validation
export const schedulingCriteriaSchema = z.object({
  doctorId: z.string().uuid().optional(),
  specialtyId: z.string().uuid(),
  appointmentType: z.enum(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP']),
  duration: z.number().int().positive(),
  startDate: z.date(),
  endDate: z.date(),
  patientId: z.string().uuid(),
  preferredTimes: z.array(z.string()).optional(),
  urgencyLevel: z.number().int().min(1).max(10).default(5),
  isEmergency: z.boolean().default(false),
});

export const availableSlotSchema = z.object({
  id: z.string().uuid(),
  doctorId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number().int().positive(),
  isOptimal: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  roomId: z.string().uuid().optional(),
  equipmentIds: z.array(z.string().uuid()).optional(),
  bufferBefore: z.number().int().nonnegative().optional(),
  bufferAfter: z.number().int().nonnegative().optional(),
  metadata: z.object({
    slotType: z.enum(['REGULAR', 'EMERGENCY', 'OVERFLOW']),
    utilizationScore: z.number().min(0).max(1),
    patientPreferenceMatch: z.number().min(0).max(1),
  }).optional(),
});

export const queueEntrySchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  specialtyId: z.string().uuid(),
  appointmentType: z.enum(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP']),
  priorityScore: z.number().int().min(1).max(20),
  preferredDates: z.array(z.date()),
  preferredTimes: z.array(z.string()),
  maxWaitDays: z.number().int().positive(),
  urgencyLevel: z.number().int().min(1).max(10),
  createdAt: z.date(),
  notifiedAt: z.date().optional(),
  estimatedWaitTime: z.number().int().optional(),
  autoBookingEnabled: z.boolean().default(true),
});

export const appointmentBookingSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  specialtyId: z.string().uuid(),
  slotId: z.string().uuid(),
  appointmentType: z.enum(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP']),
  duration: z.number().int().positive(),
  reason: z.string().min(10).optional(),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
  urgencyLevel: z.number().int().min(1).max(10).default(5),
  preferredLanguage: z.string().optional(),
  specialRequests: z.array(z.string()).optional(),
});

export const cancellationReasonSchema = z.object({
  code: z.nativeEnum(CancellationCode),
  description: z.string().min(10),
  initiatedBy: z.enum(['PATIENT', 'DOCTOR', 'SYSTEM', 'ADMIN']),
  refundable: z.boolean(),
  fee: z.number().nonnegative().optional(),
});

// Type exports
export type SchedulingCriteria = z.infer<typeof schedulingCriteriaSchema>;
export type AvailableSlot = z.infer<typeof availableSlotSchema>;
export type QueueEntry = z.infer<typeof queueEntrySchema>;
export type AppointmentBooking = z.infer<typeof appointmentBookingSchema>;
export type CancellationReason = z.infer<typeof cancellationReasonSchema>;

// Search and filter schemas
export const availabilitySearchSchema = z.object({
  specialtyId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.number().int().positive().default(30),
  appointmentType: z.enum(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP']).default('CONSULTATION'),
  preferredTimes: z.array(z.string()).optional(),
  maxSlots: z.number().int().positive().max(100).default(20),
});

export type AvailabilitySearch = z.infer<typeof availabilitySearchSchema>;