/**
 * Insurance Plans Routes
 * Real database operations for insurance plan management
 */

import { FastifyInstance } from 'fastify';
import {
  checkFinancialPermission,
  requireFinancialAdmin,
} from '@/middleware/financial-auth.middleware';
import { InsurancePlanCreate, InsurancePlanUpdate } from '@/types/financial';

export default async function insuranceRoutes(fastify: FastifyInstance) {
  // Get all insurance plans
  fastify.get(
    '/',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Insurance Plans'],
        summary: 'Get insurance plans',
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [
                'PRIVATE',
                'PUBLIC',
                'COOPERATIVE',
                'CORPORATE',
                'INTERNATIONAL',
              ],
            },
            active: { type: 'boolean' },
            search: { type: 'string', minLength: 2 },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          category,
          active,
          search,
          page = 1,
          limit = 50,
        } = request.query as any;

        const where: any = {};

        if (category) where.category = category;
        if (active !== undefined) where.isActive = active;
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { contactEmail: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [insurancePlans, total] = await Promise.all([
          fastify.prisma.insurancePlan.findMany({
            where,
            include: {
              _count: {
                select: {
                  transactions: true,
                },
              },
            },
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          fastify.prisma.insurancePlan.count({ where }),
        ]);

        return {
          success: true,
          data: insurancePlans,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        request.log.error(error, 'Error fetching insurance plans');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch insurance plans',
          code: 'FETCH_INSURANCE_ERROR',
        });
      }
    },
  );

  // Get single insurance plan
  fastify.get(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Insurance Plans'],
        summary: 'Get single insurance plan',
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

        const insurancePlan = await fastify.prisma.insurancePlan.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                transactions: true,
              },
            },
            transactions: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                description: true,
                netAmount: true,
                createdAt: true,
                status: true,
                patient: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        });

        if (!insurancePlan) {
          return reply.status(404).send({
            success: false,
            error: 'Insurance plan not found',
            code: 'INSURANCE_NOT_FOUND',
          });
        }

        // Get financial summary
        const totalAmounts =
          await fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            where: { insuranceId: id },
          });

        const paidAmounts = await fastify.prisma.financialTransaction.aggregate(
          {
            _sum: { netAmount: true },
            where: {
              insuranceId: id,
              status: 'PAID',
            },
          },
        );

        const pendingAmounts =
          await fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            where: {
              insuranceId: id,
              status: { in: ['PENDING', 'CONFIRMED'] },
            },
          });

        return {
          success: true,
          data: {
            ...insurancePlan,
            financialSummary: {
              totalAmount: Number(totalAmounts._sum.netAmount || 0),
              paidAmount: Number(paidAmounts._sum.netAmount || 0),
              pendingAmount: Number(pendingAmounts._sum.netAmount || 0),
            },
          },
        };
      } catch (error) {
        request.log.error(
          error,
          `Error fetching insurance plan: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch insurance plan',
          code: 'FETCH_INSURANCE_ERROR',
        });
      }
    },
  );

  // Create new insurance plan
  fastify.post(
    '/',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Insurance Plans'],
        summary: 'Create insurance plan',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            category: {
              type: 'string',
              enum: [
                'PRIVATE',
                'PUBLIC',
                'COOPERATIVE',
                'CORPORATE',
                'INTERNATIONAL',
              ],
            },
            coveragePercentage: { type: 'number', minimum: 0, maximum: 100 },
            copayAmount: { type: 'number', minimum: 0 },
            deductibleAmount: { type: 'number', minimum: 0 },
            maxCoverageAmount: { type: 'number', minimum: 0 },
            contactName: { type: 'string', maxLength: 100 },
            contactEmail: { type: 'string', format: 'email', maxLength: 100 },
            contactPhone: { type: 'string', maxLength: 20 },
            website: { type: 'string', format: 'uri', maxLength: 200 },
            notes: { type: 'string', maxLength: 1000 },
            isActive: { type: 'boolean', default: true },
          },
          required: ['name', 'code', 'category'],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as InsurancePlanCreate;

        // Check if insurance plan with same name or code already exists
        const existingPlan = await fastify.prisma.insurancePlan.findFirst({
          where: {
            OR: [
              { name: { equals: data.name, mode: 'insensitive' } },
              { code: { equals: data.code, mode: 'insensitive' } },
            ],
          },
        });

        if (existingPlan) {
          const conflictField =
            existingPlan.name.toLowerCase() === data.name.toLowerCase()
              ? 'name'
              : 'code';
          return reply.status(400).send({
            success: false,
            error: `Insurance plan with this ${conflictField} already exists`,
            code: 'INSURANCE_CONFLICT',
          });
        }

        const insurancePlan = await fastify.prisma.insurancePlan.create({
          data,
        });

        return {
          success: true,
          data: insurancePlan,
        };
      } catch (error) {
        request.log.error(error, 'Error creating insurance plan');

        return reply.status(500).send({
          success: false,
          error: 'Failed to create insurance plan',
          code: 'CREATE_INSURANCE_ERROR',
        });
      }
    },
  );

  // Update insurance plan
  fastify.put(
    '/:id',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Insurance Plans'],
        summary: 'Update insurance plan',
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
            name: { type: 'string', minLength: 1, maxLength: 200 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            category: {
              type: 'string',
              enum: [
                'PRIVATE',
                'PUBLIC',
                'COOPERATIVE',
                'CORPORATE',
                'INTERNATIONAL',
              ],
            },
            coveragePercentage: { type: 'number', minimum: 0, maximum: 100 },
            copayAmount: { type: 'number', minimum: 0 },
            deductibleAmount: { type: 'number', minimum: 0 },
            maxCoverageAmount: { type: 'number', minimum: 0 },
            contactName: { type: 'string', maxLength: 100 },
            contactEmail: { type: 'string', format: 'email', maxLength: 100 },
            contactPhone: { type: 'string', maxLength: 20 },
            website: { type: 'string', format: 'uri', maxLength: 200 },
            notes: { type: 'string', maxLength: 1000 },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as InsurancePlanUpdate;

        // Check if insurance plan exists
        const existingPlan = await fastify.prisma.insurancePlan.findUnique({
          where: { id },
        });

        if (!existingPlan) {
          return reply.status(404).send({
            success: false,
            error: 'Insurance plan not found',
            code: 'INSURANCE_NOT_FOUND',
          });
        }

        // Check for conflicts with name or code
        if (data.name || data.code) {
          const conflicts = [];
          if (data.name)
            conflicts.push({
              name: { equals: data.name, mode: 'insensitive' },
            });
          if (data.code)
            conflicts.push({
              code: { equals: data.code, mode: 'insensitive' },
            });

          const conflictPlan = await fastify.prisma.insurancePlan.findFirst({
            where: {
              OR: conflicts,
              id: { not: id },
            },
          });

          if (conflictPlan) {
            const conflictField =
              conflictPlan.name.toLowerCase() === data.name?.toLowerCase()
                ? 'name'
                : 'code';
            return reply.status(400).send({
              success: false,
              error: `Insurance plan with this ${conflictField} already exists`,
              code: 'INSURANCE_CONFLICT',
            });
          }
        }

        const insurancePlan = await fastify.prisma.insurancePlan.update({
          where: { id },
          data,
        });

        return {
          success: true,
          data: insurancePlan,
        };
      } catch (error) {
        request.log.error(
          error,
          `Error updating insurance plan: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to update insurance plan',
          code: 'UPDATE_INSURANCE_ERROR',
        });
      }
    },
  );

  // Deactivate insurance plan (soft delete)
  fastify.delete(
    '/:id',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Insurance Plans'],
        summary: 'Deactivate insurance plan',
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

        // Check if insurance plan exists
        const insurancePlan = await fastify.prisma.insurancePlan.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                transactions: true,
              },
            },
          },
        });

        if (!insurancePlan) {
          return reply.status(404).send({
            success: false,
            error: 'Insurance plan not found',
            code: 'INSURANCE_NOT_FOUND',
          });
        }

        // Check if insurance plan has associated transactions
        if (insurancePlan._count.transactions > 0) {
          // Cannot delete, only deactivate
          const updatedPlan = await fastify.prisma.insurancePlan.update({
            where: { id },
            data: { isActive: false },
          });

          return {
            success: true,
            data: updatedPlan,
            message: 'Insurance plan deactivated (has associated transactions)',
          };
        }

        // Safe to delete
        await fastify.prisma.insurancePlan.delete({
          where: { id },
        });

        return {
          success: true,
          message: 'Insurance plan deleted successfully',
        };
      } catch (error) {
        request.log.error(
          error,
          `Error deleting insurance plan: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to delete insurance plan',
          code: 'DELETE_INSURANCE_ERROR',
        });
      }
    },
  );

  // Get insurance categories summary
  fastify.get(
    '/categories/summary',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Insurance Plans'],
        summary: 'Get insurance categories summary',
      },
    },
    async (request, reply) => {
      try {
        const categorySummary = await fastify.prisma.insurancePlan.groupBy({
          by: ['category'],
          _count: true,
          where: { isActive: true },
          orderBy: { _count: { _all: 'desc' } },
        });

        // Get total amounts by category
        const categoryAmounts = await Promise.all(
          categorySummary.map(async summary => {
            const totalAmount =
              await fastify.prisma.financialTransaction.aggregate({
                _sum: { netAmount: true },
                where: {
                  insurance: {
                    category: summary.category,
                    isActive: true,
                  },
                },
              });

            const pendingAmount =
              await fastify.prisma.financialTransaction.aggregate({
                _sum: { netAmount: true },
                where: {
                  insurance: {
                    category: summary.category,
                    isActive: true,
                  },
                  status: { in: ['PENDING', 'CONFIRMED'] },
                },
              });

            return {
              category: summary.category,
              planCount: summary._count,
              totalAmount: Number(totalAmount._sum.netAmount || 0),
              pendingAmount: Number(pendingAmount._sum.netAmount || 0),
            };
          }),
        );

        return {
          success: true,
          data: categoryAmounts,
        };
      } catch (error) {
        request.log.error(error, 'Error fetching insurance categories summary');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch insurance categories summary',
          code: 'INSURANCE_CATEGORIES_ERROR',
        });
      }
    },
  );

  // Calculate insurance coverage for an amount
  fastify.post(
    '/:id/calculate-coverage',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Insurance Plans'],
        summary: 'Calculate insurance coverage for amount',
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
            totalAmount: { type: 'number', minimum: 0 },
            procedureCode: { type: 'string' },
          },
          required: ['totalAmount'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { totalAmount } = request.body as { totalAmount: number };

        const insurancePlan = await fastify.prisma.insurancePlan.findUnique({
          where: { id },
        });

        if (!insurancePlan) {
          return reply.status(404).send({
            success: false,
            error: 'Insurance plan not found',
            code: 'INSURANCE_NOT_FOUND',
          });
        }

        if (!insurancePlan.isActive) {
          return reply.status(400).send({
            success: false,
            error: 'Insurance plan is inactive',
            code: 'INSURANCE_INACTIVE',
          });
        }

        // Calculate coverage
        const coveragePercentage =
          Number(insurancePlan.coveragePercentage || 0) / 100;
        const copayAmount = Number(insurancePlan.copayAmount || 0);
        const deductibleAmount = Number(insurancePlan.deductibleAmount || 0);
        const maxCoverage = Number(insurancePlan.maxCoverageAmount || 0);

        // Apply deductible first
        const amountAfterDeductible = Math.max(
          0,
          totalAmount - deductibleAmount,
        );

        // Calculate covered amount
        let coveredAmount = amountAfterDeductible * coveragePercentage;

        // Apply maximum coverage limit
        if (maxCoverage > 0) {
          coveredAmount = Math.min(coveredAmount, maxCoverage);
        }

        // Calculate patient responsibility
        const patientAmount = totalAmount - coveredAmount + copayAmount;
        const insuranceAmount = coveredAmount - copayAmount;

        return {
          success: true,
          data: {
            totalAmount,
            insuranceAmount: Math.max(0, insuranceAmount),
            patientAmount: Math.max(0, patientAmount),
            copayAmount,
            deductibleAmount,
            coveragePercentage: Number(insurancePlan.coveragePercentage || 0),
            calculation: {
              originalAmount: totalAmount,
              deductibleApplied: deductibleAmount,
              amountAfterDeductible,
              coveragePercentage: coveragePercentage * 100,
              rawCoveredAmount: amountAfterDeductible * coveragePercentage,
              maxCoverageLimit: maxCoverage,
              finalCoveredAmount: coveredAmount,
              copayAmount,
              patientResponsibility: patientAmount,
            },
          },
        };
      } catch (error) {
        request.log.error(
          error,
          `Error calculating insurance coverage: ${request.params}`,
        );

        return reply.status(500).send({
          success: false,
          error: 'Failed to calculate insurance coverage',
          code: 'CALCULATE_COVERAGE_ERROR',
        });
      }
    },
  );
}
