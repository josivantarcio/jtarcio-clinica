import {
  AppointmentBooking,
  SchedulingCriteria,
  CancellationReason,
  AvailableSlot,
  MultiResourceSlot,
  QueueEntry
} from '@/types/scheduling';
import { 
  CreateAppointmentDto,
  UpdateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  CompleteAppointmentDto,
  AppointmentStatus,
  AppointmentType
} from '@/types/appointment';
import { BusinessRulesEngine, BusinessRuleResult } from '@/services/business-rules.engine';
import { CoreSchedulingService } from '@/services/core-scheduling.service';
import { AdvancedSchedulingAlgorithms } from '@/services/advanced-scheduling.algorithms';
import { AvailabilityManagementService } from '@/services/availability-management.service';
import { BusinessRules, CANCELLATION_POLICY, RESCHEDULING_RULES } from '@/config/business-rules';
import { PrismaClient, Appointment } from '@prisma/client';
import { Logger } from 'winston';
import Redis from 'ioredis';
import { 
  addMinutes,
  differenceInHours,
  differenceInMinutes,
  addDays
} from 'date-fns';

export interface AppointmentServiceDeps {
  prisma: PrismaClient;
  redis: Redis;
  logger: Logger;
  businessRulesEngine: BusinessRulesEngine;
  coreSchedulingService: CoreSchedulingService;
  advancedAlgorithms: AdvancedSchedulingAlgorithms;
  availabilityService: AvailabilityManagementService;
}

export interface BookingResult {
  appointment: Appointment;
  warnings: string[];
  suggestedImprovements: string[];
  confirmationRequired: boolean;
}

export interface CancellationResult {
  success: boolean;
  refundAmount: number;
  cancellationFee: number;
  reschedulingSuggestions: AvailableSlot[];
}

export interface ReschedulingResult {
  appointment: Appointment;
  fee: number;
  originalSlotReleased: boolean;
  notificationsSent: boolean;
}

export class AppointmentService {
  constructor(private deps: AppointmentServiceDeps) {}

  /**
   * Book a new appointment with comprehensive validation
   */
  async bookAppointment(bookingData: AppointmentBooking): Promise<BookingResult> {
    const { prisma, logger, businessRulesEngine, availabilityService } = this.deps;

    try {
      logger.info('Booking new appointment', { bookingData });

      // Step 1: Validate business rules
      const criteria: SchedulingCriteria = {
        patientId: bookingData.patientId,
        doctorId: bookingData.doctorId,
        specialtyId: bookingData.specialtyId,
        appointmentType: bookingData.appointmentType,
        duration: bookingData.duration,
        startDate: new Date(), // Will be set from slot
        endDate: new Date(),
        urgencyLevel: bookingData.urgencyLevel
      };

      // Get slot details and validate
      const slot = await this.getAndValidateSlot(bookingData.slotId, criteria);
      
      // Update criteria with actual slot times
      criteria.startDate = slot.startTime;
      criteria.endDate = slot.endTime;

      // Validate business rules
      const ruleValidation = await businessRulesEngine.validateBooking(criteria, slot);
      
      if (!ruleValidation.isValid) {
        const criticalErrors = ruleValidation.violations.filter(v => v.severity === 'ERROR');
        throw new Error(`Booking validation failed: ${criticalErrors.map(e => e.message).join(', ')}`);
      }

      // Step 2: Reserve slot temporarily to prevent double booking
      const reservation = await availabilityService.reserveSlotTemporarily(
        bookingData.slotId,
        bookingData.patientId,
        5 // 5 minute reservation
      );

      try {
        // Step 3: Create appointment in database
        const appointment = await this.createAppointmentRecord(bookingData, slot, ruleValidation);

        // Step 4: Apply any rule modifications
        const updatedAppointment = await this.applyRuleModifications(appointment, ruleValidation);

        // Step 5: Schedule notifications
        await this.scheduleAppointmentNotifications(updatedAppointment);

        // Step 6: Update doctor's schedule cache
        await this.updateScheduleCache(updatedAppointment.doctorId, updatedAppointment.scheduledAt);

        // Step 7: Check for queue processing opportunities
        await this.processWaitingQueue(updatedAppointment.specialtyId, updatedAppointment.doctorId);

        // Release temporary reservation
        await availabilityService.releaseTemporaryReservation(reservation.reservationId);

        logger.info('Appointment booked successfully', { 
          appointmentId: updatedAppointment.id,
          patientId: bookingData.patientId 
        });

        return {
          appointment: updatedAppointment,
          warnings: ruleValidation.warnings.map(w => w.message),
          suggestedImprovements: ruleValidation.modifications.map(m => m.reason),
          confirmationRequired: this.requiresConfirmation(updatedAppointment, ruleValidation)
        };

      } catch (error) {
        // Release reservation on error
        await availabilityService.releaseTemporaryReservation(reservation.reservationId);
        throw error;
      }

    } catch (error) {
      logger.error('Error booking appointment', { error, bookingData });
      throw error;
    }
  }

  /**
   * Cancel an existing appointment
   */
  async cancelAppointment(
    appointmentId: string,
    cancellationData: CancelAppointmentDto,
    userId: string
  ): Promise<CancellationResult> {
    const { prisma, logger, businessRulesEngine, coreSchedulingService } = this.deps;

    try {
      logger.info('Cancelling appointment', { appointmentId, userId });

      // Get appointment details
      const appointment = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          specialty: true
        }
      });

      // Validate cancellation rules
      const cancellationReason: CancellationReason = {
        code: 'PATIENT_REQUEST',
        description: cancellationData.reason,
        initiatedBy: 'PATIENT',
        refundable: true
      };

      const validation = await businessRulesEngine.validateCancellation(
        appointmentId,
        cancellationReason
      );

      if (!validation.isValid) {
        throw new Error(`Cancellation not allowed: ${validation.violations.map(v => v.message).join(', ')}`);
      }

      // Calculate fees
      const hoursBeforeAppointment = differenceInHours(appointment.scheduledAt, new Date());
      const cancellationFee = BusinessRules.calculateCancellationFee(
        hoursBeforeAppointment,
        appointment.fee?.toNumber() || 0
      );
      const refundAmount = (appointment.fee?.toNumber() || 0) - cancellationFee;

      // Update appointment status
      const cancelledAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: cancellationData.reason
        }
      });

      // Release the time slot
      await this.releaseTimeSlot(appointment);

      // Find rescheduling suggestions
      const suggestions = await this.findReschedulingSuggestions(appointment);

      // Process waiting queue for released slot
      await this.processWaitingQueueForSlot(appointment);

      // Schedule cancellation notifications
      await this.scheduleCancellationNotifications(cancelledAppointment, cancellationFee);

      logger.info('Appointment cancelled successfully', { 
        appointmentId, 
        cancellationFee, 
        refundAmount 
      });

      return {
        success: true,
        refundAmount,
        cancellationFee,
        reschedulingSuggestions: suggestions
      };

    } catch (error) {
      logger.error('Error cancelling appointment', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Reschedule an existing appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    rescheduleData: RescheduleAppointmentDto,
    userId: string
  ): Promise<ReschedulingResult> {
    const { prisma, logger, businessRulesEngine, availabilityService } = this.deps;

    try {
      logger.info('Rescheduling appointment', { appointmentId, rescheduleData });

      // Get current appointment
      const currentAppointment = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          specialty: true
        }
      });

      // Create new slot data
      const newSlot = {
        scheduledAt: rescheduleData.newScheduledAt,
        doctorId: currentAppointment.doctorId,
        specialtyId: currentAppointment.specialtyId,
        duration: currentAppointment.duration
      };

      // Validate rescheduling rules
      const validation = await businessRulesEngine.validateRescheduling(
        appointmentId,
        newSlot,
        rescheduleData.reason
      );

      if (!validation.isValid) {
        throw new Error(`Rescheduling not allowed: ${validation.violations.map(v => v.message).join(', ')}`);
      }

      // Reserve new slot temporarily
      const tempReservation = await availabilityService.reserveSlotTemporarily(
        `temp-${appointmentId}`,
        currentAppointment.patientId,
        5
      );

      try {
        // Calculate rescheduling fee
        const fee = this.calculateReschedulingFee(currentAppointment, rescheduleData.newScheduledAt);

        // Update appointment
        const rescheduledAppointment = await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            scheduledAt: rescheduleData.newScheduledAt,
            endTime: addMinutes(rescheduleData.newScheduledAt, currentAppointment.duration),
            rescheduleCount: { increment: 1 },
            rescheduledFrom: appointmentId,
            status: AppointmentStatus.SCHEDULED
          }
        });

        // Release old slot and confirm new slot
        await this.releaseTimeSlot(currentAppointment);
        await availabilityService.releaseTemporaryReservation(tempReservation.reservationId);

        // Update schedule caches
        await this.updateScheduleCache(currentAppointment.doctorId, currentAppointment.scheduledAt);
        await this.updateScheduleCache(rescheduledAppointment.doctorId, rescheduledAppointment.scheduledAt);

        // Schedule notifications
        await this.scheduleReschedulingNotifications(currentAppointment, rescheduledAppointment);

        logger.info('Appointment rescheduled successfully', {
          appointmentId,
          oldTime: currentAppointment.scheduledAt,
          newTime: rescheduleData.newScheduledAt,
          fee
        });

        return {
          appointment: rescheduledAppointment,
          fee,
          originalSlotReleased: true,
          notificationsSent: true
        };

      } catch (error) {
        await availabilityService.releaseTemporaryReservation(tempReservation.reservationId);
        throw error;
      }

    } catch (error) {
      logger.error('Error rescheduling appointment', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Complete an appointment with diagnosis and notes
   */
  async completeAppointment(
    appointmentId: string,
    completionData: CompleteAppointmentDto,
    doctorId: string
  ): Promise<Appointment> {
    const { prisma, logger } = this.deps;

    try {
      logger.info('Completing appointment', { appointmentId, doctorId });

      // Validate doctor can complete this appointment
      const appointment = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } }
        }
      });

      if (appointment.doctorId !== doctorId) {
        throw new Error('Only the assigned doctor can complete this appointment');
      }

      if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
        throw new Error('Appointment must be in progress to complete');
      }

      // Update appointment with completion data
      const completedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
          diagnosis: completionData.diagnosis,
          prescription: completionData.prescription,
          notes: completionData.notes,
          updatedAt: new Date()
        }
      });

      // Schedule follow-up if required
      if (completionData.followUpRequired && completionData.followUpDate) {
        await this.scheduleFollowUp(completedAppointment, completionData.followUpDate);
      }

      // Update patient medical history
      await this.updatePatientMedicalHistory(completedAppointment);

      // Schedule completion notifications
      await this.scheduleCompletionNotifications(completedAppointment);

      logger.info('Appointment completed successfully', { appointmentId });
      return completedAppointment;

    } catch (error) {
      logger.error('Error completing appointment', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Get appointment with full details
   */
  async getAppointmentById(appointmentId: string, userId: string): Promise<Appointment | null> {
    const { prisma } = this.deps;

    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              },
              specialty: true
            }
          },
          specialty: true
        }
      });

      // Validate user has access to this appointment
      if (appointment && !this.hasAppointmentAccess(appointment, userId)) {
        return null;
      }

      return appointment;

    } catch (error) {
      this.deps.logger.error('Error getting appointment', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Search appointments with filters
   */
  async searchAppointments(
    filters: any,
    userId: string,
    userRole: string
  ): Promise<{ appointments: Appointment[]; total: number }> {
    const { prisma } = this.deps;

    try {
      const where = this.buildSearchFilters(filters, userId, userRole);
      
      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: {
            patient: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            doctor: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            specialty: true
          },
          orderBy: { scheduledAt: 'desc' },
          skip: filters.skip || 0,
          take: filters.take || 50
        }),
        prisma.appointment.count({ where })
      ]);

      return { appointments, total };

    } catch (error) {
      this.deps.logger.error('Error searching appointments', { error, filters });
      throw error;
    }
  }

  /**
   * Get appointment history for a patient
   */
  async getAppointmentHistory(patientId: string, limit: number = 10): Promise<Appointment[]> {
    const { prisma } = this.deps;

    try {
      return await prisma.appointment.findMany({
        where: { patientId },
        include: {
          doctor: {
            include: {
              user: true,
              specialty: true
            }
          },
          specialty: true
        },
        orderBy: { scheduledAt: 'desc' },
        take: limit
      });

    } catch (error) {
      this.deps.logger.error('Error getting appointment history', { error, patientId });
      throw error;
    }
  }

  // Private helper methods

  private async getAndValidateSlot(slotId: string, criteria: SchedulingCriteria): Promise<AvailableSlot> {
    // Parse slot ID to get timing information
    const slotParts = slotId.split('-');
    if (slotParts.length < 4) {
      throw new Error('Invalid slot ID format');
    }

    const [doctorId, date, hour, minute] = slotParts;
    const startTime = new Date(`${date}T${hour}:${minute}:00`);
    const endTime = addMinutes(startTime, criteria.duration);

    return {
      id: slotId,
      doctorId,
      startTime,
      endTime,
      duration: criteria.duration,
      isOptimal: true,
      confidenceScore: 0.9,
      metadata: {
        slotType: 'REGULAR',
        utilizationScore: 0.8,
        patientPreferenceMatch: 0.7
      }
    };
  }

  private async createAppointmentRecord(
    bookingData: AppointmentBooking,
    slot: AvailableSlot,
    validation: BusinessRuleResult
  ): Promise<Appointment> {
    const { prisma } = this.deps;

    const appointmentData = {
      patientId: bookingData.patientId,
      doctorId: bookingData.doctorId,
      specialtyId: bookingData.specialtyId,
      scheduledAt: slot.startTime,
      duration: bookingData.duration,
      endTime: slot.endTime,
      type: bookingData.appointmentType,
      reason: bookingData.reason,
      symptoms: bookingData.symptoms,
      notes: bookingData.notes,
      status: AppointmentStatus.SCHEDULED
    };

    return await prisma.appointment.create({
      data: appointmentData,
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        specialty: true
      }
    });
  }

  private async applyRuleModifications(
    appointment: Appointment,
    validation: BusinessRuleResult
  ): Promise<Appointment> {
    if (validation.modifications.length === 0) {
      return appointment;
    }

    const { prisma } = this.deps;
    const updates: any = {};

    for (const modification of validation.modifications) {
      if (modification.required) {
        updates[modification.field] = modification.suggestedValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      return await prisma.appointment.update({
        where: { id: appointment.id },
        data: updates,
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          specialty: true
        }
      });
    }

    return appointment;
  }

  private requiresConfirmation(appointment: Appointment, validation: BusinessRuleResult): boolean {
    // Check if appointment requires confirmation based on business rules
    return validation.warnings.some(w => w.impact === 'HIGH') ||
           appointment.type === AppointmentType.EMERGENCY ||
           appointment.scheduledAt <= addDays(new Date(), 1);
  }

  private calculateReschedulingFee(appointment: Appointment, newScheduledAt: Date): number {
    const hoursBeforeOriginal = differenceInHours(appointment.scheduledAt, new Date());
    
    if (hoursBeforeOriginal >= RESCHEDULING_RULES.FREE_RESCHEDULE_HOURS) {
      return 0;
    }
    
    return (appointment.fee?.toNumber() || 0) * 0.2; // 20% rescheduling fee
  }

  private async releaseTimeSlot(appointment: Appointment): Promise<void> {
    // Mark time slot as available again
    // This would integrate with availability management
    const { logger } = this.deps;
    logger.info('Time slot released', { 
      appointmentId: appointment.id,
      scheduledAt: appointment.scheduledAt 
    });
  }

  private async findReschedulingSuggestions(appointment: Appointment): Promise<AvailableSlot[]> {
    const { coreSchedulingService } = this.deps;

    const criteria: SchedulingCriteria = {
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      specialtyId: appointment.specialtyId,
      appointmentType: appointment.type,
      duration: appointment.duration,
      startDate: new Date(),
      endDate: addDays(new Date(), 30)
    };

    return await coreSchedulingService.findAvailableSlots(criteria);
  }

  private hasAppointmentAccess(appointment: Appointment, userId: string): boolean {
    // Check if user has access to this appointment
    return appointment.patient?.userId === userId || 
           appointment.doctor?.userId === userId;
  }

  private buildSearchFilters(filters: any, userId: string, userRole: string): any {
    const where: any = {};

    // Role-based filtering
    if (userRole === 'PATIENT') {
      where.patient = { userId };
    } else if (userRole === 'DOCTOR') {
      where.doctor = { userId };
    }

    // Apply other filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.scheduledAt = {};
      if (filters.dateFrom) where.scheduledAt.gte = filters.dateFrom;
      if (filters.dateTo) where.scheduledAt.lte = filters.dateTo;
    }

    if (filters.specialtyId) {
      where.specialtyId = filters.specialtyId;
    }

    return where;
  }

  private async scheduleAppointmentNotifications(appointment: Appointment): Promise<void> {
    // Schedule confirmation and reminder notifications
    // This would integrate with the notification service
    this.deps.logger.info('Appointment notifications scheduled', { appointmentId: appointment.id });
  }

  private async scheduleCancellationNotifications(appointment: Appointment, fee: number): Promise<void> {
    // Schedule cancellation notifications
    this.deps.logger.info('Cancellation notifications scheduled', { appointmentId: appointment.id, fee });
  }

  private async scheduleReschedulingNotifications(oldAppointment: Appointment, newAppointment: Appointment): Promise<void> {
    // Schedule rescheduling notifications
    this.deps.logger.info('Rescheduling notifications scheduled', { 
      appointmentId: oldAppointment.id,
      oldTime: oldAppointment.scheduledAt,
      newTime: newAppointment.scheduledAt 
    });
  }

  private async scheduleCompletionNotifications(appointment: Appointment): Promise<void> {
    // Schedule completion and follow-up notifications
    this.deps.logger.info('Completion notifications scheduled', { appointmentId: appointment.id });
  }

  private async updateScheduleCache(doctorId: string, date: Date): Promise<void> {
    // Update cached schedule data
    const { redis } = this.deps;
    const cacheKey = `doctor-schedule:${doctorId}:${date.toISOString().split('T')[0]}`;
    await redis.del(cacheKey); // Invalidate cache
  }

  private async processWaitingQueue(specialtyId: string, doctorId?: string): Promise<void> {
    // Process patients waiting for appointments
    this.deps.logger.info('Processing waiting queue', { specialtyId, doctorId });
  }

  private async processWaitingQueueForSlot(appointment: Appointment): Promise<void> {
    // Process waiting queue for the specific released slot
    this.deps.logger.info('Processing waiting queue for released slot', { 
      appointmentId: appointment.id,
      scheduledAt: appointment.scheduledAt 
    });
  }

  private async scheduleFollowUp(appointment: Appointment, followUpDate: Date): Promise<void> {
    // Schedule follow-up appointment
    this.deps.logger.info('Scheduling follow-up', { 
      appointmentId: appointment.id, 
      followUpDate 
    });
  }

  private async updatePatientMedicalHistory(appointment: Appointment): Promise<void> {
    // Update patient's medical history with appointment data
    this.deps.logger.info('Updating patient medical history', { appointmentId: appointment.id });
  }
}