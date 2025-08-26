import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

/**
 * 🚦 RATE LIMITING MIDDLEWARE - EO CLÍNICA
 *
 * Implementação de rate limiting baseada nos testes de segurança
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
 * Middleware de rate limiting básico
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Obter tentativas do cliente
    let attempts = rateLimitCache.get(clientId) || [];

    // Filtrar tentativas dentro da janela de tempo
    attempts = attempts.filter(timestamp => timestamp > windowStart);

    // Verificar se excedeu o limite
    if (attempts.length >= config.maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Muitas tentativas. Tente novamente mais tarde.',
        retryAfter: Math.ceil(config.windowMs / 1000),
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

    next();
  };
}

/**
 * Rate limiter específico para login com detecção de força bruta
 */
export function createLoginRateLimiter() {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';

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

      return res.status(429).json({
        error: 'Brute force detected',
        message: `Muitas tentativas de login falharam. Aguarde ${delayMs / 1000} segundos.`,
        retryAfter: Math.ceil(delayMs / 1000),
      });
    }

    // Adicionar middleware para capturar resultado do login
    const originalSend = res.send;
    res.send = function (data) {
      const success = res.statusCode === 200;

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

      return originalSend.call(this, data);
    };

    next();
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
 */
export const rateLimiters = {
  // API geral: 100 requests por minuto
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100,
  }),

  // Login: 5 tentativas por minuto
  login: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),

  // Busca de pacientes: 20 requests por minuto
  patientSearch: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),

  // Criação de consultas: 10 por minuto
  createAppointment: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),

  // Login com detecção de força bruta
  bruteForceProtection: createLoginRateLimiter(),
};
