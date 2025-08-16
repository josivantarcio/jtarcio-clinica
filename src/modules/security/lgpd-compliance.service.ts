import { PrismaClient } from '../../database/generated/client';
import { encryptionService } from './encryption.service';
import { AuditService } from '../audit/audit.service';
import { logger } from '../../config/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  userId: string;
  requestType: 'PORTABILITY' | 'ACCESS' | 'CORRECTION';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requestedData: string[];
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
}

export interface DataDeletionRequest {
  userId: string;
  requestType: 'ANONYMIZATION' | 'DELETION' | 'RETENTION_END';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reason: string;
  requestedAt: Date;
  completedAt?: Date;
  retentionEndDate?: Date;
}

export type ConsentType =
  | 'MEDICAL_DATA_PROCESSING'
  | 'APPOINTMENT_REMINDERS'
  | 'MARKETING_COMMUNICATIONS'
  | 'DATA_SHARING_PARTNERS'
  | 'COOKIES_ANALYTICS'
  | 'LOCATION_DATA';

export class LGPDComplianceService {
  private prisma: PrismaClient;
  private auditService: AuditService;

  constructor(prisma: PrismaClient, auditService: AuditService) {
    this.prisma = prisma;
    this.auditService = auditService;
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    version: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ConsentRecord> {
    try {
      // Create consent record
      const consent = await this.prisma.systemConfiguration.upsert({
        where: { key: `user_consent_${userId}_${consentType}` },
        update: {
          value: JSON.stringify({
            granted,
            version,
            grantedAt: granted ? new Date() : null,
            revokedAt: !granted ? new Date() : null,
            ipAddress,
            userAgent,
          }),
        },
        create: {
          key: `user_consent_${userId}_${consentType}`,
          value: JSON.stringify({
            granted,
            version,
            grantedAt: granted ? new Date() : null,
            revokedAt: !granted ? new Date() : null,
            ipAddress,
            userAgent,
          }),
          description: `LGPD consent record for ${consentType}`,
          category: 'LGPD_CONSENT',
        },
      });

      // Log for audit
      await this.auditService.createAuditLog({
        userId,
        ipAddress,
        userAgent,
        action: granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
        resource: 'lgpd_consent',
        resourceId: consent.id,
        newValues: {
          consentType,
          granted,
          version,
        },
      });

      logger.info('Consent recorded', {
        userId,
        consentType,
        granted,
        version,
      });

      const consentData = JSON.parse(consent.value);
      return {
        id: consent.id,
        userId,
        consentType,
        granted,
        version,
        grantedAt: consentData.grantedAt
          ? new Date(consentData.grantedAt)
          : undefined,
        revokedAt: consentData.revokedAt
          ? new Date(consentData.revokedAt)
          : undefined,
        ipAddress,
        userAgent,
      };
    } catch (error) {
      logger.error('Failed to record consent', { error, userId, consentType });
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Get user consents
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const consents = await this.prisma.systemConfiguration.findMany({
        where: {
          key: { startsWith: `user_consent_${userId}_` },
          category: 'LGPD_CONSENT',
        },
      });

      return consents.map(consent => {
        const consentData = JSON.parse(consent.value);
        const consentType = consent.key
          .split('_')
          .slice(2)
          .join('_') as ConsentType;

        return {
          id: consent.id,
          userId,
          consentType,
          granted: consentData.granted,
          version: consentData.version,
          grantedAt: consentData.grantedAt
            ? new Date(consentData.grantedAt)
            : undefined,
          revokedAt: consentData.revokedAt
            ? new Date(consentData.revokedAt)
            : undefined,
          ipAddress: consentData.ipAddress,
          userAgent: consentData.userAgent,
        };
      });
    } catch (error) {
      logger.error('Failed to get user consents', { error, userId });
      throw new Error('Failed to retrieve consents');
    }
  }

  /**
   * Request data export (portability)
   */
  async requestDataExport(
    userId: string,
    requestType: 'PORTABILITY' | 'ACCESS' | 'CORRECTION',
    requestedData: string[],
    ipAddress?: string,
  ): Promise<DataExportRequest> {
    try {
      const request: DataExportRequest = {
        userId,
        requestType,
        status: 'PENDING',
        requestedData,
        requestedAt: new Date(),
      };

      // Store request
      const storedRequest = await this.prisma.systemConfiguration.create({
        data: {
          key: `data_export_${userId}_${Date.now()}`,
          value: JSON.stringify(request),
          description: `LGPD data export request - ${requestType}`,
          category: 'LGPD_DATA_EXPORT',
        },
      });

      // Log for audit
      await this.auditService.createAuditLog({
        userId,
        ipAddress,
        action: 'DATA_EXPORT_REQUESTED',
        resource: 'lgpd_data_export',
        resourceId: storedRequest.id,
        newValues: {
          requestType,
          requestedData,
        },
      });

      // Process request asynchronously
      this.processDataExportRequest(storedRequest.id, request).catch(error => {
        logger.error('Failed to process data export request', {
          error,
          userId,
          requestId: storedRequest.id,
        });
      });

      logger.info('Data export requested', {
        userId,
        requestType,
        requestId: storedRequest.id,
      });
      return { ...request };
    } catch (error) {
      logger.error('Failed to request data export', {
        error,
        userId,
        requestType,
      });
      throw new Error('Failed to request data export');
    }
  }

  /**
   * Request data deletion
   */
  async requestDataDeletion(
    userId: string,
    requestType: 'ANONYMIZATION' | 'DELETION' | 'RETENTION_END',
    reason: string,
    retentionEndDate?: Date,
    ipAddress?: string,
  ): Promise<DataDeletionRequest> {
    try {
      const request: DataDeletionRequest = {
        userId,
        requestType,
        status: 'PENDING',
        reason,
        requestedAt: new Date(),
        retentionEndDate,
      };

      // Store request
      const storedRequest = await this.prisma.systemConfiguration.create({
        data: {
          key: `data_deletion_${userId}_${Date.now()}`,
          value: JSON.stringify(request),
          description: `LGPD data deletion request - ${requestType}`,
          category: 'LGPD_DATA_DELETION',
        },
      });

      // Log for audit
      await this.auditService.createAuditLog({
        userId,
        ipAddress,
        action: 'DATA_DELETION_REQUESTED',
        resource: 'lgpd_data_deletion',
        resourceId: storedRequest.id,
        newValues: {
          requestType,
          reason,
          retentionEndDate,
        },
      });

      // Process request asynchronously
      this.processDataDeletionRequest(storedRequest.id, request).catch(
        error => {
          logger.error('Failed to process data deletion request', {
            error,
            userId,
            requestId: storedRequest.id,
          });
        },
      );

      logger.info('Data deletion requested', {
        userId,
        requestType,
        requestId: storedRequest.id,
      });
      return { ...request };
    } catch (error) {
      logger.error('Failed to request data deletion', {
        error,
        userId,
        requestType,
      });
      throw new Error('Failed to request data deletion');
    }
  }

  /**
   * Get data mapping for user
   */
  async getUserDataMapping(userId: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          patientProfile: true,
          doctorProfile: {
            include: { specialty: true },
          },
          appointments: {
            include: {
              doctor: {
                select: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
              specialty: { select: { name: true } },
            },
          },
          conversations: {
            include: { messages: true },
          },
          notifications: true,
          auditLogs: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Map all user data with LGPD categories
      const dataMapping = {
        identificationData: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          cpf: user.cpf,
          rg: user.rg,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
        },
        professionalData: user.doctorProfile
          ? {
              crm: user.doctorProfile.crm,
              specialty: user.doctorProfile.specialty.name,
              subSpecialties: user.doctorProfile.subSpecialties,
              biography: user.doctorProfile.biography,
              experience: user.doctorProfile.experience,
            }
          : null,
        medicalData: user.patientProfile
          ? {
              emergencyContact: {
                name: user.patientProfile.emergencyContactName,
                phone: user.patientProfile.emergencyContactPhone,
              },
              allergies: user.patientProfile.allergies,
              medications: user.patientProfile.medications,
              medicalHistory: user.patientProfile.medicalHistory,
              insurance: user.patientProfile.insurance,
            }
          : null,
        appointmentData: user.appointments.map(apt => ({
          id: apt.id,
          scheduledAt: apt.scheduledAt,
          status: apt.status,
          type: apt.type,
          reason: apt.reason,
          symptoms: apt.symptoms,
          notes: apt.notes,
          diagnosis: apt.diagnosis,
          prescription: apt.prescription,
          doctor: apt.doctor.user.firstName + ' ' + apt.doctor.user.lastName,
          specialty: apt.specialty.name,
        })),
        communicationData: user.conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          summary: conv.summary,
          messages: conv.messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            createdAt: msg.createdAt,
          })),
        })),
        systemData: {
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          emailVerifiedAt: user.emailVerifiedAt,
          phoneVerifiedAt: user.phoneVerifiedAt,
          status: user.status,
          role: user.role,
        },
        auditTrail: user.auditLogs.map(log => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          createdAt: log.createdAt,
          ipAddress: log.ipAddress,
        })),
      };

      return dataMapping;
    } catch (error) {
      logger.error('Failed to get user data mapping', { error, userId });
      throw new Error('Failed to retrieve user data mapping');
    }
  }

  /**
   * Anonymize user data
   */
  async anonymizeUserData(userId: string): Promise<boolean> {
    try {
      // Generate anonymous identifier
      const anonymousId = `ANON_${encryptionService.generateSecureToken(8)}`;

      // Anonymize user data
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `${anonymousId}@anonymized.local`,
          phone: null,
          cpf: null,
          rg: null,
          firstName: 'Anonymized',
          lastName: 'User',
          fullName: 'Anonymized User',
          dateOfBirth: null,
          gender: null,
          avatar: null,
          encryptedData: null,
          deletedAt: new Date(),
        },
      });

      // Anonymize patient profile if exists
      const patientProfile = await this.prisma.patient.findUnique({
        where: { userId },
      });

      if (patientProfile) {
        await this.prisma.patient.update({
          where: { userId },
          data: {
            emergencyContactName: null,
            emergencyContactPhone: null,
            allergies: [],
            medications: [],
            medicalHistory: null,
            insurance: null,
            address: null,
            deletedAt: new Date(),
          },
        });
      }

      // Keep appointments but anonymize personal data
      await this.prisma.appointment.updateMany({
        where: { patientId: userId },
        data: {
          symptoms: 'Anonymized',
          notes: 'Anonymized',
        },
      });

      // Anonymize conversations and messages
      await this.prisma.message.updateMany({
        where: { conversation: { userId } },
        data: {
          content: 'Anonymized conversation content',
        },
      });

      // Log anonymization
      await this.auditService.createAuditLog({
        userId: anonymousId,
        action: 'DATA_ANONYMIZED',
        resource: 'user_data',
        resourceId: userId,
        newValues: {
          originalUserId: userId,
          anonymizedId: anonymousId,
          anonymizedAt: new Date(),
        },
      });

      logger.info('User data anonymized', { userId, anonymousId });
      return true;
    } catch (error) {
      logger.error('Failed to anonymize user data', { error, userId });
      return false;
    }
  }

  /**
   * Check data retention compliance
   */
  async checkDataRetentionCompliance(): Promise<any> {
    try {
      const retentionPolicies = {
        medicalData: 7 * 365, // 7 years in days
        auditLogs: 10 * 365, // 10 years in days
        conversations: 2 * 365, // 2 years in days
        notifications: 1 * 365, // 1 year in days
      };

      const now = new Date();
      const results = {
        medicalDataExpired: 0,
        auditLogsExpired: 0,
        conversationsExpired: 0,
        notificationsExpired: 0,
      };

      // Check expired medical data (appointments)
      const expiredAppointments = await this.prisma.appointment.count({
        where: {
          createdAt: {
            lt: new Date(
              now.getTime() -
                retentionPolicies.medicalData * 24 * 60 * 60 * 1000,
            ),
          },
          deletedAt: null,
        },
      });
      results.medicalDataExpired = expiredAppointments;

      // Check expired audit logs
      const expiredAuditLogs = await this.prisma.auditLog.count({
        where: {
          createdAt: {
            lt: new Date(
              now.getTime() - retentionPolicies.auditLogs * 24 * 60 * 60 * 1000,
            ),
          },
        },
      });
      results.auditLogsExpired = expiredAuditLogs;

      // Check expired conversations
      const expiredConversations = await this.prisma.conversation.count({
        where: {
          createdAt: {
            lt: new Date(
              now.getTime() -
                retentionPolicies.conversations * 24 * 60 * 60 * 1000,
            ),
          },
          deletedAt: null,
        },
      });
      results.conversationsExpired = expiredConversations;

      // Check expired notifications
      const expiredNotifications = await this.prisma.notification.count({
        where: {
          createdAt: {
            lt: new Date(
              now.getTime() -
                retentionPolicies.notifications * 24 * 60 * 60 * 1000,
            ),
          },
        },
      });
      results.notificationsExpired = expiredNotifications;

      return {
        retentionPolicies,
        expiredData: results,
        complianceStatus: Object.values(results).every(count => count === 0)
          ? 'COMPLIANT'
          : 'NON_COMPLIANT',
        checkedAt: now,
      };
    } catch (error) {
      logger.error('Failed to check data retention compliance', { error });
      throw new Error('Failed to check data retention compliance');
    }
  }

  /**
   * Process data export request (async)
   */
  private async processDataExportRequest(
    requestId: string,
    request: DataExportRequest,
  ): Promise<void> {
    try {
      // Update status to processing
      await this.prisma.systemConfiguration.update({
        where: { id: requestId },
        data: {
          value: JSON.stringify({ ...request, status: 'PROCESSING' }),
        },
      });

      // Get user data
      const userData = await this.getUserDataMapping(request.userId);

      // Filter requested data
      const filteredData: any = {};
      for (const dataType of request.requestedData) {
        if (userData[dataType]) {
          filteredData[dataType] = userData[dataType];
        }
      }

      // Generate export file
      const exportData = {
        exportedAt: new Date(),
        userId: request.userId,
        requestType: request.requestType,
        data: filteredData,
        metadata: {
          totalRecords: Object.keys(filteredData).length,
          exportFormat: 'JSON',
          lgpdCompliant: true,
        },
      };

      // Save to file (or cloud storage)
      const exportPath = path.join(
        process.cwd(),
        'exports',
        `${request.userId}_${Date.now()}.json`,
      );
      await fs.mkdir(path.dirname(exportPath), { recursive: true });
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

      // Update request with completion
      const completedRequest: DataExportRequest = {
        ...request,
        status: 'COMPLETED',
        completedAt: new Date(),
        downloadUrl: `/api/v1/lgpd/download-export/${path.basename(exportPath)}`,
      };

      await this.prisma.systemConfiguration.update({
        where: { id: requestId },
        data: {
          value: JSON.stringify(completedRequest),
        },
      });

      logger.info('Data export completed', {
        requestId,
        userId: request.userId,
        exportPath,
      });
    } catch (error) {
      // Update status to failed
      await this.prisma.systemConfiguration.update({
        where: { id: requestId },
        data: {
          value: JSON.stringify({ ...request, status: 'FAILED' }),
        },
      });

      logger.error('Data export failed', {
        error,
        requestId,
        userId: request.userId,
      });
    }
  }

  /**
   * Process data deletion request (async)
   */
  private async processDataDeletionRequest(
    requestId: string,
    request: DataDeletionRequest,
  ): Promise<void> {
    try {
      // Update status to processing
      await this.prisma.systemConfiguration.update({
        where: { id: requestId },
        data: {
          value: JSON.stringify({ ...request, status: 'PROCESSING' }),
        },
      });

      let success = false;

      switch (request.requestType) {
        case 'ANONYMIZATION':
          success = await this.anonymizeUserData(request.userId);
          break;

        case 'DELETION':
          // Full deletion (use with caution - medical data has legal retention requirements)
          success = await this.deleteUserData(request.userId);
          break;

        case 'RETENTION_END':
          // Delete data that has exceeded retention period
          success = await this.deleteExpiredData(request.userId);
          break;
      }

      // Update request with completion
      const completedRequest: DataDeletionRequest = {
        ...request,
        status: success ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
      };

      await this.prisma.systemConfiguration.update({
        where: { id: requestId },
        data: {
          value: JSON.stringify(completedRequest),
        },
      });

      logger.info('Data deletion completed', {
        requestId,
        userId: request.userId,
        success,
      });
    } catch (error) {
      // Update status to failed
      await this.prisma.systemConfiguration.update({
        where: { id: requestId },
        data: {
          value: JSON.stringify({ ...request, status: 'FAILED' }),
        },
      });

      logger.error('Data deletion failed', {
        error,
        requestId,
        userId: request.userId,
      });
    }
  }

  private async deleteUserData(userId: string): Promise<boolean> {
    // Implementation for full data deletion
    // NOTE: This should be used with extreme caution for medical data
    // Medical data often has legal retention requirements
    try {
      // This is a simplified implementation
      // In production, implement proper cascading deletion
      // with medical data retention compliance

      await this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete user data', { error, userId });
      return false;
    }
  }

  private async deleteExpiredData(userId: string): Promise<boolean> {
    // Implementation for deleting expired data based on retention policies
    try {
      const retentionPolicies = {
        conversations: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years in ms
        notifications: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year in ms
      };

      const now = new Date();

      // Delete expired conversations
      await this.prisma.conversation.updateMany({
        where: {
          userId,
          createdAt: {
            lt: new Date(now.getTime() - retentionPolicies.conversations),
          },
        },
        data: { deletedAt: new Date() },
      });

      // Delete expired notifications
      await this.prisma.notification.deleteMany({
        where: {
          userId,
          createdAt: {
            lt: new Date(now.getTime() - retentionPolicies.notifications),
          },
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete expired data', { error, userId });
      return false;
    }
  }
}
