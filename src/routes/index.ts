import { FastifyInstance } from 'fastify';
import { env } from '@/config/env';

// Import route modules
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { appointmentRoutes } from './appointments';
import { specialtyRoutes } from './specialties';
import { availabilityRoutes } from './availability';
import aiChatRoutes from './ai-chat';
import { auditRoutes } from './audit';
import { analyticsRoutes } from './analytics';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  const apiPrefix = `/api/${env.API_VERSION}`;

  // Register all route modules
  await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` });
  await fastify.register(userRoutes, { prefix: `${apiPrefix}/users` });
  // await fastify.register(userRoutes, { prefix: `${apiPrefix}` }); // For /doctors endpoint - temporarily disabled
  await fastify.register(appointmentRoutes, {
    prefix: `${apiPrefix}/appointments`,
  });
  await fastify.register(specialtyRoutes, {
    prefix: `${apiPrefix}/specialties`,
  });
  await fastify.register(availabilityRoutes, {
    prefix: `${apiPrefix}/availability`,
  });
  // await fastify.register(aiChatRoutes, { prefix: apiPrefix }); // Temporarily disabled due to ChromaDB issue
  // await fastify.register(auditRoutes, { prefix: apiPrefix }); // Temporarily disabled due to middleware issue
  // await fastify.register(analyticsRoutes, { prefix: apiPrefix }); // Temporarily disabled due to route conflict

  // Root endpoint
  fastify.get('/', async (_request, _reply) => {
    return {
      message: 'EO Clinica System API',
      version: '1.1.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        documentation: '/documentation',
        api: apiPrefix,
      },
    };
  });

  // API status endpoint
  fastify.get(`${apiPrefix}`, async (_request, _reply) => {
    return {
      message: 'EO Clinica API v1',
      status: 'operational',
      timestamp: new Date().toISOString(),
      endpoints: [
        `${apiPrefix}/auth`,
        `${apiPrefix}/users`,
        `${apiPrefix}/doctors`,
        `${apiPrefix}/appointments`,
        `${apiPrefix}/specialties`,
        `${apiPrefix}/availability`,
        `${apiPrefix}/chat`,
        `${apiPrefix}/audit`,
        `${apiPrefix}/analytics`,
      ],
    };
  });
}
