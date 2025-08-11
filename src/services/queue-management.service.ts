import {
  QueueEntry,
  SchedulingCriteria,
  AvailableSlot,
  AppointmentBooking
} from '@/types/scheduling';
import { AppointmentType, AppointmentStatus } from '@/types/appointment';
import { 
  BusinessRules, 
  QUEUE_CONFIG, 
  PATIENT_CLASSIFICATION,
  PatientClassification 
} from '@/config/business-rules';
import { PrismaClient } from '../../database/generated/client';
import {
  addDays,
  addHours,
  differenceInHours,
  differenceInDays,
  isAfter,
  isBefore,
  format
} from 'date-fns';
import { Logger } from 'winston';
import Redis from 'ioredis';

export interface QueueManagementDeps {
  prisma: PrismaClient;
  redis: Redis;
  logger: Logger;
}

export interface QueuePosition {
  position: number;
  estimatedWaitTime: number; // in hours
  ahead: number;
  totalInQueue: number;
}

export interface WaitlistEntry extends QueueEntry {
  position?: number;
  estimatedWaitTime?: number;
  lastNotified?: Date;
  autoBookingAttempts: number;
  maxAutoBookingAttempts: number;
}

export interface QueueNotification {
  entryId: string;
  patientId: string;
  type: 'SLOT_AVAILABLE' | 'POSITION_UPDATE' | 'AUTO_BOOKED' | 'TIMEOUT_WARNING';
  message: string;
  availableSlot?: AvailableSlot;
  expiresAt?: Date;
}

export interface QueueMetrics {
  totalEntries: number;
  averageWaitTime: number;
  successfulBookingRate: number;
  timeoutRate: number;
  priorityDistribution: Record<string, number>;
  specialtyQueues: Record<string, number>;
}

export class QueueManagementService {
  private readonly QUEUE_KEY_PREFIX = 'appointment-queue';
  private readonly NOTIFICATION_INTERVAL = 60000; // 1 minute
  
  constructor(private deps: QueueManagementDeps) {
    this.startQueueProcessing();
  }

  /**
   * Add patient to appointment queue
   */
  async addToQueue(criteria: SchedulingCriteria & {
    maxWaitDays: number;
    preferredDates: Date[];
    preferredTimes: string[];
    autoBookingEnabled?: boolean;
  }): Promise<WaitlistEntry> {
    const { prisma, redis, logger } = this.deps;

    try {
      logger.info('Adding patient to appointment queue', { criteria });

      // Calculate priority score
      const patientClassification = await this.getPatientClassification(criteria.patientId);
      const priorityScore = BusinessRules.calculatePriorityScore(
        criteria.appointmentType,
        patientClassification,
        criteria.urgencyLevel || 5,
        0 // initial wait time
      );

      // Create queue entry
      const queueEntry: WaitlistEntry = {
        id: `queue-${Date.now()}-${criteria.patientId}`,
        patientId: criteria.patientId,
        doctorId: criteria.doctorId,
        specialtyId: criteria.specialtyId,
        appointmentType: criteria.appointmentType,
        priorityScore,
        preferredDates: criteria.preferredDates,
        preferredTimes: criteria.preferredTimes,
        maxWaitDays: criteria.maxWaitDays,
        urgencyLevel: criteria.urgencyLevel || 5,
        createdAt: new Date(),
        estimatedWaitTime: 0,
        autoBookingEnabled: criteria.autoBookingEnabled ?? true,
        autoBookingAttempts: 0,
        maxAutoBookingAttempts: 5
      };

      // Store in database
      await this.storeQueueEntry(queueEntry);

      // Add to Redis for real-time processing
      const queueKey = this.getQueueKey(criteria.specialtyId, criteria.doctorId);
      await redis.zadd(queueKey, priorityScore, JSON.stringify(queueEntry));

      // Calculate position and estimated wait time
      const position = await this.calculateQueuePosition(queueEntry);
      queueEntry.position = position.position;
      queueEntry.estimatedWaitTime = position.estimatedWaitTime;

      // Send confirmation notification
      await this.sendQueueNotification({
        entryId: queueEntry.id,
        patientId: queueEntry.patientId,
        type: 'POSITION_UPDATE',
        message: `You are #${position.position} in the queue. Estimated wait time: ${Math.round(position.estimatedWaitTime)} hours.`
      });

      logger.info('Patient added to queue successfully', { 
        entryId: queueEntry.id,
        position: position.position,
        priorityScore
      });

      return queueEntry;

    } catch (error) {
      logger.error('Error adding patient to queue', { error, criteria });
      throw error;
    }
  }

  /**
   * Remove patient from queue
   */
  async removeFromQueue(entryId: string, reason: string = 'USER_REQUEST'): Promise<boolean> {
    const { redis, logger } = this.deps;

    try {
      logger.info('Removing patient from queue', { entryId, reason });

      // Get queue entry
      const entry = await this.getQueueEntry(entryId);
      if (!entry) {
        return false;
      }

      // Remove from Redis
      const queueKey = this.getQueueKey(entry.specialtyId, entry.doctorId);
      const removed = await redis.zrem(queueKey, JSON.stringify(entry));

      if (removed > 0) {
        // Mark as removed in database
        await this.markQueueEntryRemoved(entryId, reason);

        // Update positions for remaining entries
        await this.updateQueuePositions(entry.specialtyId, entry.doctorId);

        logger.info('Patient removed from queue successfully', { entryId });
        return true;
      }

      return false;

    } catch (error) {
      logger.error('Error removing patient from queue', { error, entryId });
      throw error;
    }
  }

  /**
   * Get queue position for a patient
   */
  async getQueuePosition(entryId: string): Promise<QueuePosition | null> {
    try {
      const entry = await this.getQueueEntry(entryId);
      if (!entry) return null;

      return await this.calculateQueuePosition(entry);

    } catch (error) {
      this.deps.logger.error('Error getting queue position', { error, entryId });
      throw error;
    }
  }

  /**
   * Process queue when slots become available
   */
  async processAvailableSlot(slot: AvailableSlot): Promise<{
    processed: boolean;
    appointmentBooked?: boolean;
    queueEntry?: WaitlistEntry;
    notification?: QueueNotification;
  }> {
    const { redis, logger } = this.deps;

    try {
      logger.info('Processing available slot for queue', { slot });

      // Find matching queue entries
      const candidates = await this.findMatchingQueueEntries(slot);
      
      if (candidates.length === 0) {
        return { processed: false };
      }

      // Get highest priority candidate
      const topCandidate = candidates[0];

      // Check if auto-booking is enabled
      if (topCandidate.autoBookingEnabled && 
          topCandidate.autoBookingAttempts < topCandidate.maxAutoBookingAttempts) {
        
        // Attempt automatic booking
        const bookingResult = await this.attemptAutoBooking(topCandidate, slot);
        
        if (bookingResult.success) {
          // Remove from queue
          await this.removeFromQueue(topCandidate.id, 'AUTO_BOOKED');
          
          const notification: QueueNotification = {
            entryId: topCandidate.id,
            patientId: topCandidate.patientId,
            type: 'AUTO_BOOKED',
            message: `Great news! Your appointment has been automatically booked for ${format(slot.startTime, 'PPP p')}.`
          };

          await this.sendQueueNotification(notification);

          return {
            processed: true,
            appointmentBooked: true,
            queueEntry: topCandidate,
            notification
          };
        } else {
          // Increment auto-booking attempts
          await this.incrementAutoBookingAttempts(topCandidate.id);
        }
      }

      // If auto-booking failed or disabled, send slot available notification
      const notification: QueueNotification = {
        entryId: topCandidate.id,
        patientId: topCandidate.patientId,
        type: 'SLOT_AVAILABLE',
        message: `An appointment slot is available! Book now for ${format(slot.startTime, 'PPP p')}.`,
        availableSlot: slot,
        expiresAt: addHours(new Date(), 2) // 2 hour booking window
      };

      await this.sendQueueNotification(notification);

      return {
        processed: true,
        appointmentBooked: false,
        queueEntry: topCandidate,
        notification
      };

    } catch (error) {
      logger.error('Error processing available slot', { error, slot });
      throw error;
    }
  }

  /**
   * Update queue priorities based on waiting time and other factors
   */
  async updateQueuePriorities(): Promise<{ updated: number; expired: number }> {
    const { redis, logger } = this.deps;

    try {
      logger.info('Updating queue priorities');

      let totalUpdated = 0;
      let totalExpired = 0;

      // Get all active queues
      const queueKeys = await redis.keys(`${this.QUEUE_KEY_PREFIX}:*`);

      for (const queueKey of queueKeys) {
        // Get all entries in this queue
        const entries = await redis.zrange(queueKey, 0, -1);
        
        for (const entryStr of entries) {
          try {
            const entry: WaitlistEntry = JSON.parse(entryStr);
            
            // Check if entry has expired
            if (this.hasQueueEntryExpired(entry)) {
              await this.expireQueueEntry(entry);
              totalExpired++;
              continue;
            }

            // Calculate updated priority score
            const waitingHours = differenceInHours(new Date(), entry.createdAt);
            const patientClassification = await this.getPatientClassification(entry.patientId);
            
            const newPriorityScore = BusinessRules.calculatePriorityScore(
              entry.appointmentType,
              patientClassification,
              entry.urgencyLevel,
              waitingHours
            );

            // Update if priority has changed significantly
            if (Math.abs(newPriorityScore - entry.priorityScore) > 0.5) {
              entry.priorityScore = newPriorityScore;
              
              // Update in Redis
              await redis.zrem(queueKey, entryStr);
              await redis.zadd(queueKey, newPriorityScore, JSON.stringify(entry));
              
              totalUpdated++;
            }

          } catch (parseError) {
            logger.warn('Failed to parse queue entry', { parseError, entryStr });
          }
        }

        // Update positions after priority changes
        await this.updateQueuePositions(
          this.extractSpecialtyFromQueueKey(queueKey),
          this.extractDoctorFromQueueKey(queueKey)
        );
      }

      logger.info('Queue priorities updated', { 
        totalUpdated, 
        totalExpired, 
        queuesProcessed: queueKeys.length 
      });

      return { updated: totalUpdated, expired: totalExpired };

    } catch (error) {
      logger.error('Error updating queue priorities', { error });
      throw error;
    }
  }

  /**
   * Get queue metrics and statistics
   */
  async getQueueMetrics(specialtyId?: string, doctorId?: string): Promise<QueueMetrics> {
    const { redis, prisma, logger } = this.deps;

    try {
      const queuePattern = specialtyId 
        ? `${this.QUEUE_KEY_PREFIX}:${specialtyId}${doctorId ? `:${doctorId}` : ':*'}`
        : `${this.QUEUE_KEY_PREFIX}:*`;

      const queueKeys = await redis.keys(queuePattern);
      let totalEntries = 0;
      const priorityDistribution: Record<string, number> = {};
      const specialtyQueues: Record<string, number> = {};

      // Calculate current queue metrics
      for (const queueKey of queueKeys) {
        const entries = await redis.zrange(queueKey, 0, -1);
        totalEntries += entries.length;

        const specialty = this.extractSpecialtyFromQueueKey(queueKey);
        specialtyQueues[specialty] = (specialtyQueues[specialty] || 0) + entries.length;

        // Analyze priority distribution
        for (const entryStr of entries) {
          try {
            const entry: WaitlistEntry = JSON.parse(entryStr);
            const priorityBucket = this.getPriorityBucket(entry.priorityScore);
            priorityDistribution[priorityBucket] = (priorityDistribution[priorityBucket] || 0) + 1;
          } catch {
            // Skip invalid entries
          }
        }
      }

      // Calculate historical metrics from database
      const historicalData = await this.getHistoricalQueueMetrics(specialtyId, doctorId);

      return {
        totalEntries,
        averageWaitTime: historicalData.averageWaitTime,
        successfulBookingRate: historicalData.successfulBookingRate,
        timeoutRate: historicalData.timeoutRate,
        priorityDistribution,
        specialtyQueues
      };

    } catch (error) {
      logger.error('Error getting queue metrics', { error, specialtyId, doctorId });
      throw error;
    }
  }

  /**
   * Bulk process queue entries for optimization
   */
  async optimizeQueueDistribution(): Promise<{
    redistributed: number;
    suggestions: string[];
  }> {
    const { redis, logger } = this.deps;

    try {
      logger.info('Optimizing queue distribution');

      const suggestions: string[] = [];
      const redistributed = 0;

      // Get all queue keys
      const queueKeys = await redis.keys(`${this.QUEUE_KEY_PREFIX}:*`);
      const queueSizes = new Map<string, number>();

      // Calculate current queue sizes
      for (const queueKey of queueKeys) {
        const size = await redis.zcard(queueKey);
        queueSizes.set(queueKey, size);
      }

      // Find overloaded queues
      const averageSize = Array.from(queueSizes.values()).reduce((a, b) => a + b, 0) / queueSizes.size;
      const overloadedQueues = Array.from(queueSizes.entries())
        .filter(([_, size]) => size > averageSize * 1.5)
        .sort(([_, a], [__, b]) => b - a);

      // Generate optimization suggestions
      for (const [queueKey, size] of overloadedQueues) {
        const specialty = this.extractSpecialtyFromQueueKey(queueKey);
        const doctor = this.extractDoctorFromQueueKey(queueKey);

        if (size > QUEUE_CONFIG.MAX_QUEUE_SIZE_PER_DOCTOR) {
          suggestions.push(
            `Queue for ${specialty}${doctor ? ` (Dr. ${doctor})` : ''} is overloaded (${size} entries). Consider adding more availability or alternative doctors.`
          );
        }

        // Suggest redistribution to other doctors in same specialty
        if (doctor) {
          const alternativeDoctors = await this.findAlternativeDoctors(specialty);
          if (alternativeDoctors.length > 0) {
            suggestions.push(
              `Consider redistributing some patients from ${doctor} to other ${specialty} doctors: ${alternativeDoctors.join(', ')}`
            );
          }
        }
      }

      return {
        redistributed,
        suggestions
      };

    } catch (error) {
      logger.error('Error optimizing queue distribution', { error });
      throw error;
    }
  }

  // Private helper methods

  private getQueueKey(specialtyId: string, doctorId?: string): string {
    return `${this.QUEUE_KEY_PREFIX}:${specialtyId}${doctorId ? `:${doctorId}` : ''}`;
  }

  private async getPatientClassification(patientId: string): Promise<PatientClassification> {
    const { prisma } = this.deps;

    try {
      // Get patient's appointment history to determine classification
      const appointmentCount = await prisma.appointment.count({
        where: { 
          patientId, 
          status: AppointmentStatus.COMPLETED 
        }
      });

      // Simple classification logic - could be more sophisticated
      if (appointmentCount >= 10) return 'VIP';
      if (appointmentCount === 0) return 'NEW_PATIENT';
      return 'REGULAR';

    } catch {
      return 'NEW_PATIENT';
    }
  }

  private async storeQueueEntry(entry: WaitlistEntry): Promise<void> {
    // Store queue entry in database for persistence
    // This would use a custom queue table or extend existing models
    this.deps.logger.info('Queue entry stored in database', { entryId: entry.id });
  }

  private async calculateQueuePosition(entry: WaitlistEntry): Promise<QueuePosition> {
    const { redis } = this.deps;
    
    const queueKey = this.getQueueKey(entry.specialtyId, entry.doctorId);
    const position = await redis.zrevrank(queueKey, JSON.stringify(entry));
    const totalInQueue = await redis.zcard(queueKey);

    // Estimate wait time based on historical data and position
    const estimatedWaitTime = await this.estimateWaitTime(entry, position || 0);

    return {
      position: (position || 0) + 1,
      estimatedWaitTime,
      ahead: position || 0,
      totalInQueue
    };
  }

  private async estimateWaitTime(entry: WaitlistEntry, position: number): Promise<number> {
    // Simple estimation - could be more sophisticated with ML
    const baseWaitTime = 24; // 24 hours base
    const positionMultiplier = 12; // 12 hours per position
    
    return Math.max(baseWaitTime + (position * positionMultiplier), 1);
  }

  private async findMatchingQueueEntries(slot: AvailableSlot): Promise<WaitlistEntry[]> {
    const { redis } = this.deps;

    // Get entries from relevant queues
    const queueKeys = [
      this.getQueueKey(slot.doctorId), // Doctor-specific queue
      this.getQueueKey('ANY', slot.doctorId) // Any specialty with this doctor
    ];

    const candidates: WaitlistEntry[] = [];

    for (const queueKey of queueKeys) {
      try {
        // Get top entries by priority (highest scores first)
        const entries = await redis.zrevrange(queueKey, 0, 10);
        
        for (const entryStr of entries) {
          const entry: WaitlistEntry = JSON.parse(entryStr);
          
          // Check if slot matches entry criteria
          if (this.slotMatchesEntry(slot, entry)) {
            candidates.push(entry);
          }
        }
      } catch {
        // Skip invalid queue keys
      }
    }

    // Sort by priority score (descending)
    return candidates.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  private slotMatchesEntry(slot: AvailableSlot, entry: WaitlistEntry): boolean {
    // Check doctor match
    if (entry.doctorId && entry.doctorId !== slot.doctorId) {
      return false;
    }

    // Check preferred dates
    if (entry.preferredDates.length > 0) {
      const slotDate = slot.startTime.toISOString().split('T')[0];
      const hasPreferredDate = entry.preferredDates.some(
        date => date.toISOString().split('T')[0] === slotDate
      );
      if (!hasPreferredDate) return false;
    }

    // Check preferred times
    if (entry.preferredTimes.length > 0) {
      const slotTime = format(slot.startTime, 'HH:mm');
      const hasPreferredTime = entry.preferredTimes.some(
        time => Math.abs(this.timeToMinutes(time) - this.timeToMinutes(slotTime)) <= 60
      );
      if (!hasPreferredTime) return false;
    }

    return true;
  }

  private async attemptAutoBooking(entry: WaitlistEntry, slot: AvailableSlot): Promise<{ success: boolean; error?: string }> {
    try {
      // This would integrate with the appointment booking service
      const bookingData: AppointmentBooking = {
        patientId: entry.patientId,
        doctorId: slot.doctorId,
        specialtyId: entry.specialtyId,
        slotId: slot.id,
        appointmentType: entry.appointmentType,
        duration: slot.duration,
        urgencyLevel: entry.urgencyLevel
      };

      // Call appointment service to book
      // const result = await appointmentService.bookAppointment(bookingData);
      
      this.deps.logger.info('Auto-booking attempted', { entryId: entry.id, slotId: slot.id });
      
      // Return success for now - would depend on actual booking service
      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async sendQueueNotification(notification: QueueNotification): Promise<void> {
    // Send notification to patient
    // This would integrate with the notification service
    this.deps.logger.info('Queue notification sent', { 
      type: notification.type,
      patientId: notification.patientId 
    });
  }

  private hasQueueEntryExpired(entry: WaitlistEntry): boolean {
    const maxWaitDate = addDays(entry.createdAt, entry.maxWaitDays);
    return isAfter(new Date(), maxWaitDate);
  }

  private async expireQueueEntry(entry: WaitlistEntry): Promise<void> {
    await this.removeFromQueue(entry.id, 'EXPIRED');
    
    await this.sendQueueNotification({
      entryId: entry.id,
      patientId: entry.patientId,
      type: 'TIMEOUT_WARNING',
      message: 'Your appointment request has expired. Please submit a new request if still needed.'
    });
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getPriorityBucket(score: number): string {
    if (score >= 15) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  }

  private extractSpecialtyFromQueueKey(queueKey: string): string {
    const parts = queueKey.split(':');
    return parts[1] || 'unknown';
  }

  private extractDoctorFromQueueKey(queueKey: string): string | undefined {
    const parts = queueKey.split(':');
    return parts[2];
  }

  private async findAlternativeDoctors(specialtyName: string): Promise<string[]> {
    // Find other doctors in the same specialty
    return ['Dr. Smith', 'Dr. Johnson']; // Placeholder
  }

  private async getHistoricalQueueMetrics(specialtyId?: string, doctorId?: string): Promise<{
    averageWaitTime: number;
    successfulBookingRate: number;
    timeoutRate: number;
  }> {
    // Get historical metrics from database
    return {
      averageWaitTime: 48, // hours
      successfulBookingRate: 0.85,
      timeoutRate: 0.10
    };
  }

  private async getQueueEntry(entryId: string): Promise<WaitlistEntry | null> {
    // Get queue entry from database or cache
    return null; // Placeholder
  }

  private async markQueueEntryRemoved(entryId: string, reason: string): Promise<void> {
    // Mark queue entry as removed in database
    this.deps.logger.info('Queue entry marked as removed', { entryId, reason });
  }

  private async updateQueuePositions(specialtyId: string, doctorId?: string): Promise<void> {
    // Update queue positions for all entries in the queue
    this.deps.logger.info('Queue positions updated', { specialtyId, doctorId });
  }

  private async incrementAutoBookingAttempts(entryId: string): Promise<void> {
    // Increment auto-booking attempts counter
    this.deps.logger.info('Auto-booking attempts incremented', { entryId });
  }

  private startQueueProcessing(): void {
    // Start background queue processing
    setInterval(async () => {
      try {
        await this.updateQueuePriorities();
      } catch (error) {
        this.deps.logger.warn('Queue processing error', { error });
      }
    }, this.NOTIFICATION_INTERVAL);
  }
}