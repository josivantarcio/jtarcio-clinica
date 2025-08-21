import Fastify from 'fastify';
import { env } from '@/config/env';
import { logger, httpLogger } from '@/config/logger';
import { connectDatabase, prisma } from '@/config/database';
import { connectRedis, redis } from '@/config/redis';
import { registerPlugins } from '@/plugins';
import { registerRoutes } from '@/routes';
import { ServiceFactory } from '@/services';
import { securityMiddleware } from '@/modules/security/security.middleware';

// Create Fastify instance
const fastify = Fastify({
  logger: false, // We use our own logger
  trustProxy: true,
  bodyLimit: env.MAX_FILE_SIZE,
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    await fastify.close();
    logger.info('HTTP server closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Application startup
const start = async (): Promise<void> => {
  try {
    // Connect to external services
    await connectDatabase();
    await connectRedis();

    // Initialize service container
    await ServiceFactory.create(prisma, redis, logger);

    // Register plugins
    await registerPlugins(fastify);

    // Apply security middleware
    await securityMiddleware.applyHelmetSecurity(fastify);
    await securityMiddleware.applyRateLimit(fastify);

    // Register security hooks
    fastify.addHook(
      'onRequest',
      securityMiddleware.createInputSanitizationMiddleware(),
    );
    fastify.addHook(
      'onRequest',
      securityMiddleware.createSecurityLoggingMiddleware(),
    );
    fastify.addHook(
      'onRequest',
      securityMiddleware.createRequestIntegrityMiddleware(),
    );

    // Register custom HTTP logger
    fastify.addHook('onRequest', httpLogger);

    // Register routes
    await registerRoutes(fastify);

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: env.NODE_ENV,
      };
    });

    // Start server
    const address = await fastify.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`[SUCCESS] Server running at ${address}`);
    logger.info(`[INFO] API Documentation: ${address}/documentation`);
    logger.info(
      `[SUCCESS] EO Clinica System - Sector 1 initialized successfully`,
    );
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
start().catch(error => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
