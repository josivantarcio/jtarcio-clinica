import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditService, AuditQueryFilters } from './audit.service';
import { PrismaClient } from '../../database/generated/client';
import { z } from 'zod';
import { paginationSchema } from '../../types/common';

const auditQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    resource: z.string().optional(),
    startDate: z
      .string()
      .datetime()
      .optional()
      .transform(val => (val ? new Date(val) : undefined)),
    endDate: z
      .string()
      .datetime()
      .optional()
      .transform(val => (val ? new Date(val) : undefined)),
    ipAddress: z.string().ip().optional(),
  })
  .merge(paginationSchema);

const userHistoryParamsSchema = z.object({
  userId: z.string().uuid(),
});

const resourceHistoryParamsSchema = z.object({
  resource: z.string().min(1),
  resourceId: z.string().optional(),
});

const statisticsQuerySchema = z.object({
  startDate: z
    .string()
    .datetime()
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .datetime()
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
});

const exportQuerySchema = auditQuerySchema.omit({ page: true, limit: true });

export class AuditController {
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
  }

  async register(fastify: FastifyInstance) {
    // Get audit logs with filters
    fastify.get(
      '/audit/logs',
      {
        schema: {
          description: 'Get audit logs with optional filters',
          tags: ['Audit'],
          security: [{ bearerAuth: [] }],
          querystring: auditQuerySchema,
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    logs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          userId: { type: 'string', nullable: true },
                          userEmail: { type: 'string', nullable: true },
                          ipAddress: { type: 'string', nullable: true },
                          userAgent: { type: 'string', nullable: true },
                          action: { type: 'string' },
                          resource: { type: 'string' },
                          resourceId: { type: 'string', nullable: true },
                          oldValues: { nullable: true },
                          newValues: { nullable: true },
                          createdAt: { type: 'string', format: 'date-time' },
                          user: {
                            type: 'object',
                            nullable: true,
                            properties: {
                              id: { type: 'string' },
                              email: { type: 'string' },
                              firstName: { type: 'string' },
                              lastName: { type: 'string' },
                              role: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'number' },
                        limit: { type: 'number' },
                        total: { type: 'number' },
                        totalPages: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // preHandler: [fastify.authenticate, fastify.requireAdmin], // Temporarily disabled for development
      },
      this.getAuditLogs.bind(this),
    );

    // Get user audit history
    fastify.get(
      '/audit/users/:userId/history',
      {
        schema: {
          description: 'Get audit history for a specific user',
          tags: ['Audit'],
          security: [{ bearerAuth: [] }],
          params: userHistoryParamsSchema,
          querystring: paginationSchema,
        },
        // preHandler: [fastify.authenticate, fastify.requireAdmin], // Temporarily disabled for development
      },
      this.getUserHistory.bind(this),
    );

    // Get resource audit history
    fastify.get(
      '/audit/resources/:resource/history',
      {
        schema: {
          description: 'Get audit history for a specific resource',
          tags: ['Audit'],
          security: [{ bearerAuth: [] }],
          params: resourceHistoryParamsSchema,
          querystring: paginationSchema.extend({
            resourceId: z.string().optional(),
          }),
        },
        // preHandler: [fastify.authenticate, fastify.requireAdmin], // Temporarily disabled for development
      },
      this.getResourceHistory.bind(this),
    );

    // Get recent activity
    fastify.get(
      '/audit/recent',
      {
        schema: {
          description: 'Get recent audit activity',
          tags: ['Audit'],
          security: [{ bearerAuth: [] }],
          querystring: z.object({
            hours: z.number().int().min(1).max(168).default(24), // Max 1 week
            limit: z.number().int().min(1).max(500).default(100),
          }),
        },
        // preHandler: [fastify.authenticate, fastify.requireAdmin], // Temporarily disabled for development
      },
      this.getRecentActivity.bind(this),
    );

    // Get audit statistics
    fastify.get(
      '/audit/statistics',
      {
        schema: {
          description: 'Get audit statistics and analytics',
          tags: ['Audit'],
          security: [{ bearerAuth: [] }],
          querystring: statisticsQuerySchema,
        },
        // preHandler: [fastify.authenticate, fastify.requireAdmin], // Temporarily disabled for development
      },
      this.getStatistics.bind(this),
    );

    // Export audit logs
    fastify.get(
      '/audit/export',
      {
        schema: {
          description: 'Export audit logs as CSV',
          tags: ['Audit'],
          security: [{ bearerAuth: [] }],
          querystring: exportQuerySchema.extend({
            format: z.enum(['csv', 'json']).default('csv'),
          }),
        },
        // preHandler: [fastify.authenticate, fastify.requireAdmin], // Temporarily disabled for development
      },
      this.exportLogs.bind(this),
    );

    // Get my audit history (for current user)
    fastify.get(
      '/audit/my-history',
      {
        schema: {
          description: 'Get audit history for the current user',
          tags: ['Audit'],
          security: [{ bearerAuth: [] }],
          querystring: paginationSchema,
        },
        preHandler: [fastify.authenticate],
      },
      this.getMyHistory.bind(this),
    );
  }

  async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = auditQuerySchema.parse(request.query);

      const filters: AuditQueryFilters = {
        userId: query.userId,
        action: query.action,
        resource: query.resource,
        startDate: query.startDate,
        endDate: query.endDate,
        ipAddress: query.ipAddress,
        page: query.page,
        limit: query.limit,
      };

      const result = await this.auditService.getAuditLogs(filters);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      request.log.error('Failed to get audit logs', { error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'AUDIT_FETCH_ERROR',
          message: 'Failed to retrieve audit logs',
        },
      });
    }
  }

  async getUserHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = userHistoryParamsSchema.parse(request.params);
      const { page, limit } = paginationSchema.parse(request.query);

      const result = await this.auditService.getUserAuditHistory(
        userId,
        page,
        limit,
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      request.log.error('Failed to get user audit history', { error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'USER_AUDIT_ERROR',
          message: 'Failed to retrieve user audit history',
        },
      });
    }
  }

  async getResourceHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = resourceHistoryParamsSchema.parse(request.params);
      const query = paginationSchema
        .extend({
          resourceId: z.string().optional(),
        })
        .parse(request.query);

      const result = await this.auditService.getResourceAuditHistory(
        params.resource,
        query.resourceId,
        query.page,
        query.limit,
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      request.log.error('Failed to get resource audit history', { error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'RESOURCE_AUDIT_ERROR',
          message: 'Failed to retrieve resource audit history',
        },
      });
    }
  }

  async getRecentActivity(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { hours, limit } = z
        .object({
          hours: z.number().int().min(1).max(168).default(24),
          limit: z.number().int().min(1).max(500).default(100),
        })
        .parse(request.query);

      const result = await this.auditService.getRecentActivity(hours, limit);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      request.log.error('Failed to get recent activity', { error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'RECENT_ACTIVITY_ERROR',
          message: 'Failed to retrieve recent activity',
        },
      });
    }
  }

  async getStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { startDate, endDate } = statisticsQuerySchema.parse(request.query);

      const result = await this.auditService.getAuditStatistics(
        startDate,
        endDate,
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      request.log.error('Failed to get audit statistics', { error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'STATISTICS_ERROR',
          message: 'Failed to retrieve audit statistics',
        },
      });
    }
  }

  async exportLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = exportQuerySchema
        .extend({
          format: z.enum(['csv', 'json']).default('csv'),
        })
        .parse(request.query);

      const filters: AuditQueryFilters = {
        userId: query.userId,
        action: query.action,
        resource: query.resource,
        startDate: query.startDate,
        endDate: query.endDate,
        ipAddress: query.ipAddress,
      };

      if (query.format === 'csv') {
        const csvData = await this.auditService.exportToCSV(filters);

        const csvContent = [
          csvData.headers.join(','),
          ...csvData.rows.map(row =>
            row
              .map(field => `"${String(field).replace(/"/g, '""')}"`)
              .join(','),
          ),
        ].join('\n');

        return reply
          .header('Content-Type', 'text/csv')
          .header(
            'Content-Disposition',
            `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
          )
          .send(csvContent);
      } else {
        const result = await this.auditService.getAuditLogs(filters);

        return reply
          .header('Content-Type', 'application/json')
          .header(
            'Content-Disposition',
            `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.json"`,
          )
          .send({
            success: true,
            data: result,
            exportedAt: new Date().toISOString(),
          });
      }
    } catch (error) {
      request.log.error('Failed to export audit logs', { error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Failed to export audit logs',
        },
      });
    }
  }

  async getMyHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).id;
      const { page, limit } = paginationSchema.parse(request.query);

      const result = await this.auditService.getUserAuditHistory(
        userId,
        page,
        limit,
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      request.log.error('Failed to get my audit history', { error });
      return reply.status(500).send({
        success: false,
        error: {
          code: 'MY_AUDIT_ERROR',
          message: 'Failed to retrieve your audit history',
        },
      });
    }
  }
}
