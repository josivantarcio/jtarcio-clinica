import {
  SchedulingCriteria,
  AvailableSlot,
  ConflictType,
  ConflictSeverity,
  Conflict,
} from '@/types/scheduling';
import { AppointmentType, AppointmentStatus } from '@/types/appointment';
import {
  BusinessRules,
  RESOURCE_CONFIG,
  TIME_CONSTRAINTS,
} from '@/config/business-rules';
import { PrismaClient } from '../../database/generated/client';
import {
  addMinutes,
  subMinutes,
  differenceInMinutes,
  isWithinInterval,
  format,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Logger } from 'winston';
import Redis from 'ioredis';

export interface ResourceManagementDeps {
  prisma: PrismaClient;
  redis: Redis;
  logger: Logger;
}

export interface RoomResource {
  id: string;
  name: string;
  type: keyof typeof RESOURCE_CONFIG.ROOM_TYPES;
  capacity: number;
  isActive: boolean;
  equipmentIds: string[];
  maintenanceSchedule?: MaintenanceWindow[];
  location?: string;
  features?: string[];
}

export interface EquipmentResource {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isPortable: boolean;
  maintenanceSchedule?: MaintenanceWindow[];
  requiredCertifications?: string[];
  roomAssignments?: string[];
}

export interface MaintenanceWindow {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'CLEANING' | 'MAINTENANCE' | 'REPAIR' | 'INSPECTION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface ResourceBooking {
  id: string;
  appointmentId: string;
  roomId?: string;
  equipmentIds: string[];
  startTime: Date;
  endTime: Date;
  bufferBefore: number;
  bufferAfter: number;
  status: 'RESERVED' | 'IN_USE' | 'COMPLETED' | 'CANCELLED';
}

export interface ResourceAvailability {
  roomId?: string;
  equipmentIds: string[];
  isAvailable: boolean;
  conflicts: string[];
  nextAvailable?: Date;
  maintenanceWindows: MaintenanceWindow[];
}

export interface ResourceAllocation {
  roomId?: string;
  equipmentIds: string[];
  allocationScore: number;
  efficiency: number;
  conflicts: Conflict[];
  alternatives?: ResourceAllocation[];
}

export interface ResourceUtilization {
  resourceId: string;
  resourceType: 'ROOM' | 'EQUIPMENT';
  date: Date;
  totalMinutes: number;
  utilizedMinutes: number;
  utilizationRate: number;
  peakHours: { hour: number; utilization: number }[];
  downtime: { reason: string; minutes: number }[];
}

export class ResourceManagementService {
  private readonly ROOM_CACHE_KEY = 'room-availability';
  private readonly EQUIPMENT_CACHE_KEY = 'equipment-availability';
  private readonly CLEANING_BUFFER = RESOURCE_CONFIG.ROOM_CLEANING_TIME;

  constructor(private deps: ResourceManagementDeps) {}

  /**
   * Find available rooms for appointment criteria
   */
  async findAvailableRooms(
    criteria: SchedulingCriteria,
    slot: AvailableSlot,
    requiredEquipment: string[] = [],
  ): Promise<RoomResource[]> {
    const { prisma, logger } = this.deps;

    try {
      logger.info('Finding available rooms', {
        appointmentType: criteria.appointmentType,
        requiredEquipment,
      });

      // Determine room type requirements
      const roomTypeRequired = this.determineRoomTypeRequired(
        criteria,
        requiredEquipment,
      );

      // Get rooms of the required type
      const candidateRooms = await this.getRoomsByType(roomTypeRequired);

      // Filter by availability
      const availableRooms: RoomResource[] = [];

      for (const room of candidateRooms) {
        const isAvailable = await this.isRoomAvailable(room, slot);
        const hasRequiredEquipment = await this.roomHasRequiredEquipment(
          room,
          requiredEquipment,
        );

        if (isAvailable && hasRequiredEquipment) {
          availableRooms.push(room);
        }
      }

      // Sort by preference/proximity if doctor has location
      const sortedRooms = await this.sortRoomsByPreference(
        availableRooms,
        criteria.doctorId,
      );

      logger.info(`Found ${sortedRooms.length} available rooms`);
      return sortedRooms;
    } catch (error) {
      logger.error('Error finding available rooms', { error, criteria });
      throw error;
    }
  }

  /**
   * Find available equipment for appointment
   */
  async findAvailableEquipment(
    requiredEquipmentTypes: string[],
    slot: AvailableSlot,
    roomId?: string,
  ): Promise<EquipmentResource[]> {
    const { prisma, logger } = this.deps;

    try {
      logger.info('Finding available equipment', {
        requiredEquipmentTypes,
        roomId,
      });

      const availableEquipment: EquipmentResource[] = [];

      for (const equipmentType of requiredEquipmentTypes) {
        const candidates = await this.getEquipmentByType(equipmentType, roomId);

        for (const equipment of candidates) {
          const isAvailable = await this.isEquipmentAvailable(equipment, slot);

          if (isAvailable) {
            availableEquipment.push(equipment);
            break; // Found one of this type, move to next
          }
        }
      }

      // Check if all required equipment was found
      if (availableEquipment.length < requiredEquipmentTypes.length) {
        logger.warn('Not all required equipment found', {
          required: requiredEquipmentTypes.length,
          found: availableEquipment.length,
        });
      }

      return availableEquipment;
    } catch (error) {
      logger.error('Error finding available equipment', { error });
      throw error;
    }
  }

  /**
   * Allocate resources for appointment with optimization
   */
  async allocateResources(
    criteria: SchedulingCriteria,
    slot: AvailableSlot,
    requiredEquipment: string[] = [],
  ): Promise<ResourceAllocation> {
    const { logger } = this.deps;

    try {
      logger.info('Allocating resources optimally', { slot: slot.id });

      // Find available rooms and equipment
      const [availableRooms, availableEquipment] = await Promise.all([
        this.findAvailableRooms(criteria, slot, requiredEquipment),
        this.findAvailableEquipment(requiredEquipment, slot),
      ]);

      // Calculate optimal allocation
      const allocation = await this.calculateOptimalAllocation(
        availableRooms,
        availableEquipment,
        criteria,
        slot,
      );

      // Check for conflicts
      const conflicts = await this.checkResourceConflicts(allocation, slot);

      // Generate alternatives if conflicts exist
      let alternatives: ResourceAllocation[] = [];
      if (conflicts.length > 0) {
        alternatives = await this.generateResourceAlternatives(
          availableRooms,
          availableEquipment,
          criteria,
          slot,
        );
      }

      return {
        roomId: allocation.roomId,
        equipmentIds: allocation.equipmentIds,
        allocationScore: allocation.score,
        efficiency: allocation.efficiency,
        conflicts,
        alternatives: alternatives.slice(0, 3), // Top 3 alternatives
      };
    } catch (error) {
      logger.error('Error allocating resources', { error });
      throw error;
    }
  }

  /**
   * Reserve resources for confirmed appointment
   */
  async reserveResources(
    appointmentId: string,
    roomId: string | undefined,
    equipmentIds: string[],
    startTime: Date,
    endTime: Date,
  ): Promise<ResourceBooking> {
    const { prisma, logger } = this.deps;

    try {
      logger.info('Reserving resources', {
        appointmentId,
        roomId,
        equipmentIds,
      });

      // Calculate buffer times
      const bufferBefore = RESOURCE_CONFIG.ROOM_CLEANING_TIME;
      const bufferAfter = RESOURCE_CONFIG.ROOM_CLEANING_TIME;

      const reservationStart = subMinutes(startTime, bufferBefore);
      const reservationEnd = addMinutes(endTime, bufferAfter);

      // Create resource booking record
      const booking: ResourceBooking = {
        id: `booking-${appointmentId}-${Date.now()}`,
        appointmentId,
        roomId,
        equipmentIds,
        startTime: reservationStart,
        endTime: reservationEnd,
        bufferBefore,
        bufferAfter,
        status: 'RESERVED',
      };

      // Store booking (would integrate with database)
      await this.storeResourceBooking(booking);

      // Update cache
      await this.updateResourceAvailabilityCache(booking);

      // Schedule cleaning/maintenance if needed
      await this.schedulePostAppointmentCleaning(roomId, reservationEnd);

      logger.info('Resources reserved successfully', { bookingId: booking.id });
      return booking;
    } catch (error) {
      logger.error('Error reserving resources', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Release resources after appointment completion
   */
  async releaseResources(bookingId: string): Promise<void> {
    const { logger } = this.deps;

    try {
      logger.info('Releasing resources', { bookingId });

      const booking = await this.getResourceBooking(bookingId);
      if (!booking) {
        throw new Error('Resource booking not found');
      }

      // Update booking status
      booking.status = 'COMPLETED';
      await this.updateResourceBooking(booking);

      // Clear cache entries
      await this.clearResourceCache(booking.roomId, booking.equipmentIds);

      // Schedule deep cleaning if needed
      await this.scheduleDeepCleaningIfNeeded(booking);

      logger.info('Resources released successfully', { bookingId });
    } catch (error) {
      logger.error('Error releasing resources', { error, bookingId });
      throw error;
    }
  }

  /**
   * Get resource utilization statistics
   */
  async getResourceUtilization(
    resourceId: string,
    resourceType: 'ROOM' | 'EQUIPMENT',
    startDate: Date,
    endDate: Date,
  ): Promise<ResourceUtilization[]> {
    const { logger } = this.deps;

    try {
      logger.info('Calculating resource utilization', {
        resourceId,
        resourceType,
      });

      const utilization: ResourceUtilization[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayUtilization = await this.calculateDayUtilization(
          resourceId,
          resourceType,
          currentDate,
        );

        utilization.push(dayUtilization);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return utilization;
    } catch (error) {
      logger.error('Error calculating resource utilization', { error });
      throw error;
    }
  }

  /**
   * Schedule maintenance window for resource
   */
  async scheduleMaintenanceWindow(
    resourceId: string,
    resourceType: 'ROOM' | 'EQUIPMENT',
    window: Omit<MaintenanceWindow, 'id'>,
  ): Promise<MaintenanceWindow> {
    const { logger } = this.deps;

    try {
      logger.info('Scheduling maintenance window', {
        resourceId,
        resourceType,
      });

      const maintenanceWindow: MaintenanceWindow = {
        id: `maintenance-${Date.now()}`,
        ...window,
      };

      // Check for conflicts with existing bookings
      const conflicts = await this.checkMaintenanceConflicts(
        resourceId,
        resourceType,
        maintenanceWindow,
      );

      if (conflicts.length > 0) {
        throw new Error(
          `Maintenance window conflicts with existing bookings: ${conflicts.join(', ')}`,
        );
      }

      // Store maintenance window
      await this.storeMaintenanceWindow(
        resourceId,
        resourceType,
        maintenanceWindow,
      );

      // Update availability cache
      await this.updateMaintenanceCache(resourceId, maintenanceWindow);

      logger.info('Maintenance window scheduled', {
        windowId: maintenanceWindow.id,
      });
      return maintenanceWindow;
    } catch (error) {
      logger.error('Error scheduling maintenance window', { error });
      throw error;
    }
  }

  // Private helper methods

  private determineRoomTypeRequired(
    criteria: SchedulingCriteria,
    requiredEquipment: string[],
  ): keyof typeof RESOURCE_CONFIG.ROOM_TYPES {
    // Emergency appointments need emergency rooms
    if (criteria.appointmentType === AppointmentType.EMERGENCY) {
      return 'EMERGENCY';
    }

    // Check if equipment requires specific room type
    if (
      requiredEquipment.includes('xray') ||
      requiredEquipment.includes('ultrasound')
    ) {
      return 'RADIOLOGY';
    }

    if (
      requiredEquipment.includes('ecg') ||
      requiredEquipment.includes('ultrasound')
    ) {
      return 'CARDIOLOGY';
    }

    if (requiredEquipment.length > 0) {
      return 'PROCEDURE';
    }

    return 'CONSULTATION';
  }

  private async getRoomsByType(
    roomType: keyof typeof RESOURCE_CONFIG.ROOM_TYPES,
  ): Promise<RoomResource[]> {
    // This would query the database for rooms of the specified type
    // For now, return mock data
    const mockRooms: RoomResource[] = [
      {
        id: 'room-1',
        name: 'Room 101',
        type: roomType,
        capacity: RESOURCE_CONFIG.ROOM_TYPES[roomType].capacity,
        isActive: true,
        equipmentIds: [],
        location: 'First Floor',
      },
      {
        id: 'room-2',
        name: 'Room 102',
        type: roomType,
        capacity: RESOURCE_CONFIG.ROOM_TYPES[roomType].capacity,
        isActive: true,
        equipmentIds: [],
        location: 'First Floor',
      },
    ];

    return mockRooms;
  }

  private async isRoomAvailable(
    room: RoomResource,
    slot: AvailableSlot,
  ): Promise<boolean> {
    const { redis } = this.deps;

    try {
      // Check cache first
      const cacheKey = `${this.ROOM_CACHE_KEY}:${room.id}:${format(slot.startTime, 'yyyy-MM-dd')}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        const availability = JSON.parse(cached);
        return !availability.conflicts.some(
          (conflict: any) =>
            isWithinInterval(slot.startTime, {
              start: new Date(conflict.start),
              end: new Date(conflict.end),
            }) ||
            isWithinInterval(slot.endTime, {
              start: new Date(conflict.start),
              end: new Date(conflict.end),
            }),
        );
      }

      // Check database for conflicts
      const conflicts = await this.getRoomConflicts(room.id, slot);
      return conflicts.length === 0;
    } catch (error) {
      this.deps.logger.warn('Error checking room availability', {
        error,
        roomId: room.id,
      });
      return false;
    }
  }

  private async roomHasRequiredEquipment(
    room: RoomResource,
    requiredEquipment: string[],
  ): Promise<boolean> {
    if (requiredEquipment.length === 0) return true;

    // Check if room has all required equipment
    const roomEquipment = await this.getRoomEquipment(room.id);

    return requiredEquipment.every(required =>
      roomEquipment.some(eq => eq.type === required && eq.isActive),
    );
  }

  private async sortRoomsByPreference(
    rooms: RoomResource[],
    doctorId?: string,
  ): Promise<RoomResource[]> {
    // Sort rooms by doctor preference, proximity, etc.
    // For now, just sort by name
    return rooms.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async getEquipmentByType(
    equipmentType: string,
    roomId?: string,
  ): Promise<EquipmentResource[]> {
    // Query database for equipment of specified type
    // Consider room assignments if roomId provided
    const mockEquipment: EquipmentResource[] = [
      {
        id: 'eq-1',
        name: `${equipmentType} Device 1`,
        type: equipmentType,
        isActive: true,
        isPortable: false,
        roomAssignments: roomId ? [roomId] : [],
      },
    ];

    return mockEquipment;
  }

  private async isEquipmentAvailable(
    equipment: EquipmentResource,
    slot: AvailableSlot,
  ): Promise<boolean> {
    // Check equipment availability similar to room availability
    const conflicts = await this.getEquipmentConflicts(equipment.id, slot);
    return conflicts.length === 0;
  }

  private async calculateOptimalAllocation(
    rooms: RoomResource[],
    equipment: EquipmentResource[],
    criteria: SchedulingCriteria,
    slot: AvailableSlot,
  ): Promise<{
    roomId?: string;
    equipmentIds: string[];
    score: number;
    efficiency: number;
  }> {
    if (rooms.length === 0) {
      return {
        equipmentIds: equipment.map(eq => eq.id),
        score: 0.5,
        efficiency: 0.5,
      };
    }

    // Simple allocation - pick first available room and all equipment
    const selectedRoom = rooms[0];
    const selectedEquipment = equipment;

    // Calculate allocation score based on various factors
    let score = 0.8; // Base score

    // Preference for room type match
    const roomTypeConfig = RESOURCE_CONFIG.ROOM_TYPES[selectedRoom.type];
    if (
      roomTypeConfig.equipmentRequired.every(req =>
        selectedEquipment.some(eq => eq.type === req),
      )
    ) {
      score += 0.1;
    }

    // Efficiency based on room utilization
    const efficiency = await this.calculateRoomEfficiency(
      selectedRoom.id,
      slot,
    );

    return {
      roomId: selectedRoom.id,
      equipmentIds: selectedEquipment.map(eq => eq.id),
      score,
      efficiency,
    };
  }

  private async checkResourceConflicts(
    allocation: { roomId?: string; equipmentIds: string[] },
    slot: AvailableSlot,
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Check room conflicts
    if (allocation.roomId) {
      const roomConflicts = await this.getRoomConflicts(
        allocation.roomId,
        slot,
      );
      conflicts.push(...roomConflicts);
    }

    // Check equipment conflicts
    for (const equipmentId of allocation.equipmentIds) {
      const equipmentConflicts = await this.getEquipmentConflicts(
        equipmentId,
        slot,
      );
      conflicts.push(...equipmentConflicts);
    }

    return conflicts;
  }

  private async generateResourceAlternatives(
    rooms: RoomResource[],
    equipment: EquipmentResource[],
    criteria: SchedulingCriteria,
    slot: AvailableSlot,
  ): Promise<ResourceAllocation[]> {
    const alternatives: ResourceAllocation[] = [];

    // Generate up to 3 alternative allocations
    for (let i = 1; i < Math.min(rooms.length, 4); i++) {
      const altAllocation = await this.calculateOptimalAllocation(
        rooms.slice(i),
        equipment,
        criteria,
        slot,
      );

      const conflicts = await this.checkResourceConflicts(altAllocation, slot);

      alternatives.push({
        roomId: altAllocation.roomId,
        equipmentIds: altAllocation.equipmentIds,
        allocationScore: altAllocation.score,
        efficiency: altAllocation.efficiency,
        conflicts,
      });
    }

    return alternatives;
  }

  private async getRoomConflicts(
    roomId: string,
    slot: AvailableSlot,
  ): Promise<Conflict[]> {
    // Check for booking conflicts for the room
    // This would query the database for overlapping bookings
    return [];
  }

  private async getEquipmentConflicts(
    equipmentId: string,
    slot: AvailableSlot,
  ): Promise<Conflict[]> {
    // Check for booking conflicts for the equipment
    return [];
  }

  private async getRoomEquipment(roomId: string): Promise<EquipmentResource[]> {
    // Get equipment assigned to a specific room
    return [];
  }

  private async calculateRoomEfficiency(
    roomId: string,
    slot: AvailableSlot,
  ): Promise<number> {
    // Calculate efficiency based on utilization patterns
    return 0.8; // Placeholder
  }

  private async calculateDayUtilization(
    resourceId: string,
    resourceType: 'ROOM' | 'EQUIPMENT',
    date: Date,
  ): Promise<ResourceUtilization> {
    const totalMinutes = 12 * 60; // 12 hour workday
    const utilizedMinutes = 8 * 60; // Example: 8 hours utilized

    return {
      resourceId,
      resourceType,
      date,
      totalMinutes,
      utilizedMinutes,
      utilizationRate: utilizedMinutes / totalMinutes,
      peakHours: [
        { hour: 9, utilization: 0.9 },
        { hour: 14, utilization: 0.8 },
      ],
      downtime: [
        { reason: 'Cleaning', minutes: 30 },
        { reason: 'Maintenance', minutes: 60 },
      ],
    };
  }

  private async storeResourceBooking(booking: ResourceBooking): Promise<void> {
    // Store booking in database
    this.deps.logger.info('Storing resource booking', {
      bookingId: booking.id,
    });
  }

  private async updateResourceAvailabilityCache(
    booking: ResourceBooking,
  ): Promise<void> {
    // Update Redis cache with booking information
    const { redis } = this.deps;

    if (booking.roomId) {
      const roomKey = `${this.ROOM_CACHE_KEY}:${booking.roomId}:${format(booking.startTime, 'yyyy-MM-dd')}`;
      const cached = (await redis.get(roomKey)) || '{"conflicts":[]}';
      const availability = JSON.parse(cached);

      availability.conflicts.push({
        start: booking.startTime,
        end: booking.endTime,
        appointmentId: booking.appointmentId,
      });

      await redis.setex(roomKey, 86400, JSON.stringify(availability)); // 24 hours
    }
  }

  private async schedulePostAppointmentCleaning(
    roomId: string | undefined,
    endTime: Date,
  ): Promise<void> {
    if (!roomId) return;

    const cleaningWindow: MaintenanceWindow = {
      id: `cleaning-${Date.now()}`,
      startTime: endTime,
      endTime: addMinutes(endTime, RESOURCE_CONFIG.ROOM_CLEANING_TIME),
      type: 'CLEANING',
      priority: 'MEDIUM',
      description: 'Post-appointment cleaning',
    };

    await this.storeMaintenanceWindow(roomId, 'ROOM', cleaningWindow);
  }

  private async getResourceBooking(
    bookingId: string,
  ): Promise<ResourceBooking | null> {
    // Get booking from database
    return null; // Placeholder
  }

  private async updateResourceBooking(booking: ResourceBooking): Promise<void> {
    // Update booking in database
    this.deps.logger.info('Updating resource booking', {
      bookingId: booking.id,
    });
  }

  private async clearResourceCache(
    roomId: string | undefined,
    equipmentIds: string[],
  ): Promise<void> {
    // Clear Redis cache entries
    const { redis } = this.deps;

    if (roomId) {
      const pattern = `${this.ROOM_CACHE_KEY}:${roomId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }

  private async scheduleDeepCleaningIfNeeded(
    booking: ResourceBooking,
  ): Promise<void> {
    // Check if deep cleaning is needed based on appointment type
    // Schedule if needed
  }

  private async checkMaintenanceConflicts(
    resourceId: string,
    resourceType: 'ROOM' | 'EQUIPMENT',
    window: MaintenanceWindow,
  ): Promise<string[]> {
    // Check for conflicts with existing bookings
    return [];
  }

  private async storeMaintenanceWindow(
    resourceId: string,
    resourceType: 'ROOM' | 'EQUIPMENT',
    window: MaintenanceWindow,
  ): Promise<void> {
    this.deps.logger.info('Storing maintenance window', {
      resourceId,
      resourceType,
      windowId: window.id,
    });
  }

  private async updateMaintenanceCache(
    resourceId: string,
    window: MaintenanceWindow,
  ): Promise<void> {
    // Update cache with maintenance window
    const { redis } = this.deps;
    const key = `maintenance:${resourceId}:${format(window.startTime, 'yyyy-MM-dd')}`;
    await redis.setex(key, 86400, JSON.stringify(window));
  }
}
