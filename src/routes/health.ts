import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check básico
  fastify.get(
    '/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        version: process.env.npm_package_version || '1.0.0',
      };
    },
  );

  // Health check detalhado
  fastify.get(
    '/health/detailed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Testar conexão com banco
        const dbCheck = await fastify.prisma.$queryRaw`SELECT 1`;

        // Testar Redis (se configurado)
        let redisCheck = 'not configured';
        if (fastify.redis) {
          await fastify.redis.ping();
          redisCheck = 'connected';
        }

        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'production',
          version: process.env.npm_package_version || '1.0.0',
          checks: {
            database: dbCheck ? 'connected' : 'error',
            redis: redisCheck,
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              unit: 'MB',
            },
          },
        };
      } catch (error: any) {
        reply.status(503);
        return {
          status: 'unhealthy',
          error: error.message,
        };
      }
    },
  );
}
