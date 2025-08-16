import {
  PrismaClient,
  Appointment,
  Doctor,
  Specialty,
  Patient,
  AppointmentStatus as PrismaAppointmentStatus,
} from '../database/generated/client';
import { AppointmentStatus, AppointmentType } from '../types/appointment';
import {
  SchedulingCriteria,
  AvailableSlot,
  QueueEntry,
} from '../types/scheduling';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';
import { Logger } from 'winston';
import Redis from 'ioredis';

export interface SchedulingRepositoryDeps {
  prisma: PrismaClient;
  redis: Redis;
  logger: Logger;
}

export interface AppointmentWithRelations extends Appointment {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    patientProfile?: Patient | null;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    doctorProfile?: Doctor | null;
  };
  specialty: Specialty;
}

export interface DoctorWithAvailability extends Doctor {
  availability: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
  }[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class SchedulingRepository {
  private readonly CACHE_TTL = {
    APPOINTMENTS: 300, // 5 minutes
    AVAILABILITY: 600, // 10 minutes
    DOCTORS: 1800, // 30 minutes
    SPECIALTIES: 3600, // 1 hour
    QUEUE: 60, // 1 minute
  };

  private readonly CACHE_KEYS = {
    APPOINTMENT: (id: string) => `appointment:${id}`,
    DOCTOR_APPOINTMENTS: (doctorId: string, date: string) =>
      `doctor-appointments:${doctorId}:${date}`,
    DOCTOR_AVAILABILITY: (doctorId: string) =>
      `doctor-availability:${doctorId}`,
    SPECIALTY_DOCTORS: (specialtyId: string) =>
      `specialty-doctors:${specialtyId}`,
    PATIENT_APPOINTMENTS: (patientId: string) =>
      `patient-appointments:${patientId}`,
    QUEUE_ENTRY: (entryId: string) => `queue-entry:${entryId}`,
    AVAILABILITY_SLOTS: (doctorId: string, date: string) =>
      `availability-slots:${doctorId}:${date}`,
  };

  constructor(private deps: SchedulingRepositoryDeps) {}

  // Appointment CRUD operations

  async createAppointment(data: {
    patientId: string;
    doctorId: string;
    specialtyId: string;
    scheduledAt: Date;
    duration: number;
    type: AppointmentType;
    reason?: string;
    symptoms?: string;
    notes?: string;
  }): Promise<AppointmentWithRelations> {
    const { prisma, logger } = this.deps;

    try {
      const appointment = await prisma.appointment.create({
        data: {
          ...data,
          endTime: new Date(data.scheduledAt.getTime() + data.duration * 60000),
          status: PrismaAppointmentStatus.SCHEDULED,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              patientProfile: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              doctorProfile: true,
            },
          },
          specialty: true,
        },
      });

      // Invalidate related caches
      await this.invalidateAppointmentCaches(appointment);

      logger.info('Appointment created', { appointmentId: appointment.id });
      return appointment;
    } catch (error) {
      logger.error('Error creating appointment', { error, data });
      throw error;
    }
  }

  async getAppointmentById(
    id: string,
  ): Promise<AppointmentWithRelations | null> {
    const { prisma, redis, logger } = this.deps;
    const cacheKey = this.CACHE_KEYS.APPOINTMENT(id);

    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              patientProfile: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              doctorProfile: true,
            },
          },
          specialty: true,
        },
      });

      // Cache result
      if (appointment) {
        await redis.setex(
          cacheKey,
          this.CACHE_TTL.APPOINTMENTS,
          JSON.stringify(appointment),
        );
      }

      return appointment;
    } catch (error) {
      logger.error('Error getting appointment by ID', { error, id });
      throw error;
    }
  }

  async updateAppointment(
    id: string,
    data: Partial<Appointment>,
  ): Promise<AppointmentWithRelations> {
    const { prisma, logger } = this.deps;

    try {
      const appointment = await prisma.appointment.update({
        where: { id },
        data,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              patientProfile: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              doctorProfile: true,
            },
          },
          specialty: true,
        },
      });

      // Invalidate caches
      await this.invalidateAppointmentCaches(appointment);

      logger.info('Appointment updated', { appointmentId: id });
      return appointment;
    } catch (error) {
      logger.error('Error updating appointment', { error, id, data });
      throw error;
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    const { prisma, logger } = this.deps;

    try {
      // Get appointment for cache invalidation
      const appointment = await this.getAppointmentById(id);

      await prisma.appointment.delete({
        where: { id },
      });

      // Invalidate caches
      if (appointment) {
        await this.invalidateAppointmentCaches(appointment);
      }

      logger.info('Appointment deleted', { appointmentId: id });
    } catch (error) {
      logger.error('Error deleting appointment', { error, id });
      throw error;
    }
  }

  // Doctor and availability operations

  async getDoctorById(id: string): Promise<DoctorWithAvailability | null> {
    const { prisma, redis, logger } = this.deps;
    const cacheKey = this.CACHE_KEYS.DOCTOR_AVAILABILITY(id);

    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const doctor = await prisma.doctor.findUnique({
        where: { id },
        include: {
          availability: {
            where: { isActive: true },
            orderBy: { dayOfWeek: 'asc' },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Cache result
      if (doctor) {
        await redis.setex(
          cacheKey,
          this.CACHE_TTL.DOCTORS,
          JSON.stringify(doctor),
        );
      }

      return doctor;
    } catch (error) {
      logger.error('Error getting doctor by ID', { error, id });
      throw error;
    }
  }

  async getDoctorsBySpecialty(
    specialtyId: string,
  ): Promise<DoctorWithAvailability[]> {
    const { prisma, redis, logger } = this.deps;
    const cacheKey = this.CACHE_KEYS.SPECIALTY_DOCTORS(specialtyId);

    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const doctors = await prisma.doctor.findMany({
        where: {
          specialtyId,
          isActive: true,
        },
        include: {
          availability: {
            where: { isActive: true },
            orderBy: { dayOfWeek: 'asc' },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Cache result
      await redis.setex(
        cacheKey,
        this.CACHE_TTL.DOCTORS,
        JSON.stringify(doctors),
      );

      return doctors;
    } catch (error) {
      logger.error('Error getting doctors by specialty', {
        error,
        specialtyId,
      });
      throw error;
    }
  }

  async getDoctorAppointments(
    doctorId: string,
    date: Date,
    statuses: PrismaAppointmentStatus[] = [
      PrismaAppointmentStatus.SCHEDULED,
      PrismaAppointmentStatus.CONFIRMED,
      PrismaAppointmentStatus.IN_PROGRESS,
    ],
  ): Promise<AppointmentWithRelations[]> {
    const { prisma, redis, logger } = this.deps;
    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = this.CACHE_KEYS.DOCTOR_APPOINTMENTS(doctorId, dateStr);

    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        const appointments = JSON.parse(cached);
        return appointments.filter((apt: any) => statuses.includes(apt.status));
      }

      // Fetch from database
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          scheduledAt: {
            gte: startOfDay(date),
            lte: endOfDay(date),
          },
          status: { in: statuses },
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              patientProfile: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              doctorProfile: true,
            },
          },
          specialty: true,
        },
        orderBy: { scheduledAt: 'asc' },
      });

      // Cache result
      await redis.setex(
        cacheKey,
        this.CACHE_TTL.APPOINTMENTS,
        JSON.stringify(appointments),
      );

      return appointments;
    } catch (error) {
      logger.error('Error getting doctor appointments', {
        error,
        doctorId,
        date,
      });
      throw error;
    }
  }

  // Patient operations

  async getPatientAppointments(
    patientId: string,
    limit?: number,
    statuses?: AppointmentStatus[],
  ): Promise<AppointmentWithRelations[]> {
    const { prisma, redis, logger } = this.deps;
    const cacheKey = this.CACHE_KEYS.PATIENT_APPOINTMENTS(patientId);

    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        let appointments = JSON.parse(cached);
        if (statuses) {
          appointments = appointments.filter((apt: any) =>
            statuses.includes(apt.status),
          );
        }
        return limit ? appointments.slice(0, limit) : appointments;
      }

      // Build query
      const where: any = { patientId };
      if (statuses) {
        where.status = { in: statuses };
      }

      // Fetch from database
      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              patientProfile: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              doctorProfile: true,
            },
          },
          specialty: true,
        },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
      });

      // Cache result
      await redis.setex(
        cacheKey,
        this.CACHE_TTL.APPOINTMENTS,
        JSON.stringify(appointments),
      );

      return appointments;
    } catch (error) {
      logger.error('Error getting patient appointments', { error, patientId });
      throw error;
    }
  }

  // Search and filtering operations

  async searchAppointments(filters: {
    patientId?: string;
    doctorId?: string;
    specialtyId?: string;
    status?: AppointmentStatus;
    type?: AppointmentType;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ appointments: AppointmentWithRelations[]; total: number }> {
    const { prisma, logger } = this.deps;

    try {
      // Build where clause
      const where: any = {};

      if (filters.patientId) where.patientId = filters.patientId;
      if (filters.doctorId) where.doctorId = filters.doctorId;
      if (filters.specialtyId) where.specialtyId = filters.specialtyId;
      if (filters.status) where.status = filters.status;
      if (filters.type) where.type = filters.type;

      if (filters.dateFrom || filters.dateTo) {
        where.scheduledAt = {};
        if (filters.dateFrom) where.scheduledAt.gte = filters.dateFrom;
        if (filters.dateTo) where.scheduledAt.lte = filters.dateTo;
      }

      // Execute queries in parallel
      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                patientProfile: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                doctorProfile: true,
              },
            },
            specialty: true,
          },
          orderBy: { scheduledAt: 'desc' },
          skip: filters.skip || 0,
          take: filters.take || 50,
        }),
        prisma.appointment.count({ where }),
      ]);

      return { appointments, total };
    } catch (error) {
      logger.error('Error searching appointments', { error, filters });
      throw error;
    }
  }

  // Availability operations

  async getAvailableSlots(
    criteria: SchedulingCriteria,
  ): Promise<AvailableSlot[]> {
    const { logger } = this.deps;

    try {
      // Get doctors based on criteria
      const doctors = criteria.doctorId
        ? [await this.getDoctorById(criteria.doctorId)]
        : await this.getDoctorsBySpecialty(criteria.specialtyId);

      const slots: AvailableSlot[] = [];

      // Generate slots for each doctor
      for (const doctor of doctors.filter(Boolean)) {
        if (!doctor) continue;

        const doctorSlots = await this.generateDoctorSlots(doctor, criteria);
        slots.push(...doctorSlots);
      }

      return slots;
    } catch (error) {
      logger.error('Error getting available slots', { error, criteria });
      throw error;
    }
  }

  // Queue operations

  async createQueueEntry(
    entry: Omit<QueueEntry, 'id' | 'createdAt'>,
  ): Promise<QueueEntry> {
    const { redis, logger } = this.deps;

    try {
      const queueEntry: QueueEntry = {
        ...entry,
        id: `queue-${Date.now()}-${entry.patientId}`,
        createdAt: new Date(),
      };

      // Store in Redis
      const cacheKey = this.CACHE_KEYS.QUEUE_ENTRY(queueEntry.id);
      await redis.setex(
        cacheKey,
        this.CACHE_TTL.QUEUE * 60,
        JSON.stringify(queueEntry),
      );

      logger.info('Queue entry created', { entryId: queueEntry.id });
      return queueEntry;
    } catch (error) {
      logger.error('Error creating queue entry', { error, entry });
      throw error;
    }
  }

  async getQueueEntry(id: string): Promise<QueueEntry | null> {
    const { redis, logger } = this.deps;

    try {
      const cacheKey = this.CACHE_KEYS.QUEUE_ENTRY(id);
      const cached = await redis.get(cacheKey);

      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Error getting queue entry', { error, id });
      throw error;
    }
  }

  async updateQueueEntry(
    id: string,
    updates: Partial<QueueEntry>,
  ): Promise<QueueEntry | null> {
    const { redis, logger } = this.deps;

    try {
      const existing = await this.getQueueEntry(id);
      if (!existing) return null;

      const updated: QueueEntry = { ...existing, ...updates };
      const cacheKey = this.CACHE_KEYS.QUEUE_ENTRY(id);

      await redis.setex(
        cacheKey,
        this.CACHE_TTL.QUEUE * 60,
        JSON.stringify(updated),
      );

      logger.info('Queue entry updated', { entryId: id });
      return updated;
    } catch (error) {
      logger.error('Error updating queue entry', { error, id });
      throw error;
    }
  }

  async deleteQueueEntry(id: string): Promise<boolean> {
    const { redis, logger } = this.deps;

    try {
      const cacheKey = this.CACHE_KEYS.QUEUE_ENTRY(id);
      const result = await redis.del(cacheKey);

      logger.info('Queue entry deleted', { entryId: id });
      return result > 0;
    } catch (error) {
      logger.error('Error deleting queue entry', { error, id });
      throw error;
    }
  }

  // Specialty operations

  async getActiveSpecialties(): Promise<Specialty[]> {
    const { prisma, redis, logger } = this.deps;
    const cacheKey = 'active-specialties';

    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from database
      const specialties = await prisma.specialty.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      // Cache result
      await redis.setex(
        cacheKey,
        this.CACHE_TTL.SPECIALTIES,
        JSON.stringify(specialties),
      );

      return specialties;
    } catch (error) {
      logger.error('Error getting active specialties', { error });
      throw error;
    }
  }

  // Cache management methods

  private async invalidateAppointmentCaches(
    appointment: AppointmentWithRelations,
  ): Promise<void> {
    const { redis } = this.deps;

    const keysToInvalidate = [
      this.CACHE_KEYS.APPOINTMENT(appointment.id),
      this.CACHE_KEYS.DOCTOR_APPOINTMENTS(
        appointment.doctorId,
        format(appointment.scheduledAt, 'yyyy-MM-dd'),
      ),
      this.CACHE_KEYS.PATIENT_APPOINTMENTS(appointment.patientId),
      this.CACHE_KEYS.AVAILABILITY_SLOTS(
        appointment.doctorId,
        format(appointment.scheduledAt, 'yyyy-MM-dd'),
      ),
    ];

    await Promise.all(
      keysToInvalidate.map(key => redis.del(key).catch(() => {})),
    );
  }

  async clearCache(pattern?: string): Promise<number> {
    const { redis } = this.deps;

    try {
      if (pattern) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          return await redis.del(...keys);
        }
        return 0;
      } else {
        await redis.flushdb();
        return 1; // Return positive number to indicate success
      }
    } catch (error) {
      this.deps.logger.error('Error clearing cache', { error, pattern });
      throw error;
    }
  }

  // Private helper methods

  private async generateDoctorSlots(
    doctor: DoctorWithAvailability,
    criteria: SchedulingCriteria,
  ): Promise<AvailableSlot[]> {
    const slots: AvailableSlot[] = [];
    let currentDate = new Date(criteria.startDate);
    const endDate = new Date(criteria.endDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const availability = doctor.availability.find(
        a => a.dayOfWeek === dayOfWeek,
      );

      if (availability) {
        // Get existing appointments for the day
        const existingAppointments = await this.getDoctorAppointments(
          doctor.id,
          currentDate,
        );

        // Generate time slots for the day
        const daySlots = this.generateDaySlots(
          doctor,
          currentDate,
          availability,
          existingAppointments,
          criteria,
        );

        slots.push(...daySlots);
      }

      currentDate = addDays(currentDate, 1);
    }

    return slots;
  }

  private generateDaySlots(
    doctor: DoctorWithAvailability,
    date: Date,
    availability: any,
    existingAppointments: AppointmentWithRelations[],
    criteria: SchedulingCriteria,
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const [startHour, startMinute] = availability.startTime
      .split(':')
      .map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const dayEndTime = new Date(date);
    dayEndTime.setHours(endHour, endMinute, 0, 0);

    const duration = criteria.duration || 30;

    while (currentTime.getTime() + duration * 60000 <= dayEndTime.getTime()) {
      const slotEndTime = new Date(currentTime.getTime() + duration * 60000);

      // Check for conflicts with existing appointments
      const hasConflict = existingAppointments.some(apt => {
        const aptStart = apt.scheduledAt.getTime();
        const aptEnd = apt.endTime.getTime();
        const slotStart = currentTime.getTime();
        const slotEnd = slotEndTime.getTime();

        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict) {
        slots.push({
          id: `${doctor.id}-${format(currentTime, 'yyyy-MM-dd-HH-mm')}`,
          doctorId: doctor.id,
          startTime: new Date(currentTime),
          endTime: slotEndTime,
          duration,
          isOptimal: this.isOptimalTimeSlot(currentTime),
          confidenceScore: 0.8,
          metadata: {
            slotType: 'REGULAR',
            utilizationScore: 0.5,
            patientPreferenceMatch: 0.5,
          },
        });
      }

      // Move to next slot
      currentTime = new Date(
        currentTime.getTime() + availability.slotDuration * 60000,
      );
    }

    return slots;
  }

  private isOptimalTimeSlot(time: Date): boolean {
    const hour = time.getHours();
    return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
  }
}
