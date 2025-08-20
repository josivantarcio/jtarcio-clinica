/**
 * Suppliers Routes
 * Real database operations for supplier management
 */

import { FastifyInstance } from 'fastify';
import {
  checkFinancialPermission,
  requireFinancialAdmin,
} from '@/middleware/financial-auth.middleware';
import { SupplierCreate, SupplierUpdate } from '@/types/financial';

export default async function supplierRoutes(fastify: FastifyInstance) {
  // Get all suppliers
  fastify.get(
    '/',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Suppliers'],
        summary: 'Get suppliers',
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [
                'MEDICAL_SUPPLIES',
                'PHARMACEUTICAL',
                'EQUIPMENT',
                'SERVICES',
                'UTILITIES',
                'OTHER',
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
            { contactEmail: { contains: search, mode: 'insensitive' } },
            { documentNumber: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [suppliers, total] = await Promise.all([
          fastify.prisma.supplier.findMany({
            where,
            include: {
              _count: {
                select: {
                  payables: true,
                },
              },
            },
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          fastify.prisma.supplier.count({ where }),
        ]);

        return {
          success: true,
          data: suppliers,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        request.log.error(error, 'Error fetching suppliers');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch suppliers',
          code: 'FETCH_SUPPLIERS_ERROR',
        });
      }
    },
  );

  // Get single supplier
  fastify.get(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Suppliers'],
        summary: 'Get single supplier',
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

        const supplier = await fastify.prisma.supplier.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                payables: true,
              },
            },
            payables: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                description: true,
                netAmount: true,
                dueDate: true,
                status: true,
              },
            },
          },
        });

        if (!supplier) {
          return reply.status(404).send({
            success: false,
            error: 'Supplier not found',
            code: 'SUPPLIER_NOT_FOUND',
          });
        }

        // Get total amounts
        const totalAmounts = await fastify.prisma.accountsPayable.aggregate({
          _sum: { netAmount: true },
          where: { supplierId: id },
        });

        const paidAmounts = await fastify.prisma.accountsPayable.aggregate({
          _sum: { netAmount: true },
          where: {
            supplierId: id,
            status: 'PAID',
          },
        });

        const pendingAmounts = await fastify.prisma.accountsPayable.aggregate({
          _sum: { netAmount: true },
          where: {
            supplierId: id,
            status: { in: ['PENDING', 'APPROVED'] },
          },
        });

        return {
          success: true,
          data: {
            ...supplier,
            financialSummary: {
              totalAmount: Number(totalAmounts._sum.netAmount || 0),
              paidAmount: Number(paidAmounts._sum.netAmount || 0),
              pendingAmount: Number(pendingAmounts._sum.netAmount || 0),
            },
          },
        };
      } catch (error) {
        request.log.error(error, `Error fetching supplier: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch supplier',
          code: 'FETCH_SUPPLIER_ERROR',
        });
      }
    },
  );

  // Create new supplier
  fastify.post(
    '/',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Suppliers'],
        summary: 'Create supplier',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            category: {
              type: 'string',
              enum: [
                'MEDICAL_SUPPLIES',
                'PHARMACEUTICAL',
                'EQUIPMENT',
                'SERVICES',
                'UTILITIES',
                'OTHER',
              ],
            },
            documentNumber: { type: 'string', maxLength: 50 },
            contactName: { type: 'string', maxLength: 100 },
            contactEmail: { type: 'string', format: 'email', maxLength: 100 },
            contactPhone: { type: 'string', maxLength: 20 },
            address: { type: 'string', maxLength: 500 },
            website: { type: 'string', format: 'uri', maxLength: 200 },
            notes: { type: 'string', maxLength: 1000 },
            isActive: { type: 'boolean', default: true },
          },
          required: ['name', 'category'],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as SupplierCreate;

        // Check if supplier with same name already exists
        const existingSupplier = await fastify.prisma.supplier.findFirst({
          where: { name: { equals: data.name, mode: 'insensitive' } },
        });

        if (existingSupplier) {
          return reply.status(400).send({
            success: false,
            error: 'Supplier with this name already exists',
            code: 'SUPPLIER_NAME_EXISTS',
          });
        }

        // Check if document number already exists (if provided)
        if (data.documentNumber) {
          const existingDocument = await fastify.prisma.supplier.findFirst({
            where: { documentNumber: data.documentNumber },
          });

          if (existingDocument) {
            return reply.status(400).send({
              success: false,
              error: 'Supplier with this document number already exists',
              code: 'SUPPLIER_DOCUMENT_EXISTS',
            });
          }
        }

        const supplier = await fastify.prisma.supplier.create({
          data,
        });

        return {
          success: true,
          data: supplier,
        };
      } catch (error) {
        request.log.error(error, 'Error creating supplier');

        return reply.status(500).send({
          success: false,
          error: 'Failed to create supplier',
          code: 'CREATE_SUPPLIER_ERROR',
        });
      }
    },
  );

  // Update supplier
  fastify.put(
    '/:id',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Suppliers'],
        summary: 'Update supplier',
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
            category: {
              type: 'string',
              enum: [
                'MEDICAL_SUPPLIES',
                'PHARMACEUTICAL',
                'EQUIPMENT',
                'SERVICES',
                'UTILITIES',
                'OTHER',
              ],
            },
            documentNumber: { type: 'string', maxLength: 50 },
            contactName: { type: 'string', maxLength: 100 },
            contactEmail: { type: 'string', format: 'email', maxLength: 100 },
            contactPhone: { type: 'string', maxLength: 20 },
            address: { type: 'string', maxLength: 500 },
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
        const data = request.body as SupplierUpdate;

        // Check if supplier exists
        const existingSupplier = await fastify.prisma.supplier.findUnique({
          where: { id },
        });

        if (!existingSupplier) {
          return reply.status(404).send({
            success: false,
            error: 'Supplier not found',
            code: 'SUPPLIER_NOT_FOUND',
          });
        }

        // Check name conflicts
        if (data.name) {
          const nameConflict = await fastify.prisma.supplier.findFirst({
            where: {
              name: { equals: data.name, mode: 'insensitive' },
              id: { not: id },
            },
          });

          if (nameConflict) {
            return reply.status(400).send({
              success: false,
              error: 'Supplier with this name already exists',
              code: 'SUPPLIER_NAME_EXISTS',
            });
          }
        }

        // Check document number conflicts
        if (data.documentNumber) {
          const documentConflict = await fastify.prisma.supplier.findFirst({
            where: {
              documentNumber: data.documentNumber,
              id: { not: id },
            },
          });

          if (documentConflict) {
            return reply.status(400).send({
              success: false,
              error: 'Supplier with this document number already exists',
              code: 'SUPPLIER_DOCUMENT_EXISTS',
            });
          }
        }

        const supplier = await fastify.prisma.supplier.update({
          where: { id },
          data,
        });

        return {
          success: true,
          data: supplier,
        };
      } catch (error) {
        request.log.error(error, `Error updating supplier: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to update supplier',
          code: 'UPDATE_SUPPLIER_ERROR',
        });
      }
    },
  );

  // Deactivate supplier (soft delete)
  fastify.delete(
    '/:id',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Suppliers'],
        summary: 'Deactivate supplier',
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

        // Check if supplier exists
        const supplier = await fastify.prisma.supplier.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                payables: true,
              },
            },
          },
        });

        if (!supplier) {
          return reply.status(404).send({
            success: false,
            error: 'Supplier not found',
            code: 'SUPPLIER_NOT_FOUND',
          });
        }

        // Check if supplier has associated payables
        if (supplier._count.payables > 0) {
          // Cannot delete, only deactivate
          const updatedSupplier = await fastify.prisma.supplier.update({
            where: { id },
            data: { isActive: false },
          });

          return {
            success: true,
            data: updatedSupplier,
            message: 'Supplier deactivated (has associated payables)',
          };
        }

        // Safe to delete
        await fastify.prisma.supplier.delete({
          where: { id },
        });

        return {
          success: true,
          message: 'Supplier deleted successfully',
        };
      } catch (error) {
        request.log.error(error, `Error deleting supplier: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to delete supplier',
          code: 'DELETE_SUPPLIER_ERROR',
        });
      }
    },
  );

  // Get supplier categories summary
  fastify.get(
    '/categories/summary',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Suppliers'],
        summary: 'Get supplier categories summary',
      },
    },
    async (request, reply) => {
      try {
        const categorySummary = await fastify.prisma.supplier.groupBy({
          by: ['category'],
          _count: true,
          where: { isActive: true },
          orderBy: { _count: { _all: 'desc' } },
        });

        // Get total amounts by category
        const categoryAmounts = await Promise.all(
          categorySummary.map(async summary => {
            const totalAmount = await fastify.prisma.accountsPayable.aggregate({
              _sum: { netAmount: true },
              where: {
                supplier: {
                  category: summary.category,
                  isActive: true,
                },
              },
            });

            const pendingAmount =
              await fastify.prisma.accountsPayable.aggregate({
                _sum: { netAmount: true },
                where: {
                  supplier: {
                    category: summary.category,
                    isActive: true,
                  },
                  status: { in: ['PENDING', 'APPROVED'] },
                },
              });

            return {
              category: summary.category,
              supplierCount: summary._count,
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
        request.log.error(error, 'Error fetching supplier categories summary');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch supplier categories summary',
          code: 'SUPPLIER_CATEGORIES_ERROR',
        });
      }
    },
  );

  // Get top suppliers by transaction volume
  fastify.get(
    '/top-suppliers',
    {
      preHandler: checkFinancialPermission('financial.payables.view'),
      schema: {
        tags: ['Suppliers'],
        summary: 'Get top suppliers by transaction volume',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 5, maximum: 50, default: 10 },
            period: {
              type: 'string',
              enum: ['month', 'quarter', 'year'],
              default: 'year',
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { limit = 10, period = 'year' } = request.query as any;

        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
          default:
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }

        const topSuppliers = await fastify.prisma.accountsPayable.groupBy({
          by: ['supplierId'],
          _sum: { netAmount: true },
          _count: true,
          where: {
            supplierId: { not: null },
            createdAt: { gte: startDate },
            supplier: { isActive: true },
          },
          orderBy: { _sum: { netAmount: 'desc' } },
          take: limit,
        });

        // Get supplier details
        const supplierIds = topSuppliers
          .map(s => s.supplierId)
          .filter(Boolean) as string[];
        const suppliers = await fastify.prisma.supplier.findMany({
          where: { id: { in: supplierIds } },
          select: {
            id: true,
            name: true,
            category: true,
            contactEmail: true,
          },
        });

        const result = topSuppliers.map(summary => {
          const supplier = suppliers.find(s => s.id === summary.supplierId);
          return {
            supplier,
            totalAmount: Number(summary._sum.netAmount || 0),
            transactionCount: summary._count,
            period,
          };
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        request.log.error(error, 'Error fetching top suppliers');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch top suppliers',
          code: 'TOP_SUPPLIERS_ERROR',
        });
      }
    },
  );
}
