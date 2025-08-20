/**
 * Accounts Payable Routes
 * Real database operations for payable management
 */

import { FastifyInstance } from 'fastify';
import { FinancialService } from '@/services/financial.service';
import {
  checkFinancialPermission,
  requireFinancialAdmin,
  validateFinancialAmounts,
} from '@/middleware/financial-auth.middleware';
import {
  CreatePayableRequest,
  UpdatePayableRequest,
  AccountsPayableFilters,
} from '@/types/financial';

export default async function payableRoutes(fastify: FastifyInstance) {
  const financialService = new FinancialService(fastify.prisma);

  // Get accounts payable with filters
  fastify.get(
    '/',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Accounts Payable'],
        summary: 'Get accounts payable',
        querystring: {
          type: 'object',
          properties: {
            supplierId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'],
            },
            categoryId: { type: 'string' },
            dueDateFrom: { type: 'string', format: 'date' },
            dueDateTo: { type: 'string', format: 'date' },
            paymentDateFrom: { type: 'string', format: 'date' },
            paymentDateTo: { type: 'string', format: 'date' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            sortBy: {
              type: 'string',
              enum: ['createdAt', 'dueDate', 'paymentDate', 'netAmount'],
              default: 'dueDate',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const filters = request.query as AccountsPayableFilters;
        const result = await financialService.getAccountsPayable(filters);

        return {
          success: true,
          data: result.data,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
          },
        };
      } catch (error) {
        request.log.error(error, 'Error fetching accounts payable');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch accounts payable',
          code: 'FETCH_PAYABLES_ERROR',
        });
      }
    },
  );

  // Get single payable
  fastify.get(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Accounts Payable'],
        summary: 'Get single payable',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const payable = await fastify.prisma.accountsPayable.findUnique({
          where: { id },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                category: true,
                contactEmail: true,
                contactPhone: true,
              },
            },
            category: {
              select: { id: true, name: true, type: true, color: true },
            },
            creator: { select: { id: true, firstName: true, lastName: true } },
          },
        });

        if (!payable) {
          return reply.status(404).send({
            success: false,
            error: 'Payable not found',
            code: 'PAYABLE_NOT_FOUND',
          });
        }

        return {
          success: true,
          data: payable,
        };
      } catch (error) {
        request.log.error(error, `Error fetching payable: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch payable',
          code: 'FETCH_PAYABLE_ERROR',
        });
      }
    },
  );

  // Create new payable
  fastify.post(
    '/',
    {
      preHandler: checkFinancialPermission('financial.payables.create'),
      schema: {
        tags: ['Accounts Payable'],
        summary: 'Create new payable',
        body: {
          type: 'object',
          properties: {
            supplierId: { type: 'string' },
            categoryId: { type: 'string' },
            documentNumber: { type: 'string', maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            grossAmount: { type: 'number', minimum: 0 },
            discountAmount: { type: 'number', minimum: 0 },
            taxAmount: { type: 'number', minimum: 0 },
            issueDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time' },
          },
          required: ['description', 'grossAmount', 'issueDate', 'dueDate'],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as CreatePayableRequest;

        // Validate financial amounts
        const validationErrors = validateFinancialAmounts(data);
        if (validationErrors.length > 0) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid financial data',
            details: validationErrors,
            code: 'VALIDATION_ERROR',
          });
        }

        // Verify supplier if provided
        if (data.supplierId) {
          const supplier = await fastify.prisma.supplier.findUnique({
            where: { id: data.supplierId },
          });

          if (!supplier) {
            return reply.status(404).send({
              success: false,
              error: 'Supplier not found',
              code: 'SUPPLIER_NOT_FOUND',
            });
          }
        }

        // Verify category if provided
        if (data.categoryId) {
          const category = await fastify.prisma.financialCategory.findUnique({
            where: { id: data.categoryId },
          });

          if (!category) {
            return reply.status(404).send({
              success: false,
              error: 'Category not found',
              code: 'CATEGORY_NOT_FOUND',
            });
          }
        }

        // Validate dates
        if (new Date(data.dueDate) < new Date(data.issueDate)) {
          return reply.status(400).send({
            success: false,
            error: 'Due date cannot be before issue date',
            code: 'INVALID_DATE_RANGE',
          });
        }

        const payable = await financialService.createAccountsPayable(
          data,
          request.user.id,
        );

        return {
          success: true,
          data: payable,
        };
      } catch (error) {
        request.log.error(error, 'Error creating payable');

        return reply.status(500).send({
          success: false,
          error: 'Failed to create payable',
          code: 'CREATE_PAYABLE_ERROR',
        });
      }
    },
  );

  // Update payable
  fastify.put(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.payables.update'),
      schema: {
        tags: ['Accounts Payable'],
        summary: 'Update payable',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'],
            },
            paymentMethod: { type: 'string' },
            paymentDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as UpdatePayableRequest;

        // Check if payable exists
        const existingPayable = await fastify.prisma.accountsPayable.findUnique(
          {
            where: { id },
          },
        );

        if (!existingPayable) {
          return reply.status(404).send({
            success: false,
            error: 'Payable not found',
            code: 'PAYABLE_NOT_FOUND',
          });
        }

        // Validate status changes
        if (data.status) {
          if (existingPayable.status === 'PAID' && data.status !== 'PAID') {
            return reply.status(400).send({
              success: false,
              error: 'Cannot change status of a paid payable',
              code: 'CANNOT_MODIFY_PAID',
            });
          }

          if (
            data.status === 'PAID' &&
            !data.paymentDate &&
            !existingPayable.paymentDate
          ) {
            return reply.status(400).send({
              success: false,
              error: 'Payment date is required when marking as paid',
              code: 'PAYMENT_DATE_REQUIRED',
            });
          }
        }

        const payable = await financialService.updateAccountsPayable(id, data);

        return {
          success: true,
          data: payable,
        };
      } catch (error) {
        request.log.error(error, `Error updating payable: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to update payable',
          code: 'UPDATE_PAYABLE_ERROR',
        });
      }
    },
  );

  // Approve payable (admin only)
  fastify.post(
    '/:id/approve',
    {
      preHandler: checkFinancialPermission('financial.payables.approve'),
      schema: {
        tags: ['Accounts Payable'],
        summary: 'Approve payable for payment',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const existingPayable = await fastify.prisma.accountsPayable.findUnique(
          {
            where: { id },
          },
        );

        if (!existingPayable) {
          return reply.status(404).send({
            success: false,
            error: 'Payable not found',
            code: 'PAYABLE_NOT_FOUND',
          });
        }

        if (existingPayable.status !== 'PENDING') {
          return reply.status(400).send({
            success: false,
            error: 'Only pending payables can be approved',
            code: 'INVALID_STATUS_FOR_APPROVAL',
          });
        }

        const payable = await financialService.updateAccountsPayable(id, {
          status: 'APPROVED',
        });

        return {
          success: true,
          data: payable,
        };
      } catch (error) {
        request.log.error(error, `Error approving payable: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to approve payable',
          code: 'APPROVE_PAYABLE_ERROR',
        });
      }
    },
  );

  // Get overdue payables
  fastify.get(
    '/overdue/list',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Accounts Payable'],
        summary: 'Get overdue payables',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { limit = 20 } = request.query as { limit?: number };

        const overduePayables = await fastify.prisma.accountsPayable.findMany({
          where: {
            status: { in: ['PENDING', 'APPROVED'] },
            dueDate: { lt: new Date() },
          },
          take: limit,
          orderBy: { dueDate: 'asc' },
          include: {
            supplier: { select: { name: true, contactEmail: true } },
            category: { select: { name: true } },
          },
        });

        // Calculate total overdue amount
        const totalOverdue = await fastify.prisma.accountsPayable.aggregate({
          _sum: { netAmount: true },
          where: {
            status: { in: ['PENDING', 'APPROVED'] },
            dueDate: { lt: new Date() },
          },
        });

        return {
          success: true,
          data: {
            payables: overduePayables,
            totalAmount: Number(totalOverdue._sum.netAmount || 0),
            count: overduePayables.length,
          },
        };
      } catch (error) {
        request.log.error(error, 'Error fetching overdue payables');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch overdue payables',
          code: 'FETCH_OVERDUE_ERROR',
        });
      }
    },
  );

  // Get upcoming payments (due in next 30 days)
  fastify.get(
    '/upcoming/list',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Accounts Payable'],
        summary: 'Get upcoming payments',
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'integer', minimum: 1, maximum: 90, default: 30 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { days = 30, limit = 20 } = request.query as {
          days?: number;
          limit?: number;
        };

        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const upcomingPayments = await fastify.prisma.accountsPayable.findMany({
          where: {
            status: { in: ['PENDING', 'APPROVED'] },
            dueDate: { gte: now, lte: futureDate },
          },
          take: limit,
          orderBy: { dueDate: 'asc' },
          include: {
            supplier: { select: { name: true, contactEmail: true } },
            category: { select: { name: true } },
          },
        });

        // Calculate total upcoming amount
        const totalUpcoming = await fastify.prisma.accountsPayable.aggregate({
          _sum: { netAmount: true },
          where: {
            status: { in: ['PENDING', 'APPROVED'] },
            dueDate: { gte: now, lte: futureDate },
          },
        });

        return {
          success: true,
          data: {
            payables: upcomingPayments,
            totalAmount: Number(totalUpcoming._sum.netAmount || 0),
            count: upcomingPayments.length,
            periodDays: days,
          },
        };
      } catch (error) {
        request.log.error(error, 'Error fetching upcoming payments');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch upcoming payments',
          code: 'FETCH_UPCOMING_ERROR',
        });
      }
    },
  );
}
