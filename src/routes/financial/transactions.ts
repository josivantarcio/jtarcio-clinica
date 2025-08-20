/**
 * Financial Transactions Routes
 * Real database operations for transaction management
 */

import { FastifyInstance } from 'fastify';
import { FinancialService } from '@/services/financial.service';
import {
  checkFinancialPermission,
  applyFinancialDataFilter,
  validateFinancialAmounts,
} from '@/middleware/financial-auth.middleware';
import {
  CreateTransactionRequest,
  UpdateTransactionRequest,
  FinancialTransactionFilters,
} from '@/types/financial';

export default async function transactionRoutes(fastify: FastifyInstance) {
  const financialService = new FinancialService(fastify.prisma);

  // Get transactions with filters
  fastify.get(
    '/',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Financial Transactions'],
        summary: 'Get financial transactions',
        querystring: {
          type: 'object',
          properties: {
            patientId: { type: 'string' },
            doctorId: { type: 'string' },
            status: {
              type: 'string',
              enum: [
                'PENDING',
                'CONFIRMED',
                'PAID',
                'PARTIAL',
                'CANCELLED',
                'REFUNDED',
              ],
            },
            transactionType: {
              type: 'string',
              enum: ['RECEIPT', 'PAYMENT', 'TRANSFER'],
            },
            paymentMethod: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
            dueDateFrom: { type: 'string', format: 'date' },
            dueDateTo: { type: 'string', format: 'date' },
            categoryId: { type: 'string' },
            insuranceId: { type: 'string' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            sortBy: {
              type: 'string',
              enum: ['createdAt', 'dueDate', 'paymentDate', 'netAmount'],
              default: 'createdAt',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const filters = request.query as FinancialTransactionFilters;
        const filteredQuery = applyFinancialDataFilter(request, filters);

        const result = await financialService.getTransactions(filteredQuery);

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
        request.log.error(error, 'Error fetching financial transactions');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch financial transactions',
          code: 'FETCH_TRANSACTIONS_ERROR',
        });
      }
    },
  );

  // Get single transaction
  fastify.get(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Financial Transactions'],
        summary: 'Get single financial transaction',
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

        const transaction =
          await fastify.prisma.financialTransaction.findUnique({
            where: { id },
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              doctor: { select: { id: true, firstName: true, lastName: true } },
              appointment: { select: { id: true, scheduledAt: true } },
              insurance: { select: { id: true, name: true } },
              category: { select: { id: true, name: true, type: true } },
            },
          });

        if (!transaction) {
          return reply.status(404).send({
            success: false,
            error: 'Financial transaction not found',
            code: 'TRANSACTION_NOT_FOUND',
          });
        }

        // Apply data filtering based on user role
        const filters = applyFinancialDataFilter(request, {});
        if (filters.doctorId && transaction.doctorId !== filters.doctorId) {
          return reply.status(403).send({
            success: false,
            error: 'Access denied to this transaction',
            code: 'ACCESS_DENIED',
          });
        }

        return {
          success: true,
          data: transaction,
        };
      } catch (error) {
        request.log.error(
          error,
          `Error fetching transaction: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch transaction',
          code: 'FETCH_TRANSACTION_ERROR',
        });
      }
    },
  );

  // Create new transaction
  fastify.post(
    '/',
    {
      preHandler: checkFinancialPermission('financial.transactions.create'),
      schema: {
        tags: ['Financial Transactions'],
        summary: 'Create new financial transaction',
        body: {
          type: 'object',
          properties: {
            appointmentId: { type: 'string' },
            patientId: { type: 'string' },
            doctorId: { type: 'string' },
            transactionType: {
              type: 'string',
              enum: ['RECEIPT', 'PAYMENT', 'TRANSFER'],
            },
            categoryId: { type: 'string' },
            grossAmount: { type: 'number', minimum: 0 },
            discountAmount: { type: 'number', minimum: 0 },
            taxAmount: { type: 'number', minimum: 0 },
            paymentMethod: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            installments: { type: 'integer', minimum: 1 },
            insuranceId: { type: 'string' },
            insuranceAuth: { type: 'string' },
            description: { type: 'string', maxLength: 500 },
            notes: { type: 'string', maxLength: 1000 },
          },
          required: ['patientId', 'transactionType', 'grossAmount'],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as CreateTransactionRequest;

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

        // Verify patient exists
        const patient = await fastify.prisma.user.findUnique({
          where: { id: data.patientId, role: 'PATIENT' },
        });

        if (!patient) {
          return reply.status(404).send({
            success: false,
            error: 'Patient not found',
            code: 'PATIENT_NOT_FOUND',
          });
        }

        // Verify appointment if provided
        if (data.appointmentId) {
          const appointment = await fastify.prisma.appointment.findUnique({
            where: { id: data.appointmentId },
          });

          if (!appointment) {
            return reply.status(404).send({
              success: false,
              error: 'Appointment not found',
              code: 'APPOINTMENT_NOT_FOUND',
            });
          }

          if (appointment.patientId !== data.patientId) {
            return reply.status(400).send({
              success: false,
              error: 'Appointment does not belong to the specified patient',
              code: 'APPOINTMENT_PATIENT_MISMATCH',
            });
          }
        }

        const transaction = await financialService.createTransaction(
          data,
          request.user.id,
        );

        return {
          success: true,
          data: transaction,
        };
      } catch (error) {
        request.log.error(error, 'Error creating financial transaction');

        return reply.status(500).send({
          success: false,
          error: 'Failed to create financial transaction',
          code: 'CREATE_TRANSACTION_ERROR',
        });
      }
    },
  );

  // Update transaction
  fastify.put(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.transactions.update'),
      schema: {
        tags: ['Financial Transactions'],
        summary: 'Update financial transaction',
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
              enum: [
                'PENDING',
                'CONFIRMED',
                'PAID',
                'PARTIAL',
                'CANCELLED',
                'REFUNDED',
              ],
            },
            paymentMethod: { type: 'string' },
            paymentDate: { type: 'string', format: 'date-time' },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as UpdateTransactionRequest;

        // Check if transaction exists
        const existingTransaction =
          await fastify.prisma.financialTransaction.findUnique({
            where: { id },
          });

        if (!existingTransaction) {
          return reply.status(404).send({
            success: false,
            error: 'Financial transaction not found',
            code: 'TRANSACTION_NOT_FOUND',
          });
        }

        // Apply role-based filtering
        const filters = applyFinancialDataFilter(request, {});
        if (
          filters.doctorId &&
          existingTransaction.doctorId !== filters.doctorId
        ) {
          return reply.status(403).send({
            success: false,
            error: 'Access denied to modify this transaction',
            code: 'ACCESS_DENIED',
          });
        }

        const transaction = await financialService.updateTransaction(id, data);

        return {
          success: true,
          data: transaction,
        };
      } catch (error) {
        request.log.error(
          error,
          `Error updating transaction: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to update transaction',
          code: 'UPDATE_TRANSACTION_ERROR',
        });
      }
    },
  );

  // Delete transaction (soft delete by marking as CANCELLED)
  fastify.delete(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.transactions.delete'),
      schema: {
        tags: ['Financial Transactions'],
        summary: 'Cancel financial transaction',
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

        // Check if transaction exists and is not already cancelled
        const existingTransaction =
          await fastify.prisma.financialTransaction.findUnique({
            where: { id },
          });

        if (!existingTransaction) {
          return reply.status(404).send({
            success: false,
            error: 'Financial transaction not found',
            code: 'TRANSACTION_NOT_FOUND',
          });
        }

        if (existingTransaction.status === 'CANCELLED') {
          return reply.status(400).send({
            success: false,
            error: 'Transaction is already cancelled',
            code: 'ALREADY_CANCELLED',
          });
        }

        if (existingTransaction.status === 'PAID') {
          return reply.status(400).send({
            success: false,
            error: 'Cannot cancel a paid transaction',
            code: 'CANNOT_CANCEL_PAID',
          });
        }

        const transaction = await financialService.updateTransaction(id, {
          status: 'CANCELLED',
          notes: 'Transaction cancelled by user',
        });

        return {
          success: true,
          data: transaction,
        };
      } catch (error) {
        request.log.error(
          error,
          `Error cancelling transaction: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to cancel transaction',
          code: 'CANCEL_TRANSACTION_ERROR',
        });
      }
    },
  );
}
