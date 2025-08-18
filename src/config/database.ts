import { PrismaClient } from '../database/generated/client';
import { env } from './env';
import { logger } from './logger'; // Importar o logger

// Create Prisma client with configuration
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

// Connection management
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('[SUCCESS] Database connected successfully'); // Usar logger.info
  } catch (error) {
    logger.error('[ERROR] Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('[SUCCESS] Database disconnected successfully'); // Usar logger.info
  } catch (error) {
    logger.error('[ERROR] Database disconnection failed:', error);
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// SOLUÇÃO DEFINITIVA - Graceful shutdown handlers sem loop infinito
const setupGracefulShutdown = (() => {
  let initialized = false;
  let isShuttingDown = false;

  return () => {
    if (initialized) return;
    initialized = true;

    // Setup graceful shutdown handlers (loop-safe)

    // beforeExit é problemático - não vamos usar

    process.on('SIGINT', async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      // SIGINT received, gracefully shutting down
      try {
        await prisma.$disconnect();
        // Database disconnected gracefully
      } catch (error) {
        // Error during graceful shutdown
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      // SIGTERM received, gracefully shutting down
      try {
        await prisma.$disconnect();
        // Database disconnected gracefully
      } catch (error) {
        // Error during graceful shutdown
      }
      process.exit(0);
    });
  };
})();

// Only setup event listeners when explicitly called, not on import
export { setupGracefulShutdown };
