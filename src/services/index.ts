import { PrismaClient } from '../../database/generated/client';
import Redis from 'ioredis';
import { Logger } from 'winston';

// Import all services
import { BusinessRulesEngine } from './business-rules.engine';
import { CoreSchedulingService } from './core-scheduling.service';
import { AdvancedSchedulingAlgorithms } from './advanced-scheduling.algorithms';
import { AvailabilityManagementService } from './availability-management.service';
import { AppointmentService } from './appointment.service';
import { QueueManagementService } from './queue-management.service';
import { EmergencyHandlerService } from './emergency-handler.service';
import { ResourceManagementService } from './resource-management.service';
import { SchedulingIntelligenceService } from './scheduling-intelligence.service';
import { SchedulingRepository } from '../repositories/scheduling.repository';

export interface ServiceContainer {
  prisma: PrismaClient;
  redis: Redis;
  logger: Logger;
  schedulingRepository: SchedulingRepository;
  businessRulesEngine: BusinessRulesEngine;
  coreSchedulingService: CoreSchedulingService;
  advancedSchedulingAlgorithms: AdvancedSchedulingAlgorithms;
  availabilityManagementService: AvailabilityManagementService;
  appointmentService: AppointmentService;
  queueManagementService: QueueManagementService;
  emergencyHandlerService: EmergencyHandlerService;
  resourceManagementService: ResourceManagementService;
  schedulingIntelligenceService: SchedulingIntelligenceService;
}

export class ServiceFactory {
  private static instance: ServiceContainer;

  static async create(prisma: PrismaClient, redis: Redis, logger: Logger): Promise<ServiceContainer> {
    if (ServiceFactory.instance) {
      return ServiceFactory.instance;
    }

    // Create repository layer
    const schedulingRepository = new SchedulingRepository({
      prisma,
      redis,
      logger
    });

    // Create business rules engine
    const businessRulesEngine = new BusinessRulesEngine({
      prisma,
      logger
    });

    // Create core scheduling service
    const coreSchedulingService = new CoreSchedulingService({
      prisma,
      redis,
      logger
    });

    // Create advanced scheduling algorithms
    const advancedSchedulingAlgorithms = new AdvancedSchedulingAlgorithms({
      prisma,
      redis,
      logger
    });

    // Create availability management service
    const availabilityManagementService = new AvailabilityManagementService({
      prisma,
      redis,
      logger
    });

    // Create queue management service
    const queueManagementService = new QueueManagementService({
      prisma,
      redis,
      logger
    });

    // Create emergency handler service
    const emergencyHandlerService = new EmergencyHandlerService({
      prisma,
      redis,
      logger
    });

    // Create resource management service
    const resourceManagementService = new ResourceManagementService({
      prisma,
      redis,
      logger
    });

    // Create scheduling intelligence service
    const schedulingIntelligenceService = new SchedulingIntelligenceService({
      prisma,
      redis,
      logger
    });

    // Create appointment service with all dependencies
    const appointmentService = new AppointmentService({
      prisma,
      redis,
      logger,
      businessRulesEngine,
      coreSchedulingService,
      advancedAlgorithms: advancedSchedulingAlgorithms,
      availabilityService: availabilityManagementService
    });

    const container: ServiceContainer = {
      prisma,
      redis,
      logger,
      schedulingRepository,
      businessRulesEngine,
      coreSchedulingService,
      advancedSchedulingAlgorithms,
      availabilityManagementService,
      appointmentService,
      queueManagementService,
      emergencyHandlerService,
      resourceManagementService,
      schedulingIntelligenceService
    };

    ServiceFactory.instance = container;
    return container;
  }

  static getInstance(): ServiceContainer {
    if (!ServiceFactory.instance) {
      throw new Error('ServiceContainer not initialized. Call ServiceFactory.create() first.');
    }
    return ServiceFactory.instance;
  }
}

export * from './business-rules.engine';
export * from './core-scheduling.service';
export * from './advanced-scheduling.algorithms';
export * from './availability-management.service';
export * from './appointment.service';
export * from './queue-management.service';
export * from './emergency-handler.service';
export * from './resource-management.service';
export * from './scheduling-intelligence.service';
export * from '../repositories/scheduling.repository';