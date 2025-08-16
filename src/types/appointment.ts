import { z } from 'zod';
import { uuidSchema, dateTimeSchema } from './common';

// Appointment enums
export const AppointmentStatusSchema = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED',
]);

export const AppointmentTypeSchema = z.enum([
  'CONSULTATION',
  'FOLLOW_UP',
  'EMERGENCY',
  'ROUTINE_CHECKUP',
]);

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'PARTIAL',
  'CANCELLED',
  'REFUNDED',
]);

export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type AppointmentType = z.infer<typeof AppointmentTypeSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// Appointment schema
export const appointmentSchema = z.object({
  id: uuidSchema,
  patientId: uuidSchema,
  doctorId: uuidSchema,
  specialtyId: uuidSchema,
  scheduledAt: z.date(),
  duration: z.number().int().positive(),
  endTime: z.date(),
  status: AppointmentStatusSchema,
  type: AppointmentTypeSchema,
  reason: z.string().optional(),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  cancelledAt: z.date().optional(),
  cancelReason: z.string().optional(),
  rescheduledFrom: uuidSchema.optional(),
  rescheduleCount: z.number().int().min(0),
  confirmedAt: z.date().optional(),
  fee: z.number().positive().optional(),
  paymentStatus: PaymentStatusSchema,
  conversationId: uuidSchema.optional(),
  aiSummary: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Appointment = z.infer<typeof appointmentSchema>;

// Create appointment DTO
export const createAppointmentSchema = z.object({
  patientId: uuidSchema,
  doctorId: uuidSchema,
  specialtyId: uuidSchema,
  scheduledAt: dateTimeSchema.transform(str => new Date(str)),
  duration: z.number().int().positive().default(30),
  type: AppointmentTypeSchema.default('CONSULTATION'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .optional(),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

// Update appointment DTO
export const updateAppointmentSchema = z
  .object({
    scheduledAt: dateTimeSchema.transform(str => new Date(str)).optional(),
    duration: z.number().int().positive().optional(),
    type: AppointmentTypeSchema.optional(),
    reason: z.string().min(10).optional(),
    symptoms: z.string().optional(),
    notes: z.string().optional(),
    diagnosis: z.string().optional(),
    prescription: z.string().optional(),
  })
  .partial();

export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;

// Reschedule appointment DTO
export const rescheduleAppointmentSchema = z.object({
  newScheduledAt: dateTimeSchema.transform(str => new Date(str)),
  reason: z.string().min(10, 'Reschedule reason is required'),
});

export type RescheduleAppointmentDto = z.infer<
  typeof rescheduleAppointmentSchema
>;

// Cancel appointment DTO
export const cancelAppointmentSchema = z.object({
  reason: z.string().min(10, 'Cancellation reason is required'),
});

export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;

// Confirm appointment DTO
export const confirmAppointmentSchema = z.object({
  notes: z.string().optional(),
});

export type ConfirmAppointmentDto = z.infer<typeof confirmAppointmentSchema>;

// Complete appointment DTO
export const completeAppointmentSchema = z.object({
  diagnosis: z.string().min(10, 'Diagnosis is required'),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: dateTimeSchema.transform(str => new Date(str)).optional(),
});

export type CompleteAppointmentDto = z.infer<typeof completeAppointmentSchema>;

// Search appointments query
export const searchAppointmentsSchema = z.object({
  patientId: uuidSchema.optional(),
  doctorId: uuidSchema.optional(),
  specialtyId: uuidSchema.optional(),
  status: AppointmentStatusSchema.optional(),
  type: AppointmentTypeSchema.optional(),
  dateFrom: dateTimeSchema.transform(str => new Date(str)).optional(),
  dateTo: dateTimeSchema.transform(str => new Date(str)).optional(),
  paymentStatus: PaymentStatusSchema.optional(),
});

export type SearchAppointmentsQuery = z.infer<typeof searchAppointmentsSchema>;

// Appointment availability query
export const availabilityQuerySchema = z.object({
  doctorId: uuidSchema,
  specialtyId: uuidSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  duration: z.number().int().positive().default(30),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

// Time slot schema
export const timeSlotSchema = z.object({
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  isAvailable: z.boolean(),
  appointmentId: uuidSchema.optional(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;
