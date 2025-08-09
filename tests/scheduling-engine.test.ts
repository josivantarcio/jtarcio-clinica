import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { addHours, addDays, format } from 'date-fns';

// Import services to test
import { CoreSchedulingService } from '../src/services/core-scheduling.service';
import { EmergencyHandlerService } from '../src/services/emergency-handler.service';
import { BusinessRulesEngine } from '../src/services/business-rules.engine';
import { ResourceManagementService } from '../src/services/resource-management.service';
import { AvailabilityManagementService } from '../src/services/availability-management.service';
import { QueueManagementService } from '../src/services/queue-management.service';
import { SchedulingIntelligenceService } from '../src/services/scheduling-intelligence.service';

// Import types
import {
  SchedulingCriteria,
  AvailableSlot,
  AppointmentBooking,
  ConflictType,
  ConflictSeverity,
  ResolutionStrategy,
  CancellationCode
} from '../src/types/scheduling';
import { AppointmentType, AppointmentStatus } from '../src/types/appointment';

// Mock dependencies
const mockPrisma = {
  specialty: {
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  doctor: {
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  patient: {
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zrevrange: jest.fn(),
  zrevrank: jest.fn(),
  zcard: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
} as unknown as Redis;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const deps = {
  prisma: mockPrisma,
  redis: mockRedis,
  logger: mockLogger,
};

describe('Core Scheduling Engine Tests', () => {
  let coreSchedulingService: CoreSchedulingService;
  let emergencyHandler: EmergencyHandlerService;
  let businessRulesEngine: BusinessRulesEngine;
  let resourceManagement: ResourceManagementService;
  let availabilityManagement: AvailabilityManagementService;
  let queueManagement: QueueManagementService;
  let schedulingIntelligence: SchedulingIntelligenceService;

  beforeAll(() => {
    // Initialize services
    coreSchedulingService = new CoreSchedulingService(deps);
    emergencyHandler = new EmergencyHandlerService(deps);
    businessRulesEngine = new BusinessRulesEngine(deps);
    resourceManagement = new ResourceManagementService(deps);
    availabilityManagement = new AvailabilityManagementService(deps);
    queueManagement = new QueueManagementService(deps);
    schedulingIntelligence = new SchedulingIntelligenceService(deps);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Core Scheduling Service', () => {
    describe('findAvailableSlots', () => {
      it('should find available slots for a given specialty', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          duration: 30,
          startDate: new Date(),
          endDate: addDays(new Date(), 7),
          patientId: 'patient-1',
        };

        const mockSpecialty = {
          id: 'specialty-1',
          name: 'CLINICA_GERAL',
          duration: 30,
        };

        const mockDoctor = {
          id: 'doctor-1',
          specialtyId: 'specialty-1',
          isActive: true,
          acceptsNewPatients: true,
          availability: [{
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '17:00',
            slotDuration: 30,
            isActive: true,
          }],
        };

        const mockAppointments: any[] = [];

        mockPrisma.specialty.findUniqueOrThrow.mockResolvedValue(mockSpecialty);
        mockPrisma.doctor.findMany.mockResolvedValue([mockDoctor]);
        mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

        // Act
        const result = await coreSchedulingService.findAvailableSlots(criteria);

        // Assert
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(mockPrisma.specialty.findUniqueOrThrow).toHaveBeenCalledWith({
          where: { id: criteria.specialtyId }
        });
        expect(mockPrisma.doctor.findMany).toHaveBeenCalled();
      });

      it('should handle emergency appointments with higher priority', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.EMERGENCY,
          duration: 45,
          startDate: new Date(),
          endDate: addHours(new Date(), 4),
          patientId: 'patient-1',
          isEmergency: true,
          urgencyLevel: 9,
        };

        const mockSpecialty = {
          id: 'specialty-1',
          name: 'CARDIOLOGIA',
          duration: 45,
        };

        const mockDoctor = {
          id: 'doctor-1',
          specialtyId: 'specialty-1',
          isActive: true,
          acceptsNewPatients: true,
          availability: [{
            dayOfWeek: 1,
            startTime: '07:00',
            endTime: '19:00',
            slotDuration: 30,
            isActive: true,
          }],
        };

        mockPrisma.specialty.findUniqueOrThrow.mockResolvedValue(mockSpecialty);
        mockPrisma.doctor.findMany.mockResolvedValue([mockDoctor]);
        mockPrisma.appointment.findMany.mockResolvedValue([]);

        // Act
        const result = await coreSchedulingService.findAvailableSlots(criteria);

        // Assert
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        // Emergency slots should have higher confidence scores
        expect(result[0].confidenceScore).toBeGreaterThan(0.7);
      });
    });

    describe('checkConflicts', () => {
      it('should detect double booking conflicts', async () => {
        // Arrange
        const appointmentData = {
          id: 'new-appointment',
          doctorId: 'doctor-1',
          scheduledAt: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          specialtyId: 'specialty-1',
        };

        const conflictingAppointment = {
          id: 'existing-appointment',
          doctorId: 'doctor-1',
          scheduledAt: new Date('2024-01-15T10:15:00'),
          endTime: new Date('2024-01-15T10:45:00'),
          status: AppointmentStatus.SCHEDULED,
        };

        mockPrisma.appointment.findMany.mockResolvedValue([conflictingAppointment]);

        // Act
        const conflicts = await coreSchedulingService.checkConflicts(appointmentData);

        // Assert
        expect(conflicts).toBeDefined();
        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts[0].type).toBe(ConflictType.DOUBLE_BOOKING);
        expect(conflicts[0].severity).toBe(ConflictSeverity.CRITICAL);
      });

      it('should detect business hours violations', async () => {
        // Arrange
        const appointmentData = {
          id: 'new-appointment',
          doctorId: 'doctor-1',
          scheduledAt: new Date('2024-01-15T22:00:00'), // Outside business hours
          endTime: new Date('2024-01-15T22:30:00'),
          specialtyId: 'specialty-1',
        };

        mockPrisma.appointment.findMany.mockResolvedValue([]);

        // Act
        const conflicts = await coreSchedulingService.checkConflicts(appointmentData);

        // Assert
        expect(conflicts).toBeDefined();
        expect(conflicts.some(c => c.type === ConflictType.OUTSIDE_BUSINESS_HOURS)).toBe(true);
      });
    });
  });

  describe('Emergency Handler Service', () => {
    describe('handleEmergencyRequest', () => {
      it('should handle life-threatening emergencies with immediate slots', async () => {
        // Arrange
        const criteria: SchedulingCriteria & { symptoms: string } = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.EMERGENCY,
          duration: 30,
          startDate: new Date(),
          endDate: addHours(new Date(), 2),
          patientId: 'patient-1',
          symptoms: 'chest pain and difficulty breathing',
          isEmergency: true,
          urgencyLevel: 10,
        };

        const assessment = {
          urgencyLevel: 10,
          medicalPriority: 'LIFE_THREATENING' as const,
          requiredResponseTime: 15,
          canWait: false,
          requiresSpecificDoctor: true,
          requiresSpecialEquipment: true,
          triageNotes: 'Critical emergency case',
        };

        const mockDoctor = {
          id: 'doctor-1',
          specialtyId: 'specialty-1',
          isActive: true,
          availability: [{
            dayOfWeek: 1,
            startTime: '07:00',
            endTime: '19:00',
            slotDuration: 30,
            isActive: true,
          }],
        };

        mockPrisma.doctor.findMany.mockResolvedValue([mockDoctor]);
        mockPrisma.appointment.findMany.mockResolvedValue([]);
        mockPrisma.appointment.create.mockResolvedValue({
          id: 'emergency-appointment',
          patientId: criteria.patientId,
          doctorId: mockDoctor.id,
        });

        // Act
        const result = await emergencyHandler.handleEmergencyRequest(criteria, assessment);

        // Assert
        expect(result.success).toBe(true);
        expect(result.appointmentId).toBeDefined();
        expect(result.estimatedWaitTime).toBeLessThan(30); // Should be immediate or very quick
      });

      it('should triage emergency requests accurately', async () => {
        // Arrange
        const symptoms = 'severe chest pain';
        const painLevel = 9;
        const vitalSigns = {
          systolic: 190,
          heartRate: 110,
          temperature: 38.5,
          oxygenSat: 95,
        };

        // Act
        const assessment = await emergencyHandler.triageEmergencyRequest(
          symptoms,
          painLevel,
          vitalSigns
        );

        // Assert
        expect(assessment.urgencyLevel).toBeGreaterThanOrEqual(8);
        expect(assessment.medicalPriority).toBe('LIFE_THREATENING');
        expect(assessment.requiredResponseTime).toBeLessThanOrEqual(60);
        expect(assessment.canWait).toBe(false);
      });
    });

    describe('getEmergencyCapacityStatus', () => {
      it('should return accurate capacity status', async () => {
        // Arrange
        const specialtyId = 'specialty-1';
        
        mockPrisma.appointment.findMany.mockResolvedValue([
          { type: AppointmentType.EMERGENCY, status: AppointmentStatus.SCHEDULED },
          { type: AppointmentType.EMERGENCY, status: AppointmentStatus.CONFIRMED },
        ]);

        // Act
        const status = await emergencyHandler.getEmergencyCapacityStatus(specialtyId);

        // Assert
        expect(status.emergencySlotsUsed).toBe(2);
        expect(status.emergencySlotsAvailable).toBeGreaterThanOrEqual(0);
        expect(status.overCapacity).toBeDefined();
        expect(status.recommendedActions).toBeDefined();
      });
    });
  });

  describe('Business Rules Engine', () => {
    describe('validateBooking', () => {
      it('should validate appointment booking according to business rules', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          duration: 30,
          startDate: addDays(new Date(), 1),
          endDate: addDays(new Date(), 1),
          patientId: 'patient-1',
        };

        const slotData = {
          scheduledAt: addDays(new Date(), 1),
          doctorId: 'doctor-1',
        };

        const mockPatient = {
          id: 'patient-1',
          user: { status: 'ACTIVE' },
          appointments: [],
        };

        const mockDoctor = {
          id: 'doctor-1',
          isActive: true,
          acceptsNewPatients: true,
          availability: [],
          user: { status: 'ACTIVE' },
        };

        const mockSpecialty = {
          id: 'specialty-1',
          name: 'CLINICA_GERAL',
          isActive: true,
        };

        mockPrisma.patient.findUniqueOrThrow.mockResolvedValue(mockPatient);
        mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
        mockPrisma.specialty.findUnique.mockResolvedValue(mockSpecialty);

        // Act
        const result = await businessRulesEngine.validateBooking(criteria, slotData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.violations).toBeDefined();
        expect(result.warnings).toBeDefined();
        expect(result.modifications).toBeDefined();
      });

      it('should reject booking for suspended patients', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          duration: 30,
          startDate: addDays(new Date(), 1),
          endDate: addDays(new Date(), 1),
          patientId: 'patient-1',
        };

        const slotData = {
          scheduledAt: addDays(new Date(), 1),
          doctorId: 'doctor-1',
        };

        const mockPatient = {
          id: 'patient-1',
          user: { status: 'SUSPENDED' },
          appointments: [],
        };

        mockPrisma.patient.findUniqueOrThrow.mockResolvedValue(mockPatient);

        // Act
        const result = await businessRulesEngine.validateBooking(criteria, slotData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.violations.some(v => v.code === 'PATIENT_SUSPENDED')).toBe(true);
      });
    });

    describe('validateCancellation', () => {
      it('should calculate correct cancellation fees', async () => {
        // Arrange
        const appointmentId = 'appointment-1';
        const reason = {
          code: CancellationCode.PATIENT_REQUEST,
          description: 'Patient requested cancellation',
          initiatedBy: 'PATIENT' as const,
          refundable: true,
        };

        const mockAppointment = {
          id: appointmentId,
          scheduledAt: addHours(new Date(), 12), // 12 hours from now
          status: AppointmentStatus.SCHEDULED,
          fee: { toNumber: () => 100 },
          patient: { user: {} },
          doctor: { user: {} },
          specialty: {},
          rescheduledFrom: null,
        };

        mockPrisma.appointment.findUniqueOrThrow.mockResolvedValue(mockAppointment);
        mockPrisma.appointment.count.mockResolvedValue(0);

        // Act
        const result = await businessRulesEngine.validateCancellation(appointmentId, reason);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.modifications.some(m => 
          m.field === 'cancellationFee' && m.suggestedValue === 30
        )).toBe(true); // 30% fee for 12h notice
      });

      it('should prevent cancellation of past appointments', async () => {
        // Arrange
        const appointmentId = 'appointment-1';
        const reason = {
          code: CancellationCode.PATIENT_REQUEST,
          description: 'Patient requested cancellation',
          initiatedBy: 'PATIENT' as const,
          refundable: true,
        };

        const mockAppointment = {
          id: appointmentId,
          scheduledAt: addHours(new Date(), -2), // 2 hours ago
          status: AppointmentStatus.SCHEDULED,
          fee: { toNumber: () => 100 },
          patient: { user: {} },
          doctor: { user: {} },
          specialty: {},
          rescheduledFrom: null,
        };

        mockPrisma.appointment.findUniqueOrThrow.mockResolvedValue(mockAppointment);

        // Act
        const result = await businessRulesEngine.validateCancellation(appointmentId, reason);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.violations.some(v => v.code === 'PAST_APPOINTMENT_CANCELLATION')).toBe(true);
      });
    });
  });

  describe('Queue Management Service', () => {
    describe('addToQueue', () => {
      it('should add patient to appointment queue with correct priority', async () => {
        // Arrange
        const criteria = {
          patientId: 'patient-1',
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          maxWaitDays: 7,
          preferredDates: [addDays(new Date(), 1)],
          preferredTimes: ['09:00', '14:00'],
          urgencyLevel: 5,
        };

        mockPrisma.appointment.count.mockResolvedValue(0); // New patient
        mockRedis.zadd.mockResolvedValue(1);
        mockRedis.zrevrank.mockResolvedValue(0);
        mockRedis.zcard.mockResolvedValue(1);

        // Act
        const result = await queueManagement.addToQueue(criteria);

        // Assert
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.priorityScore).toBeGreaterThan(0);
        expect(result.position).toBe(1);
        expect(mockRedis.zadd).toHaveBeenCalled();
      });

      it('should calculate higher priority for emergency appointments', async () => {
        // Arrange
        const criteria = {
          patientId: 'patient-1',
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.EMERGENCY,
          maxWaitDays: 1,
          preferredDates: [new Date()],
          preferredTimes: ['ASAP'],
          urgencyLevel: 9,
        };

        mockPrisma.appointment.count.mockResolvedValue(5); // VIP patient
        mockRedis.zadd.mockResolvedValue(1);
        mockRedis.zrevrank.mockResolvedValue(0);
        mockRedis.zcard.mockResolvedValue(1);

        // Act
        const result = await queueManagement.addToQueue(criteria);

        // Assert
        expect(result.priorityScore).toBeGreaterThan(10); // Emergency should have high priority
        expect(result.urgencyLevel).toBe(9);
      });
    });

    describe('processAvailableSlot', () => {
      it('should automatically book slot for top priority patient', async () => {
        // Arrange
        const slot: AvailableSlot = {
          id: 'slot-1',
          doctorId: 'doctor-1',
          startTime: addHours(new Date(), 1),
          endTime: addHours(new Date(), 1.5),
          duration: 30,
          isOptimal: true,
          confidenceScore: 0.9,
        };

        const mockQueueEntry = {
          id: 'queue-1',
          patientId: 'patient-1',
          autoBookingEnabled: true,
          autoBookingAttempts: 0,
          maxAutoBookingAttempts: 5,
          preferredDates: [slot.startTime],
          preferredTimes: [format(slot.startTime, 'HH:mm')],
        };

        mockRedis.zrevrange.mockResolvedValue([JSON.stringify(mockQueueEntry)]);

        // Act
        const result = await queueManagement.processAvailableSlot(slot);

        // Assert
        expect(result.processed).toBe(true);
        expect(result.queueEntry).toBeDefined();
        expect(result.notification).toBeDefined();
      });
    });
  });

  describe('Resource Management Service', () => {
    describe('findAvailableRooms', () => {
      it('should find available rooms for appointment criteria', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          duration: 30,
          startDate: new Date(),
          endDate: addDays(new Date(), 1),
          patientId: 'patient-1',
        };

        const slot: AvailableSlot = {
          id: 'slot-1',
          doctorId: 'doctor-1',
          startTime: addHours(new Date(), 1),
          endTime: addHours(new Date(), 1.5),
          duration: 30,
          isOptimal: true,
          confidenceScore: 0.9,
        };

        const requiredEquipment = ['basic'];

        // Act
        const result = await resourceManagement.findAvailableRooms(criteria, slot, requiredEquipment);

        // Assert
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('allocateResources', () => {
      it('should allocate resources optimally for appointment', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          duration: 30,
          startDate: new Date(),
          endDate: addDays(new Date(), 1),
          patientId: 'patient-1',
        };

        const slot: AvailableSlot = {
          id: 'slot-1',
          doctorId: 'doctor-1',
          startTime: addHours(new Date(), 1),
          endTime: addHours(new Date(), 1.5),
          duration: 30,
          isOptimal: true,
          confidenceScore: 0.9,
        };

        // Act
        const result = await resourceManagement.allocateResources(criteria, slot);

        // Assert
        expect(result.roomId).toBeDefined();
        expect(result.allocationScore).toBeGreaterThan(0);
        expect(result.efficiency).toBeGreaterThan(0);
        expect(Array.isArray(result.conflicts)).toBe(true);
      });
    });
  });

  describe('Availability Management Service', () => {
    describe('getRealTimeAvailability', () => {
      it('should return real-time availability with resource allocation', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          duration: 30,
          startDate: new Date(),
          endDate: addDays(new Date(), 7),
          patientId: 'patient-1',
        };

        const mockDoctor = {
          id: 'doctor-1',
          specialtyId: 'specialty-1',
          isActive: true,
          acceptsNewPatients: true,
          availability: [{
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '17:00',
            slotDuration: 30,
            isActive: true,
          }],
        };

        const mockSpecialty = {
          id: 'specialty-1',
          name: 'CLINICA_GERAL',
        };

        mockPrisma.doctor.findMany.mockResolvedValue([mockDoctor]);
        mockPrisma.specialty.findUnique.mockResolvedValue(mockSpecialty);
        mockPrisma.appointment.findMany.mockResolvedValue([]);

        // Act
        const result = await availabilityManagement.getRealTimeAvailability(criteria);

        // Assert
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        result.forEach(slot => {
          expect(slot.allocatedResources).toBeDefined();
          expect(slot.resourceConflicts).toBeDefined();
          expect(slot.allocationConfidence).toBeGreaterThan(0);
        });
      });
    });

    describe('reserveSlotTemporarily', () => {
      it('should reserve slot temporarily with expiration', async () => {
        // Arrange
        const slotId = 'slot-1';
        const patientId = 'patient-1';
        const durationMinutes = 10;

        mockRedis.setex.mockResolvedValue('OK');

        // Act
        const result = await availabilityManagement.reserveSlotTemporarily(
          slotId,
          patientId,
          durationMinutes
        );

        // Assert
        expect(result.reservationId).toBeDefined();
        expect(result.expiresAt).toBeDefined();
        expect(result.slot).toBeDefined();
        expect(mockRedis.setex).toHaveBeenCalledWith(
          expect.stringContaining('temp-reservation:'),
          durationMinutes * 60,
          expect.any(String)
        );
      });
    });
  });

  describe('Scheduling Intelligence Service', () => {
    describe('suggestOptimalSlots', () => {
      it('should suggest optimal slots based on patient behavior', async () => {
        // Arrange
        const criteria: SchedulingCriteria = {
          specialtyId: 'specialty-1',
          appointmentType: AppointmentType.CONSULTATION,
          duration: 30,
          startDate: new Date(),
          endDate: addDays(new Date(), 7),
          patientId: 'patient-1',
        };

        const availableSlots: AvailableSlot[] = [
          {
            id: 'slot-1',
            doctorId: 'doctor-1',
            startTime: new Date('2024-01-15T09:00:00'),
            endTime: new Date('2024-01-15T09:30:00'),
            duration: 30,
            isOptimal: true,
            confidenceScore: 0.8,
          },
          {
            id: 'slot-2',
            doctorId: 'doctor-1',
            startTime: new Date('2024-01-15T14:00:00'),
            endTime: new Date('2024-01-15T14:30:00'),
            duration: 30,
            isOptimal: true,
            confidenceScore: 0.7,
          },
        ];

        const mockPatient = {
          id: 'patient-1',
          appointments: [
            {
              scheduledAt: new Date('2024-01-10T09:00:00'),
              status: AppointmentStatus.COMPLETED,
            },
            {
              scheduledAt: new Date('2024-01-08T09:15:00'),
              status: AppointmentStatus.COMPLETED,
            },
          ],
          user: {},
        };

        mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

        // Act
        const result = await schedulingIntelligence.suggestOptimalSlots(
          criteria,
          availableSlots,
          'patient-1'
        );

        // Assert
        expect(result.recommendedSlots).toBeDefined();
        expect(result.recommendedSlots.length).toBeGreaterThan(0);
        expect(result.patientInsights).toBeDefined();
        expect(result.patientInsights.showUpProbability).toBeGreaterThan(0);
        
        // First slot should be scored higher due to patient's morning preference
        expect(result.recommendedSlots[0].score).toBeGreaterThan(0.5);
      });
    });

    describe('generateSchedulingRecommendations', () => {
      it('should generate AI-powered scheduling recommendations', async () => {
        // Arrange
        const doctorId = 'doctor-1';
        const dateRange = {
          start: new Date(),
          end: addDays(new Date(), 30),
        };

        const mockAppointments = [
          {
            scheduledAt: new Date('2024-01-15T09:00:00'),
            endTime: new Date('2024-01-15T09:30:00'),
            duration: 30,
            status: AppointmentStatus.COMPLETED,
            type: AppointmentType.CONSULTATION,
          },
          {
            scheduledAt: new Date('2024-01-15T10:00:00'),
            endTime: new Date('2024-01-15T10:30:00'),
            duration: 30,
            status: AppointmentStatus.COMPLETED,
            type: AppointmentType.CONSULTATION,
          },
        ];

        const mockDoctor = {
          id: doctorId,
          consultationDuration: 30,
          availability: [{
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '17:00',
            slotDuration: 30,
            isActive: true,
          }],
        };

        mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
        mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
        mockPrisma.patient.findMany.mockResolvedValue([]);

        // Act
        const result = await schedulingIntelligence.generateSchedulingRecommendations(
          doctorId,
          dateRange
        );

        // Assert
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        result.forEach(recommendation => {
          expect(recommendation.type).toBeDefined();
          expect(recommendation.priority).toBeDefined();
          expect(recommendation.confidence).toBeGreaterThan(0);
          expect(recommendation.title).toBeDefined();
          expect(recommendation.description).toBeDefined();
        });
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete appointment booking workflow', async () => {
      // Arrange
      const criteria: SchedulingCriteria = {
        specialtyId: 'specialty-1',
        appointmentType: AppointmentType.CONSULTATION,
        duration: 30,
        startDate: new Date(),
        endDate: addDays(new Date(), 7),
        patientId: 'patient-1',
      };

      // Setup mocks for the entire workflow
      const mockSpecialty = {
        id: 'specialty-1',
        name: 'CLINICA_GERAL',
        duration: 30,
        isActive: true,
      };

      const mockDoctor = {
        id: 'doctor-1',
        specialtyId: 'specialty-1',
        isActive: true,
        acceptsNewPatients: true,
        availability: [{
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          slotDuration: 30,
          isActive: true,
        }],
        user: { status: 'ACTIVE' },
      };

      const mockPatient = {
        id: 'patient-1',
        user: { status: 'ACTIVE' },
        appointments: [],
      };

      mockPrisma.specialty.findUniqueOrThrow.mockResolvedValue(mockSpecialty);
      mockPrisma.specialty.findUnique.mockResolvedValue(mockSpecialty);
      mockPrisma.doctor.findMany.mockResolvedValue([mockDoctor]);
      mockPrisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      mockPrisma.patient.findUniqueOrThrow.mockResolvedValue(mockPatient);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.create.mockResolvedValue({
        id: 'new-appointment',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        scheduledAt: addDays(new Date(), 1),
      });

      // Act - Complete workflow
      // 1. Find available slots
      const availableSlots = await coreSchedulingService.findAvailableSlots(criteria);

      // 2. Validate business rules
      const selectedSlot = availableSlots[0];
      const validation = await businessRulesEngine.validateBooking(criteria, {
        scheduledAt: selectedSlot.startTime,
        doctorId: selectedSlot.doctorId,
      });

      // 3. Check for conflicts
      const conflicts = await coreSchedulingService.checkConflicts({
        id: 'test-appointment',
        doctorId: selectedSlot.doctorId,
        scheduledAt: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        specialtyId: criteria.specialtyId,
      });

      // 4. Allocate resources
      const resourceAllocation = await resourceManagement.allocateResources(
        criteria,
        selectedSlot
      );

      // Assert - Verify complete workflow
      expect(availableSlots.length).toBeGreaterThan(0);
      expect(validation.isValid).toBe(true);
      expect(conflicts.length).toBe(0);
      expect(resourceAllocation.roomId).toBeDefined();
      expect(resourceAllocation.allocationScore).toBeGreaterThan(0);
    });

    it('should handle emergency appointment override workflow', async () => {
      // Test emergency appointment overriding normal capacity constraints
      const emergencyCriteria: SchedulingCriteria & { symptoms: string } = {
        specialtyId: 'specialty-1',
        appointmentType: AppointmentType.EMERGENCY,
        duration: 45,
        startDate: new Date(),
        endDate: addHours(new Date(), 2),
        patientId: 'patient-1',
        symptoms: 'severe chest pain',
        isEmergency: true,
        urgencyLevel: 10,
      };

      const assessment = {
        urgencyLevel: 10,
        medicalPriority: 'LIFE_THREATENING' as const,
        requiredResponseTime: 15,
        canWait: false,
        requiresSpecificDoctor: true,
        requiresSpecialEquipment: true,
      };

      // Setup mocks to simulate overbooked scenario
      const mockDoctor = {
        id: 'doctor-1',
        specialtyId: 'specialty-1',
        isActive: true,
        availability: [{
          dayOfWeek: 1,
          startTime: '07:00',
          endTime: '19:00',
          slotDuration: 30,
          isActive: true,
        }],
      };

      // Simulate existing appointments (overbooked)
      const existingAppointments = [
        {
          id: 'existing-1',
          doctorId: 'doctor-1',
          scheduledAt: new Date(),
          endTime: addHours(new Date(), 0.5),
          status: AppointmentStatus.SCHEDULED,
        },
        {
          id: 'existing-2',
          doctorId: 'doctor-1',
          scheduledAt: addHours(new Date(), 0.5),
          endTime: addHours(new Date(), 1),
          status: AppointmentStatus.SCHEDULED,
        },
      ];

      mockPrisma.doctor.findMany.mockResolvedValue([mockDoctor]);
      mockPrisma.appointment.findMany.mockResolvedValue(existingAppointments);
      mockPrisma.appointment.create.mockResolvedValue({
        id: 'emergency-appointment',
        patientId: emergencyCriteria.patientId,
        doctorId: mockDoctor.id,
        type: AppointmentType.EMERGENCY,
      });

      // Act
      const result = await emergencyHandler.handleEmergencyRequest(
        emergencyCriteria,
        assessment
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.appointmentId).toBeDefined();
      // Emergency should succeed even when overbooked
      expect(result.estimatedWaitTime).toBeLessThan(60);
    });
  });
});

describe('Performance Tests', () => {
  describe('Bulk Operations', () => {
    it('should handle bulk availability requests efficiently', async () => {
      // Arrange
      const criteriaList: SchedulingCriteria[] = Array.from({ length: 10 }, (_, i) => ({
        specialtyId: 'specialty-1',
        appointmentType: AppointmentType.CONSULTATION,
        duration: 30,
        startDate: addDays(new Date(), i),
        endDate: addDays(new Date(), i + 1),
        patientId: `patient-${i}`,
      }));

      const availabilityManagement = new AvailabilityManagementService(deps);

      // Act
      const startTime = Date.now();
      const results = await availabilityManagement.getBulkAvailability(criteriaList);
      const endTime = Date.now();

      // Assert
      expect(results.size).toBe(criteriaList.length);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Cache Performance', () => {
    it('should use cache for repeated availability requests', async () => {
      // Arrange
      const criteria: SchedulingCriteria = {
        specialtyId: 'specialty-1',
        appointmentType: AppointmentType.CONSULTATION,
        duration: 30,
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
        patientId: 'patient-1',
      };

      const availabilityManagement = new AvailabilityManagementService(deps);

      // Setup cache mock
      const cachedSlots = [
        {
          id: 'cached-slot-1',
          doctorId: 'doctor-1',
          startTime: new Date(),
          endTime: addHours(new Date(), 0.5),
          duration: 30,
          isOptimal: true,
          confidenceScore: 0.8,
          allocatedResources: {
            roomId: 'room-1',
            equipmentIds: [],
            staffIds: [],
          },
          resourceConflicts: [],
          allocationConfidence: 0.9,
        },
      ];

      mockRedis.get.mockResolvedValueOnce(null) // First call - cache miss
                  .mockResolvedValueOnce(JSON.stringify(cachedSlots)); // Second call - cache hit

      // Act
      const firstCall = await availabilityManagement.getRealTimeAvailability(
        criteria,
        { checkResources: true, includeBuffer: true, allowOverbooking: false, emergencyOverride: false, realTimeSync: false }
      );

      const secondCall = await availabilityManagement.getRealTimeAvailability(
        criteria,
        { checkResources: true, includeBuffer: true, allowOverbooking: false, emergencyOverride: false, realTimeSync: false }
      );

      // Assert
      expect(mockRedis.get).toHaveBeenCalledTimes(2);
      expect(secondCall).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'cached-slot-1',
        })
      ]));
    });
  });
});