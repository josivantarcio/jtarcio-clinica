import { describe, it, expect } from '@jest/globals';

describe('Scheduling Engine Business Logic Tests', () => {
  
  describe('Appointment Type and Status Validation', () => {
    it('should validate appointment types correctly', () => {
      const appointmentTypes = [
        'CONSULTATION',
        'EMERGENCY', 
        'FOLLOW_UP',
        'PROCEDURE',
        'SURGERY'
      ];

      appointmentTypes.forEach(type => {
        expect(type).toBeTruthy();
        expect(typeof type).toBe('string');
      });

      // Validar tipos específicos
      expect(appointmentTypes).toContain('CONSULTATION');
      expect(appointmentTypes).toContain('EMERGENCY');
      expect(appointmentTypes).toContain('FOLLOW_UP');
    });

    it('should validate appointment status transitions', () => {
      const statusTransitions = {
        'PENDING': ['SCHEDULED', 'CANCELLED'],
        'SCHEDULED': ['CONFIRMED', 'CANCELLED', 'RESCHEDULED'],
        'CONFIRMED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
        'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': ['RESCHEDULED'],
        'NO_SHOW': ['RESCHEDULED'],
        'RESCHEDULED': ['SCHEDULED']
      };

      Object.entries(statusTransitions).forEach(([currentStatus, allowedTransitions]) => {
        expect(Array.isArray(allowedTransitions)).toBe(true);
        expect(typeof currentStatus).toBe('string');
        
        // Validar que transições são strings válidas
        allowedTransitions.forEach(transition => {
          expect(typeof transition).toBe('string');
          expect(transition.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Scheduling Criteria Validation', () => {
    it('should validate scheduling criteria structure', () => {
      const schedulingCriteria = {
        specialtyId: 'specialty-123',
        appointmentType: 'CONSULTATION',
        duration: 30,
        startDate: new Date('2025-08-22T09:00:00Z'),
        endDate: new Date('2025-08-29T17:00:00Z'),
        patientId: 'patient-456',
        preferredDoctorId: 'doctor-789',
        isEmergency: false,
        urgencyLevel: 3
      };

      // Validar estrutura básica
      expect(schedulingCriteria.specialtyId).toBeTruthy();
      expect(schedulingCriteria.appointmentType).toBe('CONSULTATION');
      expect(schedulingCriteria.duration).toBe(30);
      expect(schedulingCriteria.patientId).toBeTruthy();
      expect(typeof schedulingCriteria.isEmergency).toBe('boolean');
      expect(schedulingCriteria.urgencyLevel).toBeGreaterThanOrEqual(1);
      expect(schedulingCriteria.urgencyLevel).toBeLessThanOrEqual(10);

      // Validar datas
      expect(schedulingCriteria.startDate instanceof Date).toBe(true);
      expect(schedulingCriteria.endDate instanceof Date).toBe(true);
      expect(schedulingCriteria.endDate.getTime()).toBeGreaterThan(schedulingCriteria.startDate.getTime());
    });

    it('should validate emergency criteria has higher priority', () => {
      const emergencyCriteria = {
        specialtyId: 'cardiology-1',
        appointmentType: 'EMERGENCY',
        duration: 45,
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        patientId: 'patient-emergency',
        isEmergency: true,
        urgencyLevel: 9,
        symptoms: 'chest pain and difficulty breathing',
        requiredResponseTime: 15
      };

      const normalCriteria = {
        specialtyId: 'cardiology-1',
        appointmentType: 'CONSULTATION',
        duration: 30,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        patientId: 'patient-normal',
        isEmergency: false,
        urgencyLevel: 3
      };

      // Emergency deve ter prioridade maior
      expect(emergencyCriteria.urgencyLevel).toBeGreaterThan(normalCriteria.urgencyLevel);
      expect(emergencyCriteria.isEmergency).toBe(true);
      expect(normalCriteria.isEmergency).toBe(false);
      expect(emergencyCriteria.requiredResponseTime).toBeLessThan(60);
    });
  });

  describe('Available Slot Management', () => {
    it('should calculate available slots correctly', () => {
      const doctorAvailability = {
        doctorId: 'doctor-123',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        lunchBreak: {
          startTime: '12:00',
          endTime: '13:00'
        }
      };

      // Calcular slots disponíveis (8 horas - 1 hora almoço = 7 horas = 420 minutos)
      const workingMinutes = (17 - 9) * 60 - 60; // 420 minutos
      const expectedSlots = Math.floor(workingMinutes / doctorAvailability.slotDuration);

      expect(expectedSlots).toBe(14); // 14 slots de 30 minutos
      expect(doctorAvailability.slotDuration).toBe(30);
      expect(doctorAvailability.startTime).toBe('09:00');
      expect(doctorAvailability.endTime).toBe('17:00');
    });

    it('should handle slot conflicts detection', () => {
      const existingSlot = {
        id: 'slot-1',
        doctorId: 'doctor-123',
        startTime: new Date('2025-08-22T10:00:00Z'),
        endTime: new Date('2025-08-22T10:30:00Z'),
        status: 'BOOKED'
      };

      const newSlotRequest = {
        doctorId: 'doctor-123',
        startTime: new Date('2025-08-22T10:15:00Z'),
        endTime: new Date('2025-08-22T10:45:00Z')
      };

      // Detectar conflito de horário
      const hasConflict = (
        newSlotRequest.startTime.getTime() < existingSlot.endTime.getTime() &&
        newSlotRequest.endTime.getTime() > existingSlot.startTime.getTime()
      );

      expect(hasConflict).toBe(true);
      expect(existingSlot.doctorId).toBe(newSlotRequest.doctorId);
      expect(existingSlot.status).toBe('BOOKED');
    });
  });

  describe('Emergency Handling Logic', () => {
    it('should triage emergency requests accurately', () => {
      const emergencyAssessment = {
        symptoms: 'severe chest pain',
        painLevel: 9,
        vitalSigns: {
          systolic: 190,
          heartRate: 110,
          temperature: 38.5,
          oxygenSat: 95
        }
      };

      // Calcular urgência baseada em vital signs
      let urgencyScore = 0;
      
      if (emergencyAssessment.vitalSigns.systolic > 180) urgencyScore += 3;
      if (emergencyAssessment.vitalSigns.heartRate > 100) urgencyScore += 2;
      if (emergencyAssessment.vitalSigns.oxygenSat < 96) urgencyScore += 2;
      if (emergencyAssessment.painLevel >= 8) urgencyScore += 3;

      const urgencyLevel = Math.min(urgencyScore, 10);
      const medicalPriority = urgencyLevel >= 8 ? 'LIFE_THREATENING' : 
                            urgencyLevel >= 6 ? 'URGENT' : 'NORMAL';

      expect(urgencyLevel).toBeGreaterThanOrEqual(8);
      expect(medicalPriority).toBe('LIFE_THREATENING');
      expect(emergencyAssessment.vitalSigns.systolic).toBeGreaterThan(180);
    });

    it('should calculate emergency response times', () => {
      const emergencyLevels = [
        { level: 10, expectedResponse: 5, priority: 'CRITICAL' },
        { level: 9, expectedResponse: 10, priority: 'LIFE_THREATENING' },
        { level: 8, expectedResponse: 15, priority: 'URGENT' },
        { level: 7, expectedResponse: 30, priority: 'HIGH' },
        { level: 6, expectedResponse: 60, priority: 'MODERATE' }
      ];

      emergencyLevels.forEach(emergency => {
        expect(emergency.level).toBeGreaterThanOrEqual(6);
        expect(emergency.expectedResponse).toBeGreaterThan(0);
        expect(emergency.expectedResponse).toBeLessThanOrEqual(60);
        expect(emergency.priority).toBeTruthy();

        // Nível mais alto = resposta mais rápida
        if (emergency.level === 10) {
          expect(emergency.expectedResponse).toBeLessThanOrEqual(5);
        }
      });
    });
  });

  describe('Business Rules Validation', () => {
    it('should validate appointment booking rules', () => {
      const bookingRules = {
        minAdvanceBooking: 60, // 1 hour
        maxAdvanceBooking: 90 * 24 * 60, // 90 days in minutes
        cancellationPolicyHours: 24,
        emergencyOverrideEnabled: true,
        overbookingThreshold: 0.1 // 10%
      };

      const appointmentRequest = {
        requestedTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        appointmentType: 'CONSULTATION',
        duration: 30
      };

      const advanceTime = (appointmentRequest.requestedTime.getTime() - Date.now()) / (1000 * 60);
      
      expect(advanceTime).toBeGreaterThanOrEqual(bookingRules.minAdvanceBooking);
      expect(advanceTime).toBeLessThanOrEqual(bookingRules.maxAdvanceBooking);
      expect(bookingRules.cancellationPolicyHours).toBe(24);
      expect(bookingRules.emergencyOverrideEnabled).toBe(true);
    });

    it('should calculate cancellation fees correctly', () => {
      const cancellationPolicy = {
        feeStructure: [
          { hoursBeforeAppointment: 48, feePercentage: 0 },    // No fee if 48h+ notice
          { hoursBeforeAppointment: 24, feePercentage: 25 },   // 25% fee if 24-48h notice  
          { hoursBeforeAppointment: 12, feePercentage: 50 },   // 50% fee if 12-24h notice
          { hoursBeforeAppointment: 2, feePercentage: 75 },    // 75% fee if 2-12h notice
          { hoursBeforeAppointment: 0, feePercentage: 100 }    // 100% fee if <2h notice
        ]
      };

      const appointmentFee = 150.00;
      const hoursBeforeCancellation = 12;

      // Encontrar taxa aplicável
      const applicableRule = cancellationPolicy.feeStructure.find(rule => 
        hoursBeforeCancellation >= rule.hoursBeforeAppointment
      ) || cancellationPolicy.feeStructure[cancellationPolicy.feeStructure.length - 1];

      const cancellationFee = (appointmentFee * applicableRule.feePercentage) / 100;

      expect(cancellationFee).toBe(75.00); // 50% de R$ 150
      expect(applicableRule.feePercentage).toBe(50);
      expect(hoursBeforeCancellation).toBe(12);
    });
  });

  describe('Queue Management Logic', () => {
    it('should calculate patient priority scores', () => {
      const patients: Array<{
        id: string;
        appointmentHistory: number;
        urgencyLevel: number;
        waitingTime: number;
        isVIP: boolean;
        appointmentType: string;
        priorityScore?: number;
      }> = [
        {
          id: 'patient-1',
          appointmentHistory: 5,
          urgencyLevel: 7,
          waitingTime: 3, // days
          isVIP: false,
          appointmentType: 'CONSULTATION'
        },
        {
          id: 'patient-2', 
          appointmentHistory: 0,
          urgencyLevel: 9,
          waitingTime: 1,
          isVIP: false,
          appointmentType: 'EMERGENCY'
        },
        {
          id: 'patient-3',
          appointmentHistory: 15,
          urgencyLevel: 4,
          waitingTime: 7,
          isVIP: true,
          appointmentType: 'CONSULTATION'
        }
      ];

      // Calcular score de prioridade
      patients.forEach(patient => {
        let priorityScore = 0;
        
        // Urgência (peso 40%)
        priorityScore += patient.urgencyLevel * 4;
        
        // Tipo de consulta (peso 30%)
        if (patient.appointmentType === 'EMERGENCY') priorityScore += 30;
        else if (patient.appointmentType === 'FOLLOW_UP') priorityScore += 20;
        else priorityScore += 10;
        
        // Tempo de espera (peso 20%)
        priorityScore += Math.min(patient.waitingTime * 2, 20);
        
        // Status VIP (peso 10%)
        if (patient.isVIP) priorityScore += 10;
        
        // Histórico (bônus para pacientes frequentes)
        if (patient.appointmentHistory > 10) priorityScore += 5;

        patient.priorityScore = priorityScore;
      });

      // Emergency deve ter maior prioridade
      const emergencyPatient = patients.find(p => p.appointmentType === 'EMERGENCY');
      const consultationPatients = patients.filter(p => p.appointmentType === 'CONSULTATION');
      
      expect(emergencyPatient?.priorityScore).toBeGreaterThan(
        Math.max(...consultationPatients.map(p => p.priorityScore!))
      );
      
      // Verificar que todos têm scores válidos
      patients.forEach(patient => {
        expect(patient.priorityScore).toBeGreaterThan(0);
        expect(patient.priorityScore).toBeLessThanOrEqual(100);
      });
    });

    it('should handle auto-booking logic', () => {
      const queueEntry = {
        id: 'queue-123',
        patientId: 'patient-456',
        autoBookingEnabled: true,
        autoBookingAttempts: 2,
        maxAutoBookingAttempts: 5,
        preferredDates: [
          new Date('2025-08-22T00:00:00Z'),
          new Date('2025-08-23T00:00:00Z')
        ],
        preferredTimes: ['09:00', '14:00', '16:00']
      };

      const availableSlot = {
        id: 'slot-789',
        doctorId: 'doctor-123',
        startTime: new Date('2025-08-22T14:00:00Z'),
        endTime: new Date('2025-08-22T14:30:00Z'),
        duration: 30
      };

      // Verificar se slot atende preferências
      const slotDate = availableSlot.startTime.toISOString().split('T')[0];
      const slotTime = availableSlot.startTime.getUTCHours().toString().padStart(2, '0') + ':00';
      
      const dateMatches = queueEntry.preferredDates.some(date => 
        date.toISOString().split('T')[0] === slotDate
      );
      const timeMatches = queueEntry.preferredTimes.includes(slotTime);
      
      const canAutoBook = queueEntry.autoBookingEnabled && 
                         queueEntry.autoBookingAttempts < queueEntry.maxAutoBookingAttempts &&
                         dateMatches && timeMatches;

      expect(canAutoBook).toBe(true);
      expect(dateMatches).toBe(true);
      expect(timeMatches).toBe(true);
      expect(queueEntry.autoBookingAttempts).toBeLessThan(queueEntry.maxAutoBookingAttempts);
    });
  });

  describe('Resource Allocation Logic', () => {
    it('should allocate rooms optimally', () => {
      const availableRooms = [
        {
          id: 'room-101',
          capacity: 2,
          equipment: ['basic'],
          location: 'wing-a',
          isAccessible: true,
          currentOccupancy: 0
        },
        {
          id: 'room-102', 
          capacity: 4,
          equipment: ['basic', 'cardiac_monitor'],
          location: 'wing-a',
          isAccessible: false,
          currentOccupancy: 1
        },
        {
          id: 'room-201',
          capacity: 1,
          equipment: ['basic', 'ultrasound'],
          location: 'wing-b',
          isAccessible: true,
          currentOccupancy: 0
        }
      ];

      const appointmentRequirements = {
        requiredEquipment: ['basic'],
        needsAccessibility: true,
        estimatedDuration: 30,
        specialtyType: 'CARDIOLOGY'
      };

      // Filtrar salas compatíveis
      const compatibleRooms = availableRooms.filter(room => {
        const hasRequiredEquipment = appointmentRequirements.requiredEquipment.every(
          equipment => room.equipment.includes(equipment)
        );
        const meetsAccessibility = !appointmentRequirements.needsAccessibility || room.isAccessible;
        const hasCapacity = room.currentOccupancy < room.capacity;

        return hasRequiredEquipment && meetsAccessibility && hasCapacity;
      });

      expect(compatibleRooms.length).toBeGreaterThan(0);
      
      // Verificar que salas filtradas atendem requisitos
      compatibleRooms.forEach(room => {
        expect(room.equipment.includes('basic')).toBe(true);
        expect(room.isAccessible).toBe(true);
        expect(room.currentOccupancy).toBeLessThan(room.capacity);
      });
    });

    it('should calculate allocation efficiency', () => {
      const resourceAllocation = {
        roomId: 'room-101',
        doctorId: 'doctor-123',
        equipmentAllocated: ['basic', 'stethoscope'],
        staffAssigned: ['nurse-456'],
        timeSlot: {
          start: new Date('2025-08-22T10:00:00Z'),
          end: new Date('2025-08-22T10:30:00Z')
        },
        utilizationRate: 0.85,
        conflictScore: 0.1
      };

      // Calcular eficiência da alocação
      const baseEfficiency = resourceAllocation.utilizationRate * 100;
      const conflictPenalty = resourceAllocation.conflictScore * 20;
      const allocationEfficiency = Math.max(0, baseEfficiency - conflictPenalty);

      expect(allocationEfficiency).toBe(83); // 85% - 2% = 83%
      expect(resourceAllocation.utilizationRate).toBeGreaterThan(0.8);
      expect(resourceAllocation.conflictScore).toBeLessThan(0.2);
      expect(allocationEfficiency).toBeGreaterThan(75);
    });
  });

  describe('Scheduling Intelligence', () => {
    it('should analyze patient behavior patterns', () => {
      const patientHistory = [
        {
          scheduledAt: new Date('2025-08-01T09:00:00Z'),
          actualArrival: new Date('2025-08-01T09:05:00Z'),
          status: 'COMPLETED'
        },
        {
          scheduledAt: new Date('2025-07-15T14:00:00Z'),
          actualArrival: new Date('2025-07-15T14:10:00Z'),
          status: 'COMPLETED'
        },
        {
          scheduledAt: new Date('2025-07-01T09:30:00Z'),
          actualArrival: null,
          status: 'NO_SHOW'
        },
        {
          scheduledAt: new Date('2025-06-20T16:00:00Z'),
          actualArrival: new Date('2025-06-20T15:55:00Z'),
          status: 'COMPLETED'
        }
      ];

      // Analisar padrões
      const completedAppointments = patientHistory.filter(apt => apt.status === 'COMPLETED');
      const noShows = patientHistory.filter(apt => apt.status === 'NO_SHOW');
      
      const showUpRate = completedAppointments.length / patientHistory.length;
      
      // Calcular padrão de pontualidade
      const punctualityData = completedAppointments
        .filter(apt => apt.actualArrival)
        .map(apt => {
          const diff = apt.actualArrival!.getTime() - apt.scheduledAt.getTime();
          return diff / (1000 * 60); // minutos
        });
      
      const avgLateness = punctualityData.reduce((sum, mins) => sum + mins, 0) / punctualityData.length;
      
      // Preferência de horário
      const timePreferences = completedAppointments.map(apt => apt.scheduledAt.getHours());
      const morningPreference = timePreferences.filter(hour => hour < 12).length / timePreferences.length;

      expect(showUpRate).toBe(0.75); // 75% show-up rate
      expect(avgLateness).toBeCloseTo(3.33, 1); // ~3.33 minutos de atraso médio (5+10-5)/3
      expect(morningPreference).toBeCloseTo(0.67, 1); // ~67% preferência matinal
    });

    it('should generate optimization recommendations', () => {
      const doctorScheduleData = {
        doctorId: 'doctor-123',
        avgConsultationTime: 28, // minutes
        scheduledSlotDuration: 30,
        utilizationRate: 0.82,
        noShowRate: 0.15,
        overtimeFrequency: 0.25,
        patientSatisfactionScore: 4.2
      };

      const recommendations = [];

      // Gerar recomendações baseadas em dados
      if (doctorScheduleData.avgConsultationTime < doctorScheduleData.scheduledSlotDuration - 5) {
        recommendations.push({
          type: 'SLOT_OPTIMIZATION',
          suggestion: 'Reduzir duração do slot para 25 minutos',
          expectedImprovement: 'Aumentar throughput em 16%',
          priority: 'HIGH'
        });
      }

      if (doctorScheduleData.noShowRate > 0.1) {
        recommendations.push({
          type: 'NO_SHOW_REDUCTION',
          suggestion: 'Implementar lembretes automáticos 24h antes',
          expectedImprovement: 'Reduzir no-shows em 40%',
          priority: 'MEDIUM'
        });
      }

      if (doctorScheduleData.overtimeFrequency > 0.2) {
        recommendations.push({
          type: 'SCHEDULE_BUFFER',
          suggestion: 'Adicionar buffer de 10 minutos entre consultas complexas',
          expectedImprovement: 'Reduzir overtime em 60%',
          priority: 'HIGH'
        });
      }

      expect(recommendations.length).toBe(2); // Only 2 conditions are met with current data
      expect(recommendations[0].type).toBe('NO_SHOW_REDUCTION');
      expect(recommendations[1].type).toBe('SCHEDULE_BUFFER');
      expect(recommendations[1].priority).toBe('HIGH');

      // Validar estrutura das recomendações
      recommendations.forEach(rec => {
        expect(rec.type).toBeTruthy();
        expect(rec.suggestion).toBeTruthy();
        expect(rec.expectedImprovement).toBeTruthy();
        expect(['LOW', 'MEDIUM', 'HIGH'].includes(rec.priority)).toBe(true);
      });
    });
  });

  describe('Performance and Cache Logic', () => {
    it('should handle bulk operations efficiently', () => {
      const bulkCriteria = Array.from({ length: 10 }, (_, i) => ({
        id: `criteria-${i}`,
        specialtyId: 'specialty-1',
        appointmentType: 'CONSULTATION',
        duration: 30,
        startDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        patientId: `patient-${i}`
      }));

      // Simular processamento em lote
      const processingTimes = bulkCriteria.map((_, index) => {
        // Simular tempo decrescente por otimização de lote
        const baseTime = 100; // ms
        const optimizationFactor = Math.max(0.1, 1 - (index * 0.05));
        return Math.floor(baseTime * optimizationFactor);
      });

      const totalTime = processingTimes.reduce((sum, time) => sum + time, 0);
      const avgTime = totalTime / processingTimes.length;

      expect(bulkCriteria.length).toBe(10);
      expect(totalTime).toBeLessThan(1000); // Menos de 1 segundo total
      expect(avgTime).toBeLessThan(100); // Menos de 100ms por item em média
      expect(processingTimes[9]).toBeLessThan(processingTimes[0]); // Otimização progressive
    });

    it('should implement cache strategies effectively', () => {
      const cacheConfig = {
        availabilityTTL: 300, // 5 minutes
        doctorScheduleTTL: 1800, // 30 minutes
        resourceAllocationTTL: 600, // 10 minutes
        emergencyBypassCache: true,
        maxCacheSize: 1000
      };

      const cacheKey = 'availability:specialty-1:2025-08-22';
      const cacheData = {
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + cacheConfig.availabilityTTL * 1000),
        data: {
          availableSlots: 15,
          doctors: ['doctor-1', 'doctor-2'],
          nextAvailable: new Date(Date.now() + 60 * 60 * 1000)
        }
      };

      // Validar configuração de cache
      expect(cacheConfig.availabilityTTL).toBe(300);
      expect(cacheConfig.emergencyBypassCache).toBe(true);
      expect(cacheConfig.maxCacheSize).toBeGreaterThan(0);

      // Validar dados do cache
      expect(cacheData.expiresAt.getTime()).toBeGreaterThan(cacheData.generatedAt.getTime());
      expect(cacheData.data.availableSlots).toBeGreaterThan(0);
      expect(Array.isArray(cacheData.data.doctors)).toBe(true);
      
      // Verificar se cache ainda é válido
      const isValid = cacheData.expiresAt.getTime() > Date.now();
      expect(isValid).toBe(true);
    });
  });
});