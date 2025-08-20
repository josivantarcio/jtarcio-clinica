/**
 * Financial Module Routes
 * Main entry point for all financial API endpoints
 */

import { FastifyInstance } from 'fastify';
import { requireFinancialAccess } from '@/middleware/financial-auth.middleware';

export default async function financialRoutes(fastify: FastifyInstance) {
  // Health check endpoint (public - no authentication required)
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Financial'],
        summary: 'Financial module health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              module: { type: 'string' },
              timestamp: { type: 'string' },
              database: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Test database connection - simplified to avoid prisma issues
      let dbStatus = 'connected';
      try {
        // Simple test without specific model
        await fastify.prisma?.$connect();
      } catch (error) {
        dbStatus = 'error';
        console.log('Database connection error:', error);
      }

      return {
        status: 'ok',
        module: 'financial',
        timestamp: new Date().toISOString(),
        database: dbStatus,
      };
    },
  );

  // Add authentication middleware to protected financial routes
  await fastify.register(async function protectedRoutes(
    fastify: FastifyInstance,
  ) {
    fastify.addHook('preHandler', requireFinancialAccess);

    // Register sub-routes with authentication
    await fastify.register(import('./dashboard-simple'), { prefix: '/dashboard' });
    // TODO: Re-enable other routes after testing
    // await fastify.register(import('./transactions'), {
    //   prefix: '/transactions',
    // });
    // await fastify.register(import('./receivables'), { prefix: '/receivables' });
    // await fastify.register(import('./payables'), { prefix: '/payables' });
    // await fastify.register(import('./insurance'), { prefix: '/insurance' });
    // await fastify.register(import('./suppliers'), { prefix: '/suppliers' });
    // await fastify.register(import('./categories'), { prefix: '/categories' });
    // await fastify.register(import('./reports'), { prefix: '/reports' });
  });
}
