/**
 * Accounts Receivable Routes
 * Real database operations for receivable management
 */

import { FastifyInstance } from 'fastify';
import {
  checkFinancialPermission,
  applyFinancialDataFilter,
} from '@/middleware/financial-auth.middleware';

export default async function receivableRoutes(fastify: FastifyInstance) {
  // Get receivables (pending/confirmed transactions)
  fastify.get(
    '/',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Accounts Receivable'],
        summary: 'Get accounts receivable',
        querystring: {
          type: 'object',
          properties: {
            patientId: { type: 'string' },
            doctorId: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED'] },
            dueDateFrom: { type: 'string', format: 'date' },
            dueDateTo: { type: 'string', format: 'date' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            sortBy: {
              type: 'string',
              enum: ['createdAt', 'dueDate', 'netAmount'],
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
        const query = request.query as any;
        const {
          page = 1,
          limit = 50,
          sortBy = 'dueDate',
          sortOrder = 'asc',
          ...filters
        } = query;

        // Apply role-based data filtering
        const filteredQuery = applyFinancialDataFilter(request, filters);

        const where: any = {
          transactionType: 'RECEIPT',
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...filteredQuery,
        };

        // Date filters
        if (filters.dueDateFrom || filters.dueDateTo) {
          where.dueDate = {};
          if (filters.dueDateFrom)
            where.dueDate.gte = new Date(filters.dueDateFrom);
          if (filters.dueDateTo)
            where.dueDate.lte = new Date(filters.dueDateTo);
        }

        const [receivables, total] = await Promise.all([
          fastify.prisma.financialTransaction.findMany({
            where,
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              doctor: { select: { id: true, firstName: true, lastName: true } },
              appointment: { select: { id: true, scheduledAt: true } },
              insurance: { select: { id: true, name: true } },
              category: { select: { id: true, name: true, type: true } },
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
          }),
          fastify.prisma.financialTransaction.count({ where }),
        ]);

        return {
          success: true,
          data: receivables,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        request.log.error(error, 'Error fetching accounts receivable');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch accounts receivable',
          code: 'FETCH_RECEIVABLES_ERROR',
        });
      }
    },
  );

  // Get overdue receivables
  fastify.get(
    '/overdue',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Accounts Receivable'],
        summary: 'Get overdue receivables',
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

        // Apply role-based data filtering
        const filters = applyFinancialDataFilter(request, {});

        const overdueReceivables =
          await fastify.prisma.financialTransaction.findMany({
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PENDING', 'CONFIRMED'] },
              dueDate: { lt: new Date() },
              ...filters,
            },
            take: limit,
            orderBy: { dueDate: 'asc' },
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              doctor: { select: { id: true, firstName: true, lastName: true } },
              appointment: { select: { id: true, scheduledAt: true } },
            },
          });

        // Calculate total overdue amount
        const totalOverdue =
          await fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PENDING', 'CONFIRMED'] },
              dueDate: { lt: new Date() },
              ...filters,
            },
          });

        // Group by days overdue
        const now = new Date();
        const groupedByOverdue = {
          '1-30': { count: 0, amount: 0 },
          '31-60': { count: 0, amount: 0 },
          '61-90': { count: 0, amount: 0 },
          '90+': { count: 0, amount: 0 },
        };

        overdueReceivables.forEach(receivable => {
          if (!receivable.dueDate) return;

          const daysOverdue = Math.floor(
            (now.getTime() - receivable.dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          const amount = Number(receivable.netAmount || 0);

          if (daysOverdue <= 30) {
            groupedByOverdue['1-30'].count++;
            groupedByOverdue['1-30'].amount += amount;
          } else if (daysOverdue <= 60) {
            groupedByOverdue['31-60'].count++;
            groupedByOverdue['31-60'].amount += amount;
          } else if (daysOverdue <= 90) {
            groupedByOverdue['61-90'].count++;
            groupedByOverdue['61-90'].amount += amount;
          } else {
            groupedByOverdue['90+'].count++;
            groupedByOverdue['90+'].amount += amount;
          }
        });

        return {
          success: true,
          data: {
            receivables: overdueReceivables,
            totalAmount: Number(totalOverdue._sum.netAmount || 0),
            count: overdueReceivables.length,
            ageAnalysis: groupedByOverdue,
          },
        };
      } catch (error) {
        request.log.error(error, 'Error fetching overdue receivables');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch overdue receivables',
          code: 'FETCH_OVERDUE_RECEIVABLES_ERROR',
        });
      }
    },
  );

  // Get receivable summary by patient
  fastify.get(
    '/by-patient',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Accounts Receivable'],
        summary: 'Get receivables grouped by patient',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { limit = 50 } = request.query as { limit?: number };

        // Apply role-based data filtering
        const filters = applyFinancialDataFilter(request, {});

        // Get receivables grouped by patient
        const receivablesByPatient =
          await fastify.prisma.financialTransaction.groupBy({
            by: ['patientId'],
            _sum: { netAmount: true },
            _count: true,
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PENDING', 'CONFIRMED'] },
              ...filters,
            },
            orderBy: { _sum: { netAmount: 'desc' } },
            take: limit,
          });

        // Get patient details for each group
        const patientIds = receivablesByPatient
          .map(r => r.patientId)
          .filter(Boolean) as string[];
        const patients = await fastify.prisma.user.findMany({
          where: {
            id: { in: patientIds },
            role: 'PATIENT',
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        });

        const result = receivablesByPatient.map(group => {
          const patient = patients.find(p => p.id === group.patientId);
          return {
            patient,
            totalAmount: Number(group._sum.netAmount || 0),
            transactionCount: group._count,
            patientId: group.patientId,
          };
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        request.log.error(error, 'Error fetching receivables by patient');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch receivables by patient',
          code: 'FETCH_RECEIVABLES_BY_PATIENT_ERROR',
        });
      }
    },
  );

  // Get aging analysis
  fastify.get(
    '/aging-analysis',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Accounts Receivable'],
        summary: 'Get receivables aging analysis',
      },
    },
    async (request, reply) => {
      try {
        // Apply role-based data filtering
        const filters = applyFinancialDataFilter(request, {});

        const now = new Date();
        const ranges = [
          { name: 'Current', min: 0, max: 0 },
          { name: '1-30 days', min: 1, max: 30 },
          { name: '31-60 days', min: 31, max: 60 },
          { name: '61-90 days', min: 61, max: 90 },
          { name: '90+ days', min: 91, max: 999999 },
        ];

        const agingData = await Promise.all(
          ranges.map(async range => {
            let dateFilter: any;

            if (range.name === 'Current') {
              dateFilter = { gte: now };
            } else {
              const minDate = new Date(
                now.getTime() - range.max * 24 * 60 * 60 * 1000,
              );
              const maxDate = new Date(
                now.getTime() - range.min * 24 * 60 * 60 * 1000,
              );
              dateFilter = { gte: minDate, lt: maxDate };
            }

            const result = await fastify.prisma.financialTransaction.aggregate({
              _sum: { netAmount: true },
              _count: true,
              where: {
                transactionType: 'RECEIPT',
                status: { in: ['PENDING', 'CONFIRMED'] },
                dueDate: dateFilter,
                ...filters,
              },
            });

            return {
              range: range.name,
              amount: Number(result._sum.netAmount || 0),
              count: result._count,
            };
          }),
        );

        const totalAmount = agingData.reduce(
          (sum, item) => sum + item.amount,
          0,
        );

        const agingWithPercentages = agingData.map(item => ({
          ...item,
          percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
        }));

        return {
          success: true,
          data: {
            agingBuckets: agingWithPercentages,
            totalAmount,
            totalCount: agingData.reduce((sum, item) => sum + item.count, 0),
          },
        };
      } catch (error) {
        request.log.error(error, 'Error generating aging analysis');

        return reply.status(500).send({
          success: false,
          error: 'Failed to generate aging analysis',
          code: 'AGING_ANALYSIS_ERROR',
        });
      }
    },
  );

  // Mark receivable as paid (update transaction status)
  fastify.post(
    '/:id/mark-paid',
    {
      preHandler: checkFinancialPermission('financial.transactions.update'),
      schema: {
        tags: ['Accounts Receivable'],
        summary: 'Mark receivable as paid',
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
            paymentDate: { type: 'string', format: 'date-time' },
            paymentMethod: { type: 'string' },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { paymentDate, paymentMethod, notes } = request.body as any;

        // Check if transaction exists and is a receivable
        const transaction =
          await fastify.prisma.financialTransaction.findUnique({
            where: { id },
          });

        if (!transaction) {
          return reply.status(404).send({
            success: false,
            error: 'Transaction not found',
            code: 'TRANSACTION_NOT_FOUND',
          });
        }

        if (transaction.transactionType !== 'RECEIPT') {
          return reply.status(400).send({
            success: false,
            error: 'Transaction is not a receivable',
            code: 'NOT_A_RECEIVABLE',
          });
        }

        if (transaction.status === 'PAID') {
          return reply.status(400).send({
            success: false,
            error: 'Transaction is already marked as paid',
            code: 'ALREADY_PAID',
          });
        }

        // Apply role-based filtering
        const filters = applyFinancialDataFilter(request, {});
        if (filters.doctorId && transaction.doctorId !== filters.doctorId) {
          return reply.status(403).send({
            success: false,
            error: 'Access denied to modify this transaction',
            code: 'ACCESS_DENIED',
          });
        }

        const updatedTransaction =
          await fastify.prisma.financialTransaction.update({
            where: { id },
            data: {
              status: 'PAID',
              paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
              paymentMethod,
              notes: notes
                ? `${transaction.notes || ''}\n\n${notes}`.trim()
                : transaction.notes,
            },
            include: {
              patient: {
                select: { firstName: true, lastName: true, email: true },
              },
              appointment: { select: { id: true } },
            },
          });

        // Update appointment payment status if linked
        if (transaction.appointmentId) {
          await fastify.prisma.appointment.update({
            where: { id: transaction.appointmentId },
            data: { paymentStatus: 'PAID' },
          });
        }

        return {
          success: true,
          data: updatedTransaction,
        };
      } catch (error) {
        request.log.error(
          error,
          `Error marking receivable as paid: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to mark receivable as paid',
          code: 'MARK_PAID_ERROR',
        });
      }
    },
  );
}
