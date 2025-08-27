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
import financialRoutes from './financial';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  const apiPrefix = `/api/${env.API_VERSION}`;

  // Register all route modules
  await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` });
  await fastify.register(userRoutes, { prefix: `${apiPrefix}/users` });
  await fastify.register(userRoutes, { prefix: `${apiPrefix}` }); // For /doctors endpoint - re-enabled
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
  await fastify.register(analyticsRoutes, { prefix: apiPrefix }); // ✅ Re-enabled - route conflict resolved
  await fastify.register(financialRoutes, { prefix: `${apiPrefix}/financial` }); // ✅ Financial module routes

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

  // API status endpoint - moved to /status to avoid conflicts
  fastify.get(`${apiPrefix}/status`, async (_request, _reply) => {
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
        `${apiPrefix}/financial`,
      ],
    };
  });
}
