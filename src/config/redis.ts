import Redis from 'ioredis';
import { env } from './env';

// Create Redis client
export const redis = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
});

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

// Connection management
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.disconnect();
    console.log('✅ Redis disconnected successfully');
  } catch (error) {
    console.error('❌ Redis disconnection failed:', error);
    throw error;
  }
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

// Utility functions
export const cacheKeys = {
  userSession: (userId: string) => `user:session:${userId}`,
  appointment: (id: string) => `appointment:${id}`,
  doctorAvailability: (doctorId: string, date: string) => `doctor:availability:${doctorId}:${date}`,
  patientAppointments: (patientId: string) => `patient:appointments:${patientId}`,
  conversations: (conversationId: string) => `conversation:${conversationId}`,
  rateLimit: (key: string) => `rate_limit:${key}`,
} as const;

export const cacheTTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 3600, // 1 hour
  LONG: 86400, // 24 hours
  SESSION: 604800, // 7 days
} as const;

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis();
});

process.on('SIGINT', async () => {
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectRedis();
  process.exit(0);
});