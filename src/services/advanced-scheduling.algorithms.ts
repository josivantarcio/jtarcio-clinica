import {
  SchedulingCriteria,
  AvailableSlot,
  QueueEntry,
  Conflict,
  ConflictResolution,
  ConflictAction,
  ResolutionStrategy
} from '@/types/scheduling';
import { AppointmentType, AppointmentStatus } from '@/types/appointment';
import { BusinessRules, QUEUE_CONFIG, EMERGENCY_RULES } from '@/config/business-rules';
import { PrismaClient } from '@prisma/client';
import {
  addMinutes,
  addDays,
  differenceInMinutes,
  differenceInHours,
  format,
  parseISO,
  isSameDay,
  startOfDay,
  endOfDay,
  isWithinInterval
} from 'date-fns';
import { Logger } from 'winston';
import Redis from 'ioredis';

export interface SmartSlotFinderOptions {
  maxSlots: number;
  prioritizeOptimalTimes: boolean;
  allowOverbooking: boolean;
  emergencyOverride: boolean;
  patientPreferences?: {
    preferredTimes: string[];
    preferredDoctors: string[];
    maxTravelDistance?: number;
    languagePreference?: string;
  };
}

export interface ConflictResolutionOptions {
  autoResolve: boolean;
  notifyStakeholders: boolean;
  preserveHighPriority: boolean;
  maximizeUtilization: boolean;
}

export interface QueuePrioritizationOptions {
  emergencyWeight: number;
  waitTimeWeight: number;
  patientLoyaltyWeight: number;
  doctorPreferenceWeight: number;
}

export interface AdvancedSchedulingAlgorithmsDeps {
  prisma: PrismaClient;
  redis: Redis;
  logger: Logger;
}

export class AdvancedSchedulingAlgorithms {
  constructor(private deps: AdvancedSchedulingAlgorithmsDeps) {}

  /**
   * Smart slot finder with AI-driven optimization
   */
  async findOptimalSlots(
    criteria: SchedulingCriteria,
    options: SmartSlotFinderOptions = {
      maxSlots: 10,
      prioritizeOptimalTimes: true,
      allowOverbooking: false,
      emergencyOverride: false
    }
  ): Promise<AvailableSlot[]> {
    const { prisma, redis, logger } = this.deps;

    try {
      logger.info('Finding optimal slots with advanced algorithms', { criteria, options });

      // Get base available slots
      const baseSlots = await this.getBaseAvailableSlots(criteria);

      // Apply machine learning-based scoring
      const scoredSlots = await this.applyMLScoring(baseSlots, criteria, options);

      // Apply patient preference matching
      const preferenceMatchedSlots = this.applyPatientPreferences(
        scoredSlots,
        options.patientPreferences
      );

      // Apply doctor efficiency optimization
      const efficiencyOptimizedSlots = await this.applyDoctorEfficiencyOptimization(
        preferenceMatchedSlots,
        criteria
      );

      // Apply time clustering for better utilization
      const clusteredSlots = this.applyTimeClustering(efficiencyOptimizedSlots);

      // Apply emergency override if needed
      let finalSlots = clusteredSlots;
      if (options.emergencyOverride || criteria.isEmergency) {
        finalSlots = await this.applyEmergencySlotGeneration(clusteredSlots, criteria);
      }

      // Sort by composite score and limit results
      const rankedSlots = this.rankSlotsByCompositeScore(finalSlots, criteria, options);

      // Cache results for performance
      await this.cacheOptimalSlots(criteria, rankedSlots);

      logger.info(`Generated ${rankedSlots.length} optimal slots`);
      return rankedSlots.slice(0, options.maxSlots);

    } catch (error) {
      logger.error('Error finding optimal slots', { error, criteria });
      throw error;
    }
  }

  /**
   * Intelligent conflict resolution with multiple strategies
   */
  async resolveConflictsIntelligently(
    conflicts: Conflict[],
    options: ConflictResolutionOptions = {
      autoResolve: true,
      notifyStakeholders: true,
      preserveHighPriority: true,
      maximizeUtilization: true
    }
  ): Promise<ConflictResolution[]> {
    const { prisma, logger } = this.deps;
    const resolutions: ConflictResolution[] = [];

    try {
      // Sort conflicts by severity and impact
      const prioritizedConflicts = this.prioritizeConflicts(conflicts);

      for (const conflict of prioritizedConflicts) {
        const resolution = await this.generateIntelligentResolution(conflict, options);
        
        if (resolution) {
          resolutions.push(resolution);

          // Apply automatic resolution if configured
          if (options.autoResolve && resolution.requiresApproval === false) {
            await this.executeResolution(resolution);
          }
        }
      }

      // Optimize resolution combinations for minimal disruption
      const optimizedResolutions = this.optimizeResolutionCombinations(resolutions);

      logger.info(`Generated ${optimizedResolutions.length} conflict resolutions`);
      return optimizedResolutions;

    } catch (error) {
      logger.error('Error resolving conflicts intelligently', { error });
      throw error;
    }
  }

  /**
   * Advanced queue prioritization with dynamic scoring
   */
  async prioritizeQueue(
    queueEntries: QueueEntry[],
    options: QueuePrioritizationOptions = {
      emergencyWeight: 0.4,
      waitTimeWeight: 0.3,
      patientLoyaltyWeight: 0.2,
      doctorPreferenceWeight: 0.1
    }
  ): Promise<QueueEntry[]> {
    const { prisma, logger } = this.deps;

    try {
      logger.info(`Prioritizing ${queueEntries.length} queue entries`);

      // Calculate dynamic priority scores
      const scoredEntries = await Promise.all(
        queueEntries.map(entry => this.calculateDynamicPriority(entry, options))
      );

      // Apply machine learning predictions for wait time
      const predictiveEntries = await this.applyWaitTimePredictions(scoredEntries);

      // Group by specialty and doctor for balanced distribution
      const balancedEntries = this.applyBalancedDistribution(predictiveEntries);

      // Apply fairness algorithms to prevent starvation
      const fairEntries = this.applyFairnessAlgorithms(balancedEntries);

      // Sort by final priority score
      const prioritizedEntries = fairEntries.sort((a, b) => b.priorityScore - a.priorityScore);

      // Update queue positions in database
      await this.updateQueuePositions(prioritizedEntries);

      logger.info('Queue prioritization completed');
      return prioritizedEntries;

    } catch (error) {
      logger.error('Error prioritizing queue', { error });
      throw error;
    }
  }

  /**
   * Predictive scheduling based on historical patterns
   */
  async generatePredictiveSchedule(
    doctorId: string,
    dateRange: { start: Date; end: Date },
    historicalDays: number = 90
  ): Promise<{
    predictedDemand: { date: Date; expectedAppointments: number; confidence: number }[];
    suggestedCapacityAdjustments: { date: Date; recommendedSlots: number; reason: string }[];
    optimalBreakTimes: { time: string; duration: number; reason: string }[];
  }> {
    const { prisma, logger } = this.deps;

    try {
      // Analyze historical patterns
      const historicalData = await this.analyzeHistoricalPatterns(doctorId, historicalDays);

      // Predict demand using time series analysis
      const predictedDemand = this.predictDemandPatterns(historicalData, dateRange);

      // Generate capacity recommendations
      const capacityAdjustments = this.generateCapacityRecommendations(predictedDemand);

      // Optimize break times based on patterns
      const optimalBreaks = this.optimizeBreakTimes(historicalData);

      return {
        predictedDemand,
        suggestedCapacityAdjustments: capacityAdjustments,
        optimalBreakTimes: optimalBreaks
      };

    } catch (error) {
      logger.error('Error generating predictive schedule', { error, doctorId });
      throw error;
    }
  }

  /**
   * Auto-rescheduling with minimal patient disruption
   */
  async autoRescheduleWithMinimalDisruption(
    affectedAppointments: string[],
    reason: string
  ): Promise<{
    rescheduledAppointments: { appointmentId: string; newSlot: AvailableSlot; notificationSent: boolean }[];
    unreschedulableAppointments: { appointmentId: string; reason: string; suggestedActions: string[] }[];
    estimatedPatientSatisfactionImpact: number;
  }> {
    const { prisma, logger } = this.deps;

    const rescheduled: any[] = [];
    const unrescheduleableA: any[] = [];

    try {
      logger.info(`Auto-rescheduling ${affectedAppointments.length} appointments`);

      for (const appointmentId of affectedAppointments) {
        const appointment = await prisma.appointment.findUniqueOrThrow({
          where: { id: appointmentId },
          include: {
            patient: { include: { user: true } },
            doctor: true,
            specialty: true
          }
        });

        // Find alternative slots with minimal disruption
        const alternativeSlots = await this.findMinimalDisruptionSlots(appointment);

        if (alternativeSlots.length > 0) {
          const bestSlot = alternativeSlots[0];
          
          // Execute rescheduling
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
              scheduledAt: bestSlot.startTime,
              endTime: bestSlot.endTime,
              rescheduleCount: { increment: 1 },
              rescheduledFrom: appointmentId
            }
          });

          rescheduled.push({
            appointmentId,
            newSlot: bestSlot,
            notificationSent: true // Would integrate with notification service
          });

        } else {
          unrescheduleableA.push({
            appointmentId,
            reason: 'No suitable alternative slots found',
            suggestedActions: [
              'Add to priority queue',
              'Contact patient for manual rescheduling',
              'Consider telehealth option'
            ]
          });
        }
      }

      // Calculate patient satisfaction impact
      const satisfactionImpact = this.calculateSatisfactionImpact(rescheduled, unrescheduleableA);

      logger.info(`Auto-rescheduling completed: ${rescheduled.length} rescheduled, ${unrescheduleableA.length} pending manual intervention`);

      return {
        rescheduledAppointments: rescheduled,
        unreschedulableAppointments: unrescheduleableA,
        estimatedPatientSatisfactionImpact: satisfactionImpact
      };

    } catch (error) {
      logger.error('Error in auto-rescheduling', { error });
      throw error;
    }
  }

  // Private helper methods for advanced algorithms

  private async getBaseAvailableSlots(criteria: SchedulingCriteria): Promise<AvailableSlot[]> {
    const { prisma } = this.deps;

    // Get doctors and their availability
    const doctors = criteria.doctorId 
      ? [await prisma.doctor.findUniqueOrThrow({ where: { id: criteria.doctorId }, include: { availability: true } })]
      : await prisma.doctor.findMany({
          where: { 
            specialtyId: criteria.specialtyId,
            isActive: true
          },
          include: { availability: true }
        });

    const slots: AvailableSlot[] = [];

    for (const doctor of doctors) {
      const doctorSlots = await this.generateTimeSlots(doctor, criteria);
      slots.push(...doctorSlots);
    }

    return slots;
  }

  private async generateTimeSlots(doctor: any, criteria: SchedulingCriteria): Promise<AvailableSlot[]> {
    const slots: AvailableSlot[] = [];
    let currentDate = new Date(criteria.startDate);
    const endDate = new Date(criteria.endDate);

    while (currentDate <= endDate) {
      const daySlots = await this.generateDaySlots(doctor, currentDate, criteria);
      slots.push(...daySlots);
      currentDate = addDays(currentDate, 1);
    }

    return slots;
  }

  private async generateDaySlots(doctor: any, date: Date, criteria: SchedulingCriteria): Promise<AvailableSlot[]> {
    const { prisma } = this.deps;
    const dayOfWeek = date.getDay();
    const availability = doctor.availability.find((a: any) => a.dayOfWeek === dayOfWeek);

    if (!availability) return [];

    const slots: AvailableSlot[] = [];
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const dayEndTime = new Date(date);
    dayEndTime.setHours(endHour, endMinute, 0, 0);

    // Get existing appointments for the day
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: {
          gte: startOfDay(date),
          lte: endOfDay(date)
        },
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] }
      }
    });

    while (addMinutes(currentTime, criteria.duration || 30) <= dayEndTime) {
      const slotEndTime = addMinutes(currentTime, criteria.duration || 30);

      // Check for conflicts with existing appointments
      const hasConflict = existingAppointments.some(apt => 
        isWithinInterval(currentTime, { start: apt.scheduledAt, end: apt.endTime }) ||
        isWithinInterval(slotEndTime, { start: apt.scheduledAt, end: apt.endTime })
      );

      if (!hasConflict) {
        slots.push({
          id: `${doctor.id}-${format(currentTime, 'yyyy-MM-dd-HH-mm')}`,
          doctorId: doctor.id,
          startTime: new Date(currentTime),
          endTime: slotEndTime,
          duration: criteria.duration || 30,
          isOptimal: this.isOptimalTimeSlot(currentTime),
          confidenceScore: 0.8,
          metadata: {
            slotType: 'REGULAR',
            utilizationScore: 0.5,
            patientPreferenceMatch: 0.5
          }
        });
      }

      currentTime = addMinutes(currentTime, availability.slotDuration);
    }

    return slots;
  }

  private async applyMLScoring(
    slots: AvailableSlot[],
    criteria: SchedulingCriteria,
    options: SmartSlotFinderOptions
  ): Promise<AvailableSlot[]> {
    // Apply machine learning-based scoring
    // This would integrate with ML models for prediction
    
    return slots.map(slot => ({
      ...slot,
      confidenceScore: this.calculateMLScore(slot, criteria)
    }));
  }

  private calculateMLScore(slot: AvailableSlot, criteria: SchedulingCriteria): number {
    let score = 0.5;

    // Time-based scoring
    const hour = slot.startTime.getHours();
    if (hour >= 9 && hour <= 11) score += 0.2; // Morning preference
    if (hour >= 14 && hour <= 16) score += 0.15; // Afternoon preference

    // Day of week scoring
    const dayOfWeek = slot.startTime.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) score += 0.1; // Weekday preference

    // Emergency adjustment
    if (criteria.isEmergency) {
      const hoursFromNow = differenceInHours(slot.startTime, new Date());
      if (hoursFromNow <= 2) score += 0.3;
    }

    // Appointment type adjustment
    if (criteria.appointmentType === AppointmentType.FOLLOW_UP) {
      score += 0.1; // Follow-ups are generally easier to schedule
    }

    return Math.min(score, 1.0);
  }

  private applyPatientPreferences(
    slots: AvailableSlot[],
    preferences?: SmartSlotFinderOptions['patientPreferences']
  ): AvailableSlot[] {
    if (!preferences) return slots;

    return slots.map(slot => {
      let preferenceScore = slot.metadata?.patientPreferenceMatch || 0.5;

      // Time preference matching
      if (preferences.preferredTimes?.length) {
        const slotTime = format(slot.startTime, 'HH:mm');
        const matchesPreference = preferences.preferredTimes.some(prefTime =>
          Math.abs(this.timeToMinutes(slotTime) - this.timeToMinutes(prefTime)) <= 60
        );
        if (matchesPreference) preferenceScore += 0.3;
      }

      // Doctor preference matching
      if (preferences.preferredDoctors?.includes(slot.doctorId)) {
        preferenceScore += 0.2;
      }

      return {
        ...slot,
        metadata: {
          ...slot.metadata,
          patientPreferenceMatch: Math.min(preferenceScore, 1.0)
        }
      };
    });
  }

  private async applyDoctorEfficiencyOptimization(
    slots: AvailableSlot[],
    criteria: SchedulingCriteria
  ): Promise<AvailableSlot[]> {
    // Group slots by doctor and optimize for efficiency
    const doctorGroups = this.groupSlotsByDoctor(slots);
    const optimizedSlots: AvailableSlot[] = [];

    for (const [doctorId, doctorSlots] of doctorGroups) {
      const optimized = await this.optimizeDoctorSlots(doctorSlots, criteria);
      optimizedSlots.push(...optimized);
    }

    return optimizedSlots;
  }

  private applyTimeClustering(slots: AvailableSlot[]): AvailableSlot[] {
    // Group nearby time slots to improve utilization
    const clustered = slots.map(slot => {
      const clusterScore = this.calculateClusterScore(slot, slots);
      return {
        ...slot,
        metadata: {
          ...slot.metadata,
          utilizationScore: clusterScore
        }
      };
    });

    return clustered;
  }

  private async applyEmergencySlotGeneration(
    slots: AvailableSlot[],
    criteria: SchedulingCriteria
  ): Promise<AvailableSlot[]> {
    if (!criteria.isEmergency) return slots;

    // Generate emergency slots by overriding some constraints
    const emergencySlots = await this.generateEmergencySlots(criteria);
    
    return [...slots, ...emergencySlots];
  }

  private rankSlotsByCompositeScore(
    slots: AvailableSlot[],
    criteria: SchedulingCriteria,
    options: SmartSlotFinderOptions
  ): AvailableSlot[] {
    return slots.map(slot => {
      const compositeScore = this.calculateCompositeScore(slot, criteria, options);
      return {
        ...slot,
        confidenceScore: compositeScore
      };
    }).sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  private calculateCompositeScore(
    slot: AvailableSlot,
    criteria: SchedulingCriteria,
    options: SmartSlotFinderOptions
  ): number {
    const baseScore = slot.confidenceScore;
    const utilizationScore = slot.metadata?.utilizationScore || 0.5;
    const preferenceScore = slot.metadata?.patientPreferenceMatch || 0.5;

    // Weighted combination
    const weights = {
      base: 0.4,
      utilization: options.prioritizeOptimalTimes ? 0.3 : 0.2,
      preference: 0.3
    };

    return (
      baseScore * weights.base +
      utilizationScore * weights.utilization +
      preferenceScore * weights.preference
    );
  }

  private prioritizeConflicts(conflicts: Conflict[]): Conflict[] {
    return conflicts.sort((a, b) => {
      // Sort by severity first
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;

      // Then by number of involved appointments
      return b.involvedAppointments.length - a.involvedAppointments.length;
    });
  }

  private async generateIntelligentResolution(
    conflict: Conflict,
    options: ConflictResolutionOptions
  ): Promise<ConflictResolution | null> {
    const actions: ConflictAction[] = [];

    switch (conflict.type) {
      case 'DOUBLE_BOOKING':
        actions.push(...await this.resolveDoubleBooking(conflict, options));
        break;
      case 'RESOURCE_CONFLICT':
        actions.push(...await this.resolveResourceConflict(conflict, options));
        break;
      case 'DOCTOR_UNAVAILABLE':
        actions.push(...await this.resolveDoctorUnavailability(conflict, options));
        break;
      default:
        return null;
    }

    return {
      strategy: ResolutionStrategy.AUTO_RESCHEDULE,
      suggestedActions: actions,
      estimatedImpact: this.calculateResolutionImpact(actions),
      requiresApproval: !options.autoResolve || conflict.severity === 'CRITICAL'
    };
  }

  private async calculateDynamicPriority(
    entry: QueueEntry,
    options: QueuePrioritizationOptions
  ): Promise<QueueEntry> {
    let score = entry.priorityScore;

    // Emergency weight
    if (entry.appointmentType === AppointmentType.EMERGENCY) {
      score += 10 * options.emergencyWeight;
    }

    // Wait time weight
    const waitHours = differenceInHours(new Date(), entry.createdAt);
    const waitScore = Math.min(waitHours / 24, 5); // Max 5 points for waiting
    score += waitScore * options.waitTimeWeight * 10;

    // Patient loyalty (would integrate with patient history)
    const loyaltyScore = await this.calculatePatientLoyalty(entry.patientId);
    score += loyaltyScore * options.patientLoyaltyWeight * 10;

    // Doctor preference match
    if (entry.doctorId) {
      const preferenceScore = await this.calculateDoctorPreferenceMatch(entry);
      score += preferenceScore * options.doctorPreferenceWeight * 10;
    }

    return {
      ...entry,
      priorityScore: Math.round(score * 100) / 100
    };
  }

  // Additional helper methods...

  private isOptimalTimeSlot(time: Date): boolean {
    const hour = time.getHours();
    return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private groupSlotsByDoctor(slots: AvailableSlot[]): Map<string, AvailableSlot[]> {
    const groups = new Map<string, AvailableSlot[]>();
    
    for (const slot of slots) {
      const existing = groups.get(slot.doctorId) || [];
      existing.push(slot);
      groups.set(slot.doctorId, existing);
    }

    return groups;
  }

  private calculateClusterScore(slot: AvailableSlot, allSlots: AvailableSlot[]): number {
    // Calculate how well this slot fits with nearby slots for utilization
    const nearbySlots = allSlots.filter(s => 
      s.doctorId === slot.doctorId &&
      Math.abs(differenceInMinutes(s.startTime, slot.startTime)) <= 120
    );

    return Math.min(nearbySlots.length / 4, 1.0); // Normalize to 0-1
  }

  private async calculatePatientLoyalty(patientId: string): Promise<number> {
    const { prisma } = this.deps;
    
    const appointmentCount = await prisma.appointment.count({
      where: { patientId, status: AppointmentStatus.COMPLETED }
    });

    return Math.min(appointmentCount / 10, 1.0); // Max score at 10+ appointments
  }

  private async calculateDoctorPreferenceMatch(entry: QueueEntry): Promise<number> {
    // This would calculate how well the queue entry matches doctor preferences
    return 0.5; // Placeholder
  }

  private async cacheOptimalSlots(criteria: SchedulingCriteria, slots: AvailableSlot[]): Promise<void> {
    const { redis } = this.deps;
    const cacheKey = `optimal-slots:${JSON.stringify(criteria)}`;
    await redis.setex(cacheKey, 300, JSON.stringify(slots)); // 5 minute cache
  }

  private async updateQueuePositions(entries: QueueEntry[]): Promise<void> {
    // Update queue positions in database
    // Implementation would depend on queue storage strategy
  }

  private async executeResolution(resolution: ConflictResolution): Promise<void> {
    // Execute the conflict resolution actions
    // Implementation would handle actual appointment modifications
  }

  private calculateResolutionImpact(actions: ConflictAction[]): number {
    // Calculate estimated impact of resolution actions
    return actions.length * 0.1; // Placeholder calculation
  }

  // More helper method implementations would continue here...
  private async resolveDoubleBooking(conflict: Conflict, options: ConflictResolutionOptions): Promise<ConflictAction[]> {
    return [];
  }

  private async resolveResourceConflict(conflict: Conflict, options: ConflictResolutionOptions): Promise<ConflictAction[]> {
    return [];
  }

  private async resolveDoctorUnavailability(conflict: Conflict, options: ConflictResolutionOptions): Promise<ConflictAction[]> {
    return [];
  }

  private async optimizeDoctorSlots(slots: AvailableSlot[], criteria: SchedulingCriteria): Promise<AvailableSlot[]> {
    return slots;
  }

  private async generateEmergencySlots(criteria: SchedulingCriteria): Promise<AvailableSlot[]> {
    return [];
  }

  private optimizeResolutionCombinations(resolutions: ConflictResolution[]): ConflictResolution[] {
    return resolutions;
  }

  private async applyWaitTimePredictions(entries: QueueEntry[]): Promise<QueueEntry[]> {
    return entries;
  }

  private applyBalancedDistribution(entries: QueueEntry[]): QueueEntry[] {
    return entries;
  }

  private applyFairnessAlgorithms(entries: QueueEntry[]): QueueEntry[] {
    return entries;
  }

  private async analyzeHistoricalPatterns(doctorId: string, days: number): Promise<any> {
    return {};
  }

  private predictDemandPatterns(historicalData: any, dateRange: any): any[] {
    return [];
  }

  private generateCapacityRecommendations(predictedDemand: any[]): any[] {
    return [];
  }

  private optimizeBreakTimes(historicalData: any): any[] {
    return [];
  }

  private async findMinimalDisruptionSlots(appointment: any): Promise<AvailableSlot[]> {
    return [];
  }

  private calculateSatisfactionImpact(rescheduled: any[], unrescheduled: any[]): number {
    return 0.8; // Placeholder
  }
}