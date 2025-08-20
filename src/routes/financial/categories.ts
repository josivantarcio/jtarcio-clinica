/**
 * Financial Categories Routes
 * Real database operations for category management
 */

import { FastifyInstance } from 'fastify';
import {
  checkFinancialPermission,
  requireFinancialAdmin,
} from '@/middleware/financial-auth.middleware';
import {
  FinancialCategoryCreate,
  FinancialCategoryUpdate,
} from '@/types/financial';

export default async function categoryRoutes(fastify: FastifyInstance) {
  // Get all categories
  fastify.get(
    '/',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Financial Categories'],
        summary: 'Get financial categories',
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] },
            parentId: { type: 'string' },
            includeChildren: { type: 'boolean', default: true },
            active: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          type,
          parentId,
          includeChildren = true,
          active,
        } = request.query as any;

        const where: any = {};

        if (type) where.type = type;
        if (parentId) where.parentId = parentId;
        if (active !== undefined) where.isActive = active;

        const categories = await fastify.prisma.financialCategory.findMany({
          where,
          include: {
            parent: includeChildren
              ? { select: { id: true, name: true } }
              : false,
            children: includeChildren
              ? {
                  where:
                    active !== undefined ? { isActive: active } : undefined,
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    color: true,
                    isActive: true,
                  },
                }
              : false,
            _count: {
              select: {
                transactions: true,
                payables: true,
              },
            },
          },
          orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        });

        return {
          success: true,
          data: categories,
        };
      } catch (error) {
        request.log.error(error, 'Error fetching financial categories');

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch financial categories',
          code: 'FETCH_CATEGORIES_ERROR',
        });
      }
    },
  );

  // Get single category
  fastify.get(
    '/:id',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Financial Categories'],
        summary: 'Get single financial category',
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

        const category = await fastify.prisma.financialCategory.findUnique({
          where: { id },
          include: {
            parent: { select: { id: true, name: true, type: true } },
            children: {
              select: {
                id: true,
                name: true,
                type: true,
                color: true,
                isActive: true,
              },
            },
            _count: {
              select: {
                transactions: true,
                payables: true,
              },
            },
          },
        });

        if (!category) {
          return reply.status(404).send({
            success: false,
            error: 'Financial category not found',
            code: 'CATEGORY_NOT_FOUND',
          });
        }

        return {
          success: true,
          data: category,
        };
      } catch (error) {
        request.log.error(error, `Error fetching category: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch category',
          code: 'FETCH_CATEGORY_ERROR',
        });
      }
    },
  );

  // Create new category
  fastify.post(
    '/',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Financial Categories'],
        summary: 'Create financial category',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] },
            description: { type: 'string', maxLength: 500 },
            parentId: { type: 'string' },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            isActive: { type: 'boolean', default: true },
          },
          required: ['name', 'type'],
        },
      },
    },
    async (request, reply) => {
      try {
        const data = request.body as FinancialCategoryCreate;

        // Check if name already exists at the same level
        const existingCategory =
          await fastify.prisma.financialCategory.findFirst({
            where: {
              name: data.name,
              parentId: data.parentId || null,
            },
          });

        if (existingCategory) {
          return reply.status(400).send({
            success: false,
            error: 'Category with this name already exists at this level',
            code: 'CATEGORY_NAME_EXISTS',
          });
        }

        // Verify parent category if provided
        if (data.parentId) {
          const parentCategory =
            await fastify.prisma.financialCategory.findUnique({
              where: { id: data.parentId },
            });

          if (!parentCategory) {
            return reply.status(404).send({
              success: false,
              error: 'Parent category not found',
              code: 'PARENT_CATEGORY_NOT_FOUND',
            });
          }

          // Ensure type compatibility with parent
          if (
            parentCategory.type !== 'BOTH' &&
            data.type !== 'BOTH' &&
            parentCategory.type !== data.type
          ) {
            return reply.status(400).send({
              success: false,
              error: 'Category type must be compatible with parent category',
              code: 'INCOMPATIBLE_CATEGORY_TYPE',
            });
          }
        }

        const category = await fastify.prisma.financialCategory.create({
          data,
          include: {
            parent: { select: { id: true, name: true } },
            children: { select: { id: true, name: true } },
          },
        });

        return {
          success: true,
          data: category,
        };
      } catch (error) {
        request.log.error(error, 'Error creating financial category');

        return reply.status(500).send({
          success: false,
          error: 'Failed to create financial category',
          code: 'CREATE_CATEGORY_ERROR',
        });
      }
    },
  );

  // Update category
  fastify.put(
    '/:id',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Financial Categories'],
        summary: 'Update financial category',
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
            name: { type: 'string', minLength: 1, maxLength: 100 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] },
            description: { type: 'string', maxLength: 500 },
            parentId: { type: 'string' },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as FinancialCategoryUpdate;

        // Check if category exists
        const existingCategory =
          await fastify.prisma.financialCategory.findUnique({
            where: { id },
          });

        if (!existingCategory) {
          return reply.status(404).send({
            success: false,
            error: 'Financial category not found',
            code: 'CATEGORY_NOT_FOUND',
          });
        }

        // Check if name conflicts with existing categories
        if (data.name) {
          const nameConflict = await fastify.prisma.financialCategory.findFirst(
            {
              where: {
                name: data.name,
                parentId: data.parentId || existingCategory.parentId,
                id: { not: id },
              },
            },
          );

          if (nameConflict) {
            return reply.status(400).send({
              success: false,
              error: 'Category with this name already exists at this level',
              code: 'CATEGORY_NAME_EXISTS',
            });
          }
        }

        // Prevent setting self as parent
        if (data.parentId === id) {
          return reply.status(400).send({
            success: false,
            error: 'Category cannot be its own parent',
            code: 'INVALID_PARENT_REFERENCE',
          });
        }

        // Verify parent category if provided
        if (data.parentId) {
          const parentCategory =
            await fastify.prisma.financialCategory.findUnique({
              where: { id: data.parentId },
            });

          if (!parentCategory) {
            return reply.status(404).send({
              success: false,
              error: 'Parent category not found',
              code: 'PARENT_CATEGORY_NOT_FOUND',
            });
          }

          // Check for circular reference
          const isCircular = await checkCircularReference(
            fastify.prisma,
            data.parentId,
            id,
          );
          if (isCircular) {
            return reply.status(400).send({
              success: false,
              error: 'Cannot create circular reference in category hierarchy',
              code: 'CIRCULAR_REFERENCE',
            });
          }
        }

        const category = await fastify.prisma.financialCategory.update({
          where: { id },
          data,
          include: {
            parent: { select: { id: true, name: true } },
            children: { select: { id: true, name: true } },
          },
        });

        return {
          success: true,
          data: category,
        };
      } catch (error) {
        request.log.error(error, `Error updating category: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to update category',
          code: 'UPDATE_CATEGORY_ERROR',
        });
      }
    },
  );

  // Deactivate category (soft delete)
  fastify.delete(
    '/:id',
    {
      preHandler: requireFinancialAdmin,
      schema: {
        tags: ['Financial Categories'],
        summary: 'Deactivate financial category',
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

        // Check if category exists
        const category = await fastify.prisma.financialCategory.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                transactions: true,
                payables: true,
                children: true,
              },
            },
          },
        });

        if (!category) {
          return reply.status(404).send({
            success: false,
            error: 'Financial category not found',
            code: 'CATEGORY_NOT_FOUND',
          });
        }

        // Check if category is in use
        const hasTransactions = category._count.transactions > 0;
        const hasPayables = category._count.payables > 0;
        const hasChildren = category._count.children > 0;

        if (hasTransactions || hasPayables) {
          // Cannot delete, only deactivate
          const updatedCategory = await fastify.prisma.financialCategory.update(
            {
              where: { id },
              data: { isActive: false },
            },
          );

          return {
            success: true,
            data: updatedCategory,
            message: 'Category deactivated (in use by transactions/payables)',
          };
        }

        if (hasChildren) {
          return reply.status(400).send({
            success: false,
            error: 'Cannot delete category with child categories',
            code: 'CATEGORY_HAS_CHILDREN',
          });
        }

        // Safe to delete
        await fastify.prisma.financialCategory.delete({
          where: { id },
        });

        return {
          success: true,
          message: 'Category deleted successfully',
        };
      } catch (error) {
        request.log.error(error, `Error deleting category: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to delete category',
          code: 'DELETE_CATEGORY_ERROR',
        });
      }
    },
  );

  // Get category tree (hierarchical structure)
  fastify.get(
    '/tree/structure',
    {
      preHandler: checkFinancialPermission('financial.transactions.view'),
      schema: {
        tags: ['Financial Categories'],
        summary: 'Get category tree structure',
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] },
            activeOnly: { type: 'boolean', default: true },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { type, activeOnly = true } = request.query as any;

        const where: any = { parentId: null };
        if (type) where.type = type;
        if (activeOnly) where.isActive = true;

        const buildCategoryTree = async (
          parentId: string | null = null,
        ): Promise<any[]> => {
          const categories = await fastify.prisma.financialCategory.findMany({
            where: {
              parentId,
              ...(type && { type }),
              ...(activeOnly && { isActive: true }),
            },
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
              isActive: true,
              description: true,
            },
            orderBy: { name: 'asc' },
          });

          return Promise.all(
            categories.map(async category => ({
              ...category,
              children: await buildCategoryTree(category.id),
            })),
          );
        };

        const tree = await buildCategoryTree();

        return {
          success: true,
          data: tree,
        };
      } catch (error) {
        request.log.error(error, 'Error building category tree');

        return reply.status(500).send({
          success: false,
          error: 'Failed to build category tree',
          code: 'CATEGORY_TREE_ERROR',
        });
      }
    },
  );
}

// Helper function to check for circular references
async function checkCircularReference(
  prisma: any,
  parentId: string,
  childId: string,
): Promise<boolean> {
  let currentId = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      return true; // Circular reference detected
    }

    if (currentId === childId) {
      return true; // Direct circular reference
    }

    visited.add(currentId);

    const parent = await prisma.financialCategory.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    currentId = parent?.parentId;
  }

  return false;
}
