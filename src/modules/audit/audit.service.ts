import { PrismaClient } from '../../database/generated/client';
import { logger } from '../../config/logger';
import { z } from 'zod';

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
}

export interface AuditQueryFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  page?: number;
  limit?: number;
}

const auditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string().optional(),
  oldValues: z.any().optional(),
  newValues: z.any().optional(),
});

export class AuditService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      const validatedEntry = auditLogSchema.parse(entry);

      await this.prisma.auditLog.create({
        data: {
          userId: validatedEntry.userId || null,
          userEmail: validatedEntry.userEmail || null,
          ipAddress: validatedEntry.ipAddress || null,
          userAgent: validatedEntry.userAgent || null,
          action: validatedEntry.action,
          resource: validatedEntry.resource,
          resourceId: validatedEntry.resourceId || null,
          oldValues: validatedEntry.oldValues || null,
          newValues: validatedEntry.newValues || null,
        },
      });

      logger.info('Audit log created', {
        action: entry.action,
        resource: entry.resource,
        userId: entry.userId,
        resourceId: entry.resourceId,
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : error,
        entry,
      });
      // Don't throw error to avoid breaking main operations
    }
  }

  /**
   * Get audit logs with filters and pagination
   */
  async getAuditLogs(filters: AuditQueryFilters = {}) {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      ipAddress,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (ipAddress) where.ipAddress = ipAddress;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditHistory(userId: string, page = 1, limit = 50) {
    return this.getAuditLogs({ userId, page, limit });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditHistory(resource: string, resourceId?: string, page = 1, limit = 50) {
    return this.getAuditLogs({ resource, resourceId, page, limit });
  }

  /**
   * Get recent audit activity
   */
  async getRecentActivity(hours = 24, limit = 100) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return this.getAuditLogs({
      startDate,
      limit,
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalLogs,
      actionStats,
      resourceStats,
      userStats,
    ] = await Promise.all([
      // Total logs
      this.prisma.auditLog.count({ where }),
      
      // Actions breakdown
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      
      // Resources breakdown
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } },
      }),
      
      // Top users by activity
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { 
          ...where,
          userId: { not: null }
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get user details for top users
    const userIds = userStats.map(stat => stat.userId).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    const userStatsWithDetails = userStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        userId: stat.userId,
        count: stat._count.userId,
        user,
      };
    });

    return {
      totalLogs,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count.action,
      })),
      resourceStats: resourceStats.map(stat => ({
        resource: stat.resource,
        count: stat._count.resource,
      })),
      userStats: userStatsWithDetails,
    };
  }

  /**
   * Delete old audit logs (for data retention compliance)
   */
  async deleteOldLogs(olderThanDays: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deleteResult = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('Old audit logs deleted', {
      deletedCount: deleteResult.count,
      cutoffDate,
      olderThanDays,
    });

    return deleteResult;
  }

  /**
   * Export audit logs to CSV format
   */
  async exportToCSV(filters: AuditQueryFilters = {}) {
    const { logs } = await this.getAuditLogs({ ...filters, limit: 10000 });
    
    const csvHeaders = [
      'Timestamp',
      'User Email',
      'Action',
      'Resource',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Old Values',
      'New Values',
    ];

    const csvRows = logs.map(log => [
      log.createdAt.toISOString(),
      log.userEmail || '',
      log.action,
      log.resource,
      log.resourceId || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.oldValues ? JSON.stringify(log.oldValues) : '',
      log.newValues ? JSON.stringify(log.newValues) : '',
    ]);

    return {
      headers: csvHeaders,
      rows: csvRows,
    };
  }
}

// Audit middleware helper functions
export class AuditMiddleware {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  /**
   * Log user authentication events
   */
  async logAuth(action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED', userEmail: string, ipAddress?: string, userAgent?: string, userId?: string) {
    await this.auditService.createAuditLog({
      userId,
      userEmail,
      ipAddress,
      userAgent,
      action,
      resource: 'authentication',
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(action: 'READ' | 'EXPORT', resource: string, resourceId: string, userId: string, userEmail: string, ipAddress?: string) {
    await this.auditService.createAuditLog({
      userId,
      userEmail,
      ipAddress,
      action: `DATA_${action}`,
      resource,
      resourceId,
    });
  }

  /**
   * Log data modification events
   */
  async logDataModification(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resource: string,
    resourceId: string,
    userId: string,
    userEmail: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.auditService.createAuditLog({
      userId,
      userEmail,
      ipAddress,
      userAgent,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
    });
  }

  /**
   * Log administrative actions
   */
  async logAdminAction(
    action: string,
    resource: string,
    userId: string,
    userEmail: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.auditService.createAuditLog({
      userId,
      userEmail,
      ipAddress,
      userAgent,
      action: `ADMIN_${action}`,
      resource,
      newValues: details,
    });
  }

  /**
   * Log LGPD compliance events
   */
  async logLGPDEvent(
    action: 'DATA_REQUEST' | 'DATA_EXPORT' | 'DATA_DELETION' | 'CONSENT_GIVEN' | 'CONSENT_WITHDRAWN',
    userId: string,
    userEmail: string,
    details?: any,
    ipAddress?: string
  ) {
    await this.auditService.createAuditLog({
      userId,
      userEmail,
      ipAddress,
      action: `LGPD_${action}`,
      resource: 'data_subject_rights',
      newValues: details,
    });
  }
}