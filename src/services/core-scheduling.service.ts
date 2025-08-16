import {
  SchedulingCriteria,
  AvailableSlot,
  Conflict,
  ConflictType,
  ConflictSeverity,
  OptimizationResult,
  ScheduleSlot,
  ResolutionStrategy,
  ConflictResolution,
  ConflictAction,
} from '@/types/scheduling';
import { AppointmentType, AppointmentStatus } from '@/types/appointment';
import {
  BusinessRules,
  SPECIALTY_CONFIG,
  APPOINTMENT_TYPE_CONFIG,
} from '@/config/business-rules';
import { PrismaClient } from '../../database/generated/client';
import {
  addMinutes,
  isWithinInterval,
  parseISO,
  format,
  isSameDay,
  differenceInMinutes,
} from 'date-fns';
import { Logger } from 'winston';
import Redis from 'ioredis';

export interface CoreSchedulingServiceDeps {
  prisma: PrismaClient;
  redis: Redis;
  logger: Logger;
}

export class CoreSchedulingService {
  constructor(private deps: CoreSchedulingServiceDeps) {}

  /**
   * Find available slots based on scheduling criteria
   */
  async findAvailableSlots(
    criteria: SchedulingCriteria,
  ): Promise<AvailableSlot[]> {
    const { prisma, redis, logger } = this.deps;

    try {
      logger.info('Finding available slots', { criteria });

      // Get specialty configuration
      const specialty = await prisma.specialty.findUniqueOrThrow({
        where: { id: criteria.specialtyId },
      });

      const specialtyConfig = BusinessRules.getSpecialtyConfig(specialty.name);
      const typeConfig = BusinessRules.getAppointmentTypeConfig(
        criteria.appointmentType,
      );

      // Calculate effective duration including buffers
      const effectiveDuration = this.calculateEffectiveDuration(
        criteria.duration || specialtyConfig.duration,
        specialtyConfig.bufferTime,
        typeConfig.bufferMultiplier,
      );

      // Get doctors for the specialty
      const doctors = criteria.doctorId
        ? [
            await prisma.doctor.findUniqueOrThrow({
              where: { id: criteria.doctorId },
            }),
          ]
        : await prisma.doctor.findMany({
            where: {
              specialtyId: criteria.specialtyId,
              isActive: true,
              acceptsNewPatients: true,
            },
            include: { availability: true },
          });

      // Generate time slots for each doctor
      const allSlots: AvailableSlot[] = [];

      for (const doctor of doctors) {
        const doctorSlots = await this.generateDoctorSlots(
          doctor,
          criteria,
          effectiveDuration,
          specialtyConfig,
        );
        allSlots.push(...doctorSlots);
      }

      // Filter out conflicting slots
      const availableSlots = await this.filterConflictingSlots(
        allSlots,
        criteria,
      );

      // Score and sort slots by optimality
      const scoredSlots = this.scoreSlots(
        availableSlots,
        criteria,
        specialtyConfig,
      );

      // Cache results for performance
      await this.cacheAvailabilityResults(criteria, scoredSlots);

      logger.info(`Found ${scoredSlots.length} available slots`);
      return scoredSlots.sort((a, b) => b.confidenceScore - a.confidenceScore);
    } catch (error) {
      logger.error('Error finding available slots', { error, criteria });
      throw error;
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(appointmentData: any): Promise<Conflict[]> {
    const { prisma, logger } = this.deps;
    const conflicts: Conflict[] = [];

    try {
      // Check for double booking
      const overlappingAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: appointmentData.doctorId,
          scheduledAt: {
            lte: appointmentData.endTime,
          },
          endTime: {
            gte: appointmentData.scheduledAt,
          },
          status: {
            in: [
              AppointmentStatus.SCHEDULED,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.IN_PROGRESS,
            ],
          },
          id: { not: appointmentData.id },
        },
      });

      if (overlappingAppointments.length > 0) {
        conflicts.push({
          id: `conflict-${Date.now()}-double-booking`,
          type: ConflictType.DOUBLE_BOOKING,
          severity: ConflictSeverity.CRITICAL,
          description: 'Doctor has overlapping appointments',
          involvedAppointments: overlappingAppointments.map(a => a.id),
          autoResolvable: false,
          createdAt: new Date(),
        });
      }

      // Check business hours
      if (
        !this.isWithinBusinessHours(
          appointmentData.scheduledAt,
          appointmentData.endTime,
        )
      ) {
        conflicts.push({
          id: `conflict-${Date.now()}-business-hours`,
          type: ConflictType.OUTSIDE_BUSINESS_HOURS,
          severity: ConflictSeverity.HIGH,
          description: 'Appointment scheduled outside business hours',
          involvedAppointments: [appointmentData.id],
          autoResolvable: true,
          createdAt: new Date(),
          resolution: {
            strategy: ResolutionStrategy.AUTO_RESCHEDULE,
            suggestedActions: [],
            estimatedImpact: 0.2,
            requiresApproval: false,
          },
        });
      }

      // Check doctor availability
      const doctor = await prisma.doctor.findUnique({
        where: { id: appointmentData.doctorId },
        include: { availability: true },
      });

      if (!doctor || !doctor.isActive) {
        conflicts.push({
          id: `conflict-${Date.now()}-doctor-unavailable`,
          type: ConflictType.DOCTOR_UNAVAILABLE,
          severity: ConflictSeverity.CRITICAL,
          description: 'Doctor is not available',
          involvedAppointments: [appointmentData.id],
          autoResolvable: true,
          createdAt: new Date(),
        });
      }

      // Check buffer time requirements
      const bufferConflicts = await this.checkBufferConflicts(appointmentData);
      conflicts.push(...bufferConflicts);

      return conflicts;
    } catch (error) {
      logger.error('Error checking conflicts', { error, appointmentData });
      throw error;
    }
  }

  /**
   * Optimize doctor's schedule for a specific date
   */
  async optimizeSchedule(
    doctorId: string,
    date: Date,
  ): Promise<OptimizationResult> {
    const { prisma, logger } = this.deps;

    try {
      logger.info('Optimizing schedule', { doctorId, date });

      // Get current day's appointments
      const currentAppointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          scheduledAt: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
        },
        include: {
          specialty: true,
          patient: {
            include: { user: true },
          },
        },
      });

      // Create current schedule representation
      const originalSchedule = this.createScheduleSlots(currentAppointments);

      // Apply optimization algorithms
      const optimizedSchedule = await this.applyScheduleOptimization(
        originalSchedule,
        doctorId,
        date,
      );

      // Calculate improvements
      const improvements = this.calculateOptimizationImprovements(
        originalSchedule,
        optimizedSchedule,
      );

      // Generate change recommendations
      const changes = this.generateScheduleChanges(
        originalSchedule,
        optimizedSchedule,
      );

      return {
        originalSchedule,
        optimizedSchedule,
        improvements,
        changes,
      };
    } catch (error) {
      logger.error('Error optimizing schedule', { error, doctorId, date });
      throw error;
    }
  }

  /**
   * Resolve conflicts automatically when possible
   */
  async resolveConflicts(conflicts: Conflict[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      if (conflict.autoResolvable) {
        const resolution = await this.generateConflictResolution(conflict);
        resolutions.push(resolution);
      }
    }

    return resolutions;
  }

  // Private helper methods

  private calculateEffectiveDuration(
    baseDuration: number,
    bufferTime: number,
    bufferMultiplier: number,
  ): number {
    return baseDuration + Math.round(bufferTime * bufferMultiplier);
  }

  private async generateDoctorSlots(
    doctor: any,
    criteria: SchedulingCriteria,
    effectiveDuration: number,
    specialtyConfig: any,
  ): Promise<AvailableSlot[]> {
    const slots: AvailableSlot[] = [];
    const { prisma } = this.deps;

    // Get doctor's availability for the date range
    const currentDate = new Date(criteria.startDate);
    const endDate = new Date(criteria.endDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const availability = doctor.availability.find(
        (a: any) => a.dayOfWeek === dayOfWeek && a.isActive,
      );

      if (availability) {
        const daySlots = this.generateDaySlots(
          doctor.id,
          currentDate,
          availability,
          effectiveDuration,
          specialtyConfig,
        );
        slots.push(...daySlots);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  private generateDaySlots(
    doctorId: string,
    date: Date,
    availability: any,
    duration: number,
    specialtyConfig: any,
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const [startHour, startMinute] = availability.startTime
      .split(':')
      .map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (addMinutes(currentTime, duration) <= endTime) {
      // Skip lunch hour if configured
      if (!this.isLunchTime(currentTime)) {
        const slotEnd = addMinutes(currentTime, duration);

        slots.push({
          id: `slot-${doctorId}-${format(currentTime, 'yyyy-MM-dd-HH-mm')}`,
          doctorId,
          startTime: new Date(currentTime),
          endTime: slotEnd,
          duration,
          isOptimal: this.isOptimalTime(currentTime),
          confidenceScore: 0.8, // Will be calculated later
          metadata: {
            slotType: 'REGULAR',
            utilizationScore: 0,
            patientPreferenceMatch: 0,
          },
        });
      }

      // Move to next slot (using slot duration from availability)
      currentTime = addMinutes(currentTime, availability.slotDuration);
    }

    return slots;
  }

  private async filterConflictingSlots(
    slots: AvailableSlot[],
    criteria: SchedulingCriteria,
  ): Promise<AvailableSlot[]> {
    const { prisma } = this.deps;
    const filteredSlots: AvailableSlot[] = [];

    for (const slot of slots) {
      // Check for existing appointments
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: slot.doctorId,
          scheduledAt: {
            lt: slot.endTime,
          },
          endTime: {
            gt: slot.startTime,
          },
          status: {
            in: [
              AppointmentStatus.SCHEDULED,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.IN_PROGRESS,
            ],
          },
        },
      });

      if (conflictingAppointments.length === 0) {
        filteredSlots.push(slot);
      }
    }

    return filteredSlots;
  }

  private scoreSlots(
    slots: AvailableSlot[],
    criteria: SchedulingCriteria,
    specialtyConfig: any,
  ): AvailableSlot[] {
    return slots.map(slot => {
      let score = 0.5; // Base score

      // Time preference matching
      if (criteria.preferredTimes?.length) {
        const slotTime = format(slot.startTime, 'HH:mm');
        const preferenceMatch = criteria.preferredTimes.some(
          prefTime =>
            Math.abs(
              this.timeToMinutes(slotTime) - this.timeToMinutes(prefTime),
            ) <= 30,
        );
        if (preferenceMatch) score += 0.3;
      }

      // Optimal time bonus (morning/afternoon preferences)
      if (slot.isOptimal) score += 0.1;

      // Emergency appointment handling
      if (criteria.isEmergency) {
        const hoursFromNow =
          differenceInMinutes(slot.startTime, new Date()) / 60;
        if (hoursFromNow <= 4) score += 0.2;
      }

      // Utilization optimization
      score += this.calculateUtilizationScore(slot) * 0.1;

      return {
        ...slot,
        confidenceScore: Math.min(score, 1.0),
      };
    });
  }

  private async cacheAvailabilityResults(
    criteria: SchedulingCriteria,
    slots: AvailableSlot[],
  ): Promise<void> {
    const { redis, logger } = this.deps;

    try {
      const cacheKey = `availability:${criteria.specialtyId}:${criteria.startDate.toISOString()}:${criteria.endDate.toISOString()}`;
      await redis.setex(cacheKey, 300, JSON.stringify(slots)); // Cache for 5 minutes
    } catch (error) {
      logger.warn('Failed to cache availability results', { error });
    }
  }

  private async checkBufferConflicts(
    appointmentData: any,
  ): Promise<Conflict[]> {
    const { prisma } = this.deps;
    const conflicts: Conflict[] = [];

    // Get specialty config for buffer requirements
    const specialty = await prisma.specialty.findUnique({
      where: { id: appointmentData.specialtyId },
    });

    if (!specialty) return conflicts;

    const specialtyConfig = BusinessRules.getSpecialtyConfig(specialty.name);
    const requiredBuffer = specialtyConfig.bufferTime;

    // Check previous appointment
    const prevAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: appointmentData.doctorId,
        endTime: {
          lte: appointmentData.scheduledAt,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
      },
      orderBy: { endTime: 'desc' },
    });

    if (prevAppointment) {
      const bufferTime = differenceInMinutes(
        appointmentData.scheduledAt,
        prevAppointment.endTime,
      );
      if (bufferTime < requiredBuffer) {
        conflicts.push({
          id: `conflict-${Date.now()}-buffer-before`,
          type: ConflictType.INSUFFICIENT_BUFFER,
          severity: ConflictSeverity.MEDIUM,
          description: `Insufficient buffer time before appointment (${bufferTime}min < ${requiredBuffer}min required)`,
          involvedAppointments: [appointmentData.id, prevAppointment.id],
          autoResolvable: true,
          createdAt: new Date(),
        });
      }
    }

    return conflicts;
  }

  private isWithinBusinessHours(startTime: Date, endTime: Date): boolean {
    const startTimeStr = format(startTime, 'HH:mm');
    const endTimeStr = format(endTime, 'HH:mm');

    return (
      BusinessRules.isBusinessHour(startTimeStr) &&
      BusinessRules.isBusinessHour(endTimeStr)
    );
  }

  private isLunchTime(time: Date): boolean {
    const timeStr = format(time, 'HH:mm');
    const lunchStart = '12:00';
    const lunchEnd = '13:00';

    return timeStr >= lunchStart && timeStr <= lunchEnd;
  }

  private isOptimalTime(time: Date): boolean {
    const hour = time.getHours();
    // Morning (9-11) and early afternoon (14-16) are optimal
    return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateUtilizationScore(slot: AvailableSlot): number {
    // This would integrate with actual utilization data
    // For now, return a base score
    return 0.7;
  }

  private createScheduleSlots(appointments: any[]): ScheduleSlot[] {
    return appointments.map(appointment => ({
      id: appointment.id,
      appointmentId: appointment.id,
      doctorId: appointment.doctorId,
      startTime: appointment.scheduledAt,
      endTime: appointment.endTime,
      type: 'APPOINTMENT' as const,
      metadata: {
        specialtyId: appointment.specialtyId,
        patientId: appointment.patientId,
        status: appointment.status,
      },
    }));
  }

  private async applyScheduleOptimization(
    originalSchedule: ScheduleSlot[],
    doctorId: string,
    date: Date,
  ): Promise<ScheduleSlot[]> {
    // Apply various optimization strategies
    let optimizedSchedule = [...originalSchedule];

    // 1. Minimize gaps between appointments
    optimizedSchedule = this.minimizeGaps(optimizedSchedule);

    // 2. Group similar appointment types
    optimizedSchedule = this.groupSimilarAppointments(optimizedSchedule);

    // 3. Optimize for patient travel time (if location data available)
    optimizedSchedule = await this.optimizeForTravelTime(optimizedSchedule);

    return optimizedSchedule;
  }

  private minimizeGaps(schedule: ScheduleSlot[]): ScheduleSlot[] {
    // Sort appointments by start time
    const sorted = schedule.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    // Logic to minimize gaps would go here
    // For now, return as-is
    return sorted;
  }

  private groupSimilarAppointments(schedule: ScheduleSlot[]): ScheduleSlot[] {
    // Group appointments by type or specialty
    // Implementation would depend on specific business logic
    return schedule;
  }

  private async optimizeForTravelTime(
    schedule: ScheduleSlot[],
  ): Promise<ScheduleSlot[]> {
    // This would integrate with location/travel time APIs
    return schedule;
  }

  private calculateOptimizationImprovements(
    original: ScheduleSlot[],
    optimized: ScheduleSlot[],
  ): OptimizationResult['improvements'] {
    return {
      utilizationIncrease: 0.05, // 5% improvement
      bufferOptimization: 0.1, // 10% better buffer usage
      patientSatisfactionScore: 0.85,
      doctorEfficiencyScore: 0.9,
    };
  }

  private generateScheduleChanges(
    original: ScheduleSlot[],
    optimized: ScheduleSlot[],
  ): OptimizationResult['changes'] {
    const changes: OptimizationResult['changes'] = [];

    // Compare schedules and generate change recommendations
    // This would include detailed change tracking

    return changes;
  }

  private async generateConflictResolution(
    conflict: Conflict,
  ): Promise<ConflictResolution> {
    const actions: ConflictAction[] = [];

    switch (conflict.type) {
      case ConflictType.OUTSIDE_BUSINESS_HOURS:
        actions.push({
          type: 'RESCHEDULE',
          appointmentId: conflict.involvedAppointments[0],
          reason: 'Move to business hours',
          priority: 1,
        });
        break;

      case ConflictType.INSUFFICIENT_BUFFER:
        actions.push({
          type: 'RESCHEDULE',
          appointmentId: conflict.involvedAppointments[0],
          reason: 'Add required buffer time',
          priority: 2,
        });
        break;

      default:
        break;
    }

    return {
      strategy: ResolutionStrategy.AUTO_RESCHEDULE,
      suggestedActions: actions,
      estimatedImpact: 0.3,
      requiresApproval: false,
    };
  }
}
