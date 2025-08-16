import {
  BusinessRules,
  CANCELLATION_POLICY,
  RESCHEDULING_RULES,
  EMERGENCY_RULES,
  PATIENT_CLASSIFICATION,
  NO_SHOW_POLICY,
  PatientClassification,
} from '@/config/business-rules';
import {
  AppointmentType,
  AppointmentStatus,
  CancellationReason,
  SchedulingCriteria,
} from '@/types/scheduling';
import { PrismaClient } from '../../database/generated/client';
import {
  differenceInHours,
  differenceInMinutes,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Logger } from 'winston';

export interface BusinessRuleResult {
  isValid: boolean;
  violations: RuleViolation[];
  warnings: RuleWarning[];
  modifications: RuleModification[];
}

export interface RuleViolation {
  rule: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  code: string;
  details?: any;
}

export interface RuleWarning {
  rule: string;
  message: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestion?: string;
}

export interface RuleModification {
  field: string;
  originalValue: any;
  suggestedValue: any;
  reason: string;
  required: boolean;
}

export interface PolicyContext {
  appointment?: any;
  patient?: any;
  doctor?: any;
  specialty?: any;
  systemConfig?: any;
}

export interface BusinessRulesEngineDeps {
  prisma: PrismaClient;
  logger: Logger;
}

export class BusinessRulesEngine {
  constructor(private deps: BusinessRulesEngineDeps) {}

  /**
   * Validate appointment booking according to business rules
   */
  async validateBooking(
    criteria: SchedulingCriteria,
    slotData: any,
    context: PolicyContext = {},
  ): Promise<BusinessRuleResult> {
    const { logger } = this.deps;
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    try {
      // Validate timing rules
      const timingResult = await this.validateTimingRules(
        criteria,
        slotData,
        context,
      );
      this.mergeResults(result, timingResult);

      // Validate patient eligibility
      const patientResult = await this.validatePatientEligibility(
        criteria,
        context,
      );
      this.mergeResults(result, patientResult);

      // Validate doctor availability
      const doctorResult = await this.validateDoctorAvailability(
        criteria,
        slotData,
        context,
      );
      this.mergeResults(result, doctorResult);

      // Validate specialty-specific rules
      const specialtyResult = await this.validateSpecialtyRules(
        criteria,
        context,
      );
      this.mergeResults(result, specialtyResult);

      // Validate appointment type constraints
      const typeResult = await this.validateAppointmentTypeConstraints(
        criteria,
        context,
      );
      this.mergeResults(result, typeResult);

      // Validate resource availability
      const resourceResult = await this.validateResourceAvailability(
        criteria,
        slotData,
        context,
      );
      this.mergeResults(result, resourceResult);

      // Check for emergency overrides
      if (criteria.isEmergency) {
        const emergencyResult = await this.applyEmergencyOverrides(
          result,
          criteria,
          context,
        );
        this.mergeResults(result, emergencyResult);
      }

      result.isValid =
        result.violations.filter(v => v.severity === 'ERROR').length === 0;

      logger.info('Booking validation completed', {
        isValid: result.isValid,
        violationCount: result.violations.length,
        warningCount: result.warnings.length,
      });

      return result;
    } catch (error) {
      logger.error('Error validating booking rules', { error, criteria });
      throw error;
    }
  }

  /**
   * Validate cancellation request
   */
  async validateCancellation(
    appointmentId: string,
    reason: CancellationReason,
    context: PolicyContext = {},
  ): Promise<BusinessRuleResult> {
    const { prisma, logger } = this.deps;
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    try {
      const appointment = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          specialty: true,
        },
      });

      const hoursBeforeAppointment = differenceInHours(
        appointment.scheduledAt,
        new Date(),
      );

      // Check cancellation timing
      if (hoursBeforeAppointment < 0) {
        result.violations.push({
          rule: 'CANCELLATION_TIMING',
          severity: 'ERROR',
          message: 'Cannot cancel past appointments',
          code: 'PAST_APPOINTMENT_CANCELLATION',
        });
      }

      // Calculate cancellation fee
      const fee = BusinessRules.calculateCancellationFee(
        hoursBeforeAppointment,
        appointment.fee?.toNumber() || 0,
      );

      if (fee > 0) {
        result.modifications.push({
          field: 'cancellationFee',
          originalValue: 0,
          suggestedValue: fee,
          reason: `Cancellation within ${CANCELLATION_POLICY.FREE_CANCELLATION_HOURS}h notice period`,
          required: true,
        });
      }

      // Check appointment status
      if (appointment.status === AppointmentStatus.COMPLETED) {
        result.violations.push({
          rule: 'CANCELLATION_STATUS',
          severity: 'ERROR',
          message: 'Cannot cancel completed appointments',
          code: 'COMPLETED_APPOINTMENT_CANCELLATION',
        });
      }

      // Check recurring appointments
      if (appointment.rescheduledFrom) {
        result.warnings.push({
          rule: 'RECURRING_CANCELLATION',
          message: 'This is a rescheduled appointment',
          impact: 'MEDIUM',
          suggestion: 'Consider if original appointment needs to be updated',
        });
      }

      // Check no-show history
      const patientHistory = await this.getPatientNoShowHistory(
        appointment.patientId,
      );
      if (
        patientHistory.recentNoShows >=
        NO_SHOW_POLICY.STRIKES_BEFORE_SUSPENSION - 1
      ) {
        result.warnings.push({
          rule: 'NO_SHOW_RISK',
          message: 'Patient has recent no-show history',
          impact: 'HIGH',
          suggestion: 'May require confirmation for future appointments',
        });
      }

      result.isValid =
        result.violations.filter(v => v.severity === 'ERROR').length === 0;
      return result;
    } catch (error) {
      logger.error('Error validating cancellation', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Validate rescheduling request
   */
  async validateRescheduling(
    appointmentId: string,
    newSlot: any,
    reason: string,
    context: PolicyContext = {},
  ): Promise<BusinessRuleResult> {
    const { prisma, logger } = this.deps;
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    try {
      const appointment = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          specialty: true,
        },
      });

      const hoursBeforeOriginal = differenceInHours(
        appointment.scheduledAt,
        new Date(),
      );
      const hoursBeforeNew = differenceInHours(newSlot.scheduledAt, new Date());

      // Check reschedule count
      if (
        appointment.rescheduleCount >=
        RESCHEDULING_RULES.MAX_RESCHEDULES_PER_APPOINTMENT
      ) {
        result.violations.push({
          rule: 'MAX_RESCHEDULES',
          severity: 'ERROR',
          message: 'Maximum reschedule limit reached',
          code: 'RESCHEDULE_LIMIT_EXCEEDED',
          details: {
            limit: RESCHEDULING_RULES.MAX_RESCHEDULES_PER_APPOINTMENT,
          },
        });
      }

      // Check minimum notice period
      if (
        !BusinessRules.canReschedule(
          appointment.rescheduleCount,
          hoursBeforeOriginal,
        )
      ) {
        result.violations.push({
          rule: 'RESCHEDULE_NOTICE',
          severity: 'ERROR',
          message: 'Insufficient notice for rescheduling',
          code: 'INSUFFICIENT_RESCHEDULE_NOTICE',
          details: { minimumHours: RESCHEDULING_RULES.MIN_NOTICE_HOURS },
        });
      }

      // Check same-day rescheduling
      if (
        !RESCHEDULING_RULES.SAME_DAY_RESCHEDULE_ALLOWED &&
        hoursBeforeNew < 24 &&
        hoursBeforeOriginal < 24
      ) {
        result.violations.push({
          rule: 'SAME_DAY_RESCHEDULE',
          severity: 'ERROR',
          message: 'Same-day rescheduling not allowed',
          code: 'SAME_DAY_RESCHEDULE_PROHIBITED',
        });
      }

      // Calculate rescheduling fee
      const rescheduleFreeCutoff = RESCHEDULING_RULES.FREE_RESCHEDULE_HOURS;
      if (hoursBeforeOriginal < rescheduleFreeCutoff) {
        const fee = appointment.fee?.toNumber()
          ? appointment.fee.toNumber() * 0.2
          : 0; // 20% fee
        result.modifications.push({
          field: 'reschedulingFee',
          originalValue: 0,
          suggestedValue: fee,
          reason: `Rescheduling within ${rescheduleFreeCutoff}h notice period`,
          required: true,
        });
      }

      // Validate new slot availability
      const slotValidation = await this.validateBooking(
        {
          ...newSlot,
          patientId: appointment.patientId,
        },
        newSlot,
        context,
      );

      this.mergeResults(result, slotValidation);

      result.isValid =
        result.violations.filter(v => v.severity === 'ERROR').length === 0;
      return result;
    } catch (error) {
      logger.error('Error validating rescheduling', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Apply emergency appointment overrides
   */
  async applyEmergencyOverrides(
    currentResult: BusinessRuleResult,
    criteria: SchedulingCriteria,
    context: PolicyContext,
  ): Promise<BusinessRuleResult> {
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    if (
      criteria.urgencyLevel &&
      criteria.urgencyLevel >= EMERGENCY_RULES.PRIORITY_SCORE_THRESHOLD
    ) {
      // Override capacity restrictions
      const capacityViolations = currentResult.violations.filter(
        v => v.code.includes('CAPACITY') || v.code.includes('OVERBOOKING'),
      );

      if (
        capacityViolations.length > 0 &&
        EMERGENCY_RULES.AUTO_OVERRIDE_CAPACITY
      ) {
        result.warnings.push({
          rule: 'EMERGENCY_OVERRIDE',
          message: 'Capacity restrictions overridden for emergency',
          impact: 'HIGH',
          suggestion: 'Monitor for schedule optimization opportunities',
        });
      }

      // Allow booking outside normal business hours if critical
      const timingViolations = currentResult.violations.filter(v =>
        v.code.includes('BUSINESS_HOURS'),
      );

      if (timingViolations.length > 0 && criteria.urgencyLevel >= 9) {
        result.modifications.push({
          field: 'allowOutsideBusinessHours',
          originalValue: false,
          suggestedValue: true,
          reason: 'Critical emergency override',
          required: false,
        });
      }
    }

    return result;
  }

  /**
   * Validate patient eligibility and history
   */
  async validatePatientEligibility(
    criteria: SchedulingCriteria,
    context: PolicyContext,
  ): Promise<BusinessRuleResult> {
    const { prisma } = this.deps;
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    try {
      const patient = await prisma.patient.findUniqueOrThrow({
        where: { id: criteria.patientId },
        include: {
          user: true,
          appointments: {
            where: {
              status: {
                in: [AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED],
              },
              scheduledAt: { gte: addDays(new Date(), -30) }, // Last 30 days
            },
          },
        },
      });

      // Check patient status
      if (patient.user.status === 'SUSPENDED') {
        result.violations.push({
          rule: 'PATIENT_STATUS',
          severity: 'ERROR',
          message: 'Patient account is suspended',
          code: 'PATIENT_SUSPENDED',
        });
      }

      // Check no-show history
      const noShowCount = patient.appointments.filter(
        a => a.status === AppointmentStatus.NO_SHOW,
      ).length;
      if (noShowCount >= NO_SHOW_POLICY.STRIKES_BEFORE_SUSPENSION) {
        result.violations.push({
          rule: 'NO_SHOW_LIMIT',
          severity: 'ERROR',
          message: 'Patient has exceeded no-show limit',
          code: 'NO_SHOW_LIMIT_EXCEEDED',
          details: {
            noShowCount,
            limit: NO_SHOW_POLICY.STRIKES_BEFORE_SUSPENSION,
          },
        });
      } else if (noShowCount >= NO_SHOW_POLICY.STRIKES_BEFORE_SUSPENSION - 1) {
        result.warnings.push({
          rule: 'NO_SHOW_WARNING',
          message: 'Patient approaching no-show limit',
          impact: 'HIGH',
          suggestion: 'Require appointment confirmation',
        });
      }

      // Check insurance and payment history
      if (patient.insurance) {
        const insuranceValidation = await this.validateInsuranceCoverage(
          patient.insurance,
          criteria,
        );
        this.mergeResults(result, insuranceValidation);
      }

      return result;
    } catch (error) {
      result.violations.push({
        rule: 'PATIENT_VALIDATION',
        severity: 'ERROR',
        message: 'Unable to validate patient eligibility',
        code: 'PATIENT_VALIDATION_ERROR',
      });
      return result;
    }
  }

  // Private helper methods

  private async validateTimingRules(
    criteria: SchedulingCriteria,
    slotData: any,
    context: PolicyContext,
  ): Promise<BusinessRuleResult> {
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    const appointmentTime = slotData.scheduledAt || criteria.startDate;
    const now = new Date();

    // Check advance booking limit
    const daysInAdvance = differenceInHours(appointmentTime, now) / 24;
    const maxAdvanceDays = 180; // Default

    if (daysInAdvance > maxAdvanceDays) {
      result.violations.push({
        rule: 'ADVANCE_BOOKING_LIMIT',
        severity: 'ERROR',
        message: `Cannot book more than ${maxAdvanceDays} days in advance`,
        code: 'ADVANCE_BOOKING_EXCEEDED',
      });
    }

    // Check minimum booking time
    const hoursFromNow = differenceInHours(appointmentTime, now);
    if (hoursFromNow < 1 && !criteria.isEmergency) {
      result.violations.push({
        rule: 'MINIMUM_BOOKING_TIME',
        severity: 'ERROR',
        message: 'Appointments must be booked at least 1 hour in advance',
        code: 'INSUFFICIENT_BOOKING_TIME',
      });
    }

    // Check business hours
    if (
      !BusinessRules.isBusinessHour(appointmentTime.toTimeString().slice(0, 5))
    ) {
      result.violations.push({
        rule: 'BUSINESS_HOURS',
        severity: 'ERROR',
        message: 'Appointment must be within business hours',
        code: 'OUTSIDE_BUSINESS_HOURS',
      });
    }

    return result;
  }

  private async validateDoctorAvailability(
    criteria: SchedulingCriteria,
    slotData: any,
    context: PolicyContext,
  ): Promise<BusinessRuleResult> {
    const { prisma } = this.deps;
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    if (criteria.doctorId) {
      const doctor = await prisma.doctor.findUnique({
        where: { id: criteria.doctorId },
        include: { availability: true, user: true },
      });

      if (!doctor) {
        result.violations.push({
          rule: 'DOCTOR_EXISTS',
          severity: 'ERROR',
          message: 'Doctor not found',
          code: 'DOCTOR_NOT_FOUND',
        });
        return result;
      }

      if (!doctor.isActive) {
        result.violations.push({
          rule: 'DOCTOR_ACTIVE',
          severity: 'ERROR',
          message: 'Doctor is not active',
          code: 'DOCTOR_INACTIVE',
        });
      }

      if (
        !doctor.acceptsNewPatients &&
        context.patient?.appointments?.length === 0
      ) {
        result.violations.push({
          rule: 'NEW_PATIENTS',
          severity: 'ERROR',
          message: 'Doctor is not accepting new patients',
          code: 'NOT_ACCEPTING_NEW_PATIENTS',
        });
      }
    }

    return result;
  }

  private async validateSpecialtyRules(
    criteria: SchedulingCriteria,
    context: PolicyContext,
  ): Promise<BusinessRuleResult> {
    const { prisma } = this.deps;
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    const specialty = await prisma.specialty.findUnique({
      where: { id: criteria.specialtyId },
    });

    if (!specialty) {
      result.violations.push({
        rule: 'SPECIALTY_EXISTS',
        severity: 'ERROR',
        message: 'Specialty not found',
        code: 'SPECIALTY_NOT_FOUND',
      });
      return result;
    }

    if (!specialty.isActive) {
      result.violations.push({
        rule: 'SPECIALTY_ACTIVE',
        severity: 'ERROR',
        message: 'Specialty is not active',
        code: 'SPECIALTY_INACTIVE',
      });
    }

    const specialtyConfig = BusinessRules.getSpecialtyConfig(specialty.name);

    // Validate appointment duration
    if (criteria.duration && criteria.duration > specialtyConfig.duration * 2) {
      result.warnings.push({
        rule: 'DURATION_LIMIT',
        message: 'Appointment duration is unusually long for this specialty',
        impact: 'MEDIUM',
        suggestion: 'Consider breaking into multiple appointments',
      });
    }

    return result;
  }

  private async validateAppointmentTypeConstraints(
    criteria: SchedulingCriteria,
    context: PolicyContext,
  ): Promise<BusinessRuleResult> {
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    const typeConfig = BusinessRules.getAppointmentTypeConfig(
      criteria.appointmentType,
    );

    // Check same-day booking restrictions
    const hoursFromNow = differenceInHours(criteria.startDate, new Date());
    if (!typeConfig.allowSameDay && hoursFromNow < 24) {
      result.violations.push({
        rule: 'SAME_DAY_BOOKING',
        severity: 'ERROR',
        message: `${criteria.appointmentType} appointments cannot be booked same-day`,
        code: 'SAME_DAY_BOOKING_PROHIBITED',
      });
    }

    // Check reason requirement
    if (typeConfig.requiresReason && !criteria.reason) {
      result.violations.push({
        rule: 'REASON_REQUIRED',
        severity: 'ERROR',
        message: `Reason is required for ${criteria.appointmentType} appointments`,
        code: 'REASON_REQUIRED',
      });
    }

    return result;
  }

  private async validateResourceAvailability(
    criteria: SchedulingCriteria,
    slotData: any,
    context: PolicyContext,
  ): Promise<BusinessRuleResult> {
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    // This would integrate with room and equipment availability
    // For now, return basic validation
    return result;
  }

  private async validateInsuranceCoverage(
    insurance: any,
    criteria: SchedulingCriteria,
  ): Promise<BusinessRuleResult> {
    const result: BusinessRuleResult = {
      isValid: true,
      violations: [],
      warnings: [],
      modifications: [],
    };

    // Insurance validation logic would go here
    // For now, return basic validation
    return result;
  }

  private async getPatientNoShowHistory(
    patientId: string,
  ): Promise<{ recentNoShows: number }> {
    const { prisma } = this.deps;

    const noShows = await prisma.appointment.count({
      where: {
        patientId,
        status: AppointmentStatus.NO_SHOW,
        scheduledAt: {
          gte: addDays(new Date(), -90), // Last 90 days
        },
      },
    });

    return { recentNoShows: noShows };
  }

  private mergeResults(
    target: BusinessRuleResult,
    source: BusinessRuleResult,
  ): void {
    target.violations.push(...source.violations);
    target.warnings.push(...source.warnings);
    target.modifications.push(...source.modifications);

    if (!source.isValid) {
      target.isValid = false;
    }
  }
}
