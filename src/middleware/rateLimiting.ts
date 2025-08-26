import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';

/**
 * 🚦 RATE LIMITING MIDDLEWARE - EO CLÍNICA
 *
 * Implementação de rate limiting baseada nos testes de segurança
 * Adaptado para Fastify
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface LoginAttempt {
  ip: string;
  timestamp: number;
  success: boolean;
}

// Cache em memória para rate limiting (em produção usar Redis)
const rateLimitCache = new Map<string, number[]>();
const loginAttemptsCache = new Map<string, LoginAttempt[]>();

/**
 * Middleware de rate limiting básico para Fastify
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = request.ip || request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Obter tentativas do cliente
    let attempts = rateLimitCache.get(clientId) || [];

    // Filtrar tentativas dentro da janela de tempo
    attempts = attempts.filter(timestamp => timestamp > windowStart);

    // Verificar se excedeu o limite
    if (attempts.length >= config.maxRequests) {
      // Log para depuração
      request.log.warn(`Rate limit exceeded for ${clientId}`, {
        ip: clientId,
        method: request.method,
        path: request.url,
        timestamp: new Date().toISOString(),
        userAgent: request.headers['user-agent'],
      });

      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas tentativas. Tente novamente mais tarde.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        },
      });
    }

    // Adicionar tentativa atual
    attempts.push(now);
    rateLimitCache.set(clientId, attempts);

    // Limpar cache antigo periodicamente
    if (Math.random() < 0.01) {
      // 1% chance
      cleanupRateLimit();
    }
  };
}

/**
 * Rate limiter específico para login com detecção de força bruta para Fastify
 */
export function createLoginRateLimiter() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = request.ip || request.socket.remoteAddress || 'unknown';

    // Verificar tentativas de força bruta
    const attempts = loginAttemptsCache.get(clientId) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < 60000, // Últimos 60 segundos
    );

    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);

    // Detectar força bruta (5 falhas em 1 minuto)
    if (failedAttempts.length >= 5) {
      const delayMs = calculateExponentialDelay(failedAttempts.length);

      request.log.warn(`Brute force detected for ${clientId}`, {
        ip: clientId,
        failedAttempts: failedAttempts.length,
        delayMs,
        timestamp: new Date().toISOString(),
      });

      return reply.status(429).send({
        success: false,
        error: {
          code: 'BRUTE_FORCE_DETECTED',
          message: `Muitas tentativas de login falharam. Aguarde ${delayMs / 1000} segundos.`,
          retryAfter: Math.ceil(delayMs / 1000),
        },
      });
    }

    // Hook para capturar resultado da resposta
    reply.addHook('onSend', async (request, reply, payload) => {
      const success = reply.statusCode >= 200 && reply.statusCode < 300;

      // Registrar tentativa
      const updatedAttempts = [
        ...recentAttempts,
        {
          ip: clientId,
          timestamp: now,
          success,
        },
      ];

      loginAttemptsCache.set(clientId, updatedAttempts);

      return payload;
    });
  };
}

/**
 * Calcula delay exponencial baseado no número de tentativas
 */
function calculateExponentialDelay(attemptNumber: number): number {
  return Math.min(1000 * Math.pow(2, attemptNumber), 30000); // Max 30s
}

/**
 * Limpa cache antigo de rate limiting
 */
function cleanupRateLimit() {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hora

  for (const [clientId, timestamps] of rateLimitCache.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < maxAge);

    if (validTimestamps.length === 0) {
      rateLimitCache.delete(clientId);
    } else {
      rateLimitCache.set(clientId, validTimestamps);
    }
  }

  for (const [clientId, attempts] of loginAttemptsCache.entries()) {
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < maxAge,
    );

    if (validAttempts.length === 0) {
      loginAttemptsCache.delete(clientId);
    } else {
      loginAttemptsCache.set(clientId, validAttempts);
    }
  }
}

/**
 * Rate limiters pré-configurados para diferentes endpoints
 * Configurações mais permissivas em desenvolvimento
 */
const isDevelopment = process.env.NODE_ENV === 'development';

export const rateLimiters = {
  // API geral: Mais permissivo em desenvolvimento
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: isDevelopment ? 1000 : 100, // 1000 em dev, 100 em prod
  }),

  // Login: Mais permissivo em desenvolvimento
  login: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: isDevelopment ? 50 : 5, // 50 em dev, 5 em prod
  }),

  // Busca de pacientes: 50 requests por minuto em dev
  patientSearch: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: isDevelopment ? 100 : 20,
  }),

  // Criação de consultas: Mais permissivo em desenvolvimento
  createAppointment: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: isDevelopment ? 50 : 10,
  }),

  // Login com detecção de força bruta - desabilitado em desenvolvimento
  bruteForceProtection: isDevelopment
    ? async (request: FastifyRequest, reply: FastifyReply) => {
        // No-op em desenvolvimento para evitar bloqueios
        request.log.debug('Brute force protection disabled in development');
      }
    : createLoginRateLimiter(),
};
