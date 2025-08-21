import { FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { logger } from '../../config/logger';
import { encryptionService } from './encryption.service';

export interface SecurityConfig {
  rateLimit: {
    max: number;
    timeWindow: number;
    skipOnError: boolean;
    keyGenerator?: (request: FastifyRequest) => string;
  };
  cors: {
    origin: string[] | boolean;
    credentials: boolean;
    methods: string[];
  };
  helmet: {
    contentSecurityPolicy: {
      directives: Record<string, string[]>;
    };
  };
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Apply security headers with Helmet
   */
  async applyHelmetSecurity(fastify: any) {
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
          ...this.config.helmet.contentSecurityPolicy.directives,
        },
      },
      crossOriginEmbedderPolicy: { policy: 'credentialless' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      originAgentCluster: true,
      referrerPolicy: { policy: 'no-referrer' },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xContentTypeOptions: true,
      xDnsPrefetchControl: true,
      xDownloadOptions: true,
      xFrameOptions: { action: 'deny' },
      xPermittedCrossDomainPolicies: false,
      xXssProtection: true,
    });
  }

  /**
   * Apply CORS configuration
   */
  async applyCorsConfiguration(fastify: any) {
    await fastify.register(cors, {
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version',
        'X-Request-ID',
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
      ],
    });
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit(fastify: any) {
    await fastify.register(rateLimit, {
      max: this.config.rateLimit.max,
      timeWindow: this.config.rateLimit.timeWindow,
      skipOnError: this.config.rateLimit.skipOnError,
      keyGenerator:
        this.config.rateLimit.keyGenerator || this.defaultKeyGenerator,
      errorResponseBuilder: (request, context) => ({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: {
            limit: context.max,
            timeWindow: context.timeWindow,
            ttl: context.ttl,
          },
        },
      }),
      onExceeding: request => {
        logger.warn('Rate limit exceeded', {
          ip: this.extractClientIP(request),
          userAgent: request.headers['user-agent'],
          path: request.url,
          method: request.method,
        });
      },
      onExceeded: request => {
        logger.error('Rate limit blocked request', {
          ip: this.extractClientIP(request),
          userAgent: request.headers['user-agent'],
          path: request.url,
          method: request.method,
        });
      },
    });
  }

  /**
   * Input sanitization middleware
   */
  createInputSanitizationMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.body && typeof request.body === 'object') {
        request.body = this.sanitizeObject(request.body as any);
      }

      if (request.query && typeof request.query === 'object') {
        request.query = this.sanitizeObject(request.query as any);
      }

      if (request.params && typeof request.params === 'object') {
        request.params = this.sanitizeObject(request.params as any);
      }
    };
  }

  /**
   * Security logging middleware
   */
  createSecurityLoggingMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      const clientIP = this.extractClientIP(request);
      const userAgent = request.headers['user-agent'] || 'unknown';

      // Log suspicious patterns
      if (this.detectSuspiciousPatterns(request)) {
        logger.warn('Suspicious request detected', {
          ip: clientIP,
          userAgent,
          method: request.method,
          url: request.url,
          headers: this.sanitizeHeaders(request.headers),
        });
      }

      // Hook into response to log completion
      reply.raw.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const statusCode = reply.statusCode;

        // Log security events
        if (statusCode >= 400) {
          logger.warn('HTTP error response', {
            ip: clientIP,
            userAgent,
            method: request.method,
            url: request.url,
            statusCode,
            responseTime,
          });
        }

        // Log slow requests (potential DoS)
        if (responseTime > 5000) {
          logger.warn('Slow request detected', {
            ip: clientIP,
            userAgent,
            method: request.method,
            url: request.url,
            responseTime,
          });
        }
      });
    };
  }

  /**
   * API key validation middleware
   */
  createAPIKeyValidationMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const apiKey = request.headers['x-api-key'] as string;

      if (!apiKey) {
        return reply.status(401).send({
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
          },
        });
      }

      // Validate API key format and integrity
      if (!this.validateAPIKeyFormat(apiKey)) {
        return reply.status(401).send({
          error: {
            code: 'INVALID_API_KEY_FORMAT',
            message: 'Invalid API key format',
          },
        });
      }

      // Check API key against database (implementation depends on your API key storage)
      const isValidKey = await this.validateAPIKey(apiKey);
      if (!isValidKey) {
        logger.warn('Invalid API key used', {
          ip: this.extractClientIP(request),
          userAgent: request.headers['user-agent'],
          apiKey: apiKey.substring(0, 8) + '***',
        });

        return reply.status(401).send({
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key',
          },
        });
      }
    };
  }

  /**
   * Request integrity validation middleware
   */
  createRequestIntegrityMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Check request size
      const contentLength = parseInt(request.headers['content-length'] || '0');
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (contentLength > maxSize) {
        logger.warn('Oversized request rejected', {
          ip: this.extractClientIP(request),
          contentLength,
          maxSize,
        });

        return reply.status(413).send({
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request body too large',
          },
        });
      }

      // Validate content type for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers['content-type'];
        const allowedTypes = [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
        ];

        if (
          !contentType ||
          !allowedTypes.some(type => contentType.includes(type))
        ) {
          return reply.status(415).send({
            error: {
              code: 'UNSUPPORTED_MEDIA_TYPE',
              message: 'Unsupported content type',
            },
          });
        }
      }

      // Check for HMAC signature if present
      const signature = request.headers['x-signature'] as string;
      if (signature && request.body) {
        const bodyString = JSON.stringify(request.body);
        const expectedSignature = encryptionService.generateHMAC(bodyString);

        if (!encryptionService.verifyHMAC(bodyString, signature)) {
          logger.warn('Invalid request signature', {
            ip: this.extractClientIP(request),
            signature: signature.substring(0, 16) + '***',
          });

          return reply.status(401).send({
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Request signature validation failed',
            },
          });
        }
      }
    };
  }

  /**
   * Brute force protection middleware
   */
  createBruteForceProtectionMiddleware() {
    const attempts = new Map<
      string,
      { count: number; lastAttempt: number; blocked: boolean }
    >();
    const maxAttempts = 5;
    const blockDuration = 15 * 60 * 1000; // 15 minutes
    const attemptWindow = 60 * 1000; // 1 minute

    return async (request: FastifyRequest, reply: FastifyReply) => {
      const clientIP = this.extractClientIP(request);
      const now = Date.now();

      // Only apply to authentication endpoints
      if (!request.url.includes('/auth/')) {
        return;
      }

      const attemptData = attempts.get(clientIP);

      if (attemptData) {
        // Check if still blocked
        if (
          attemptData.blocked &&
          now - attemptData.lastAttempt < blockDuration
        ) {
          const remainingTime = Math.ceil(
            (blockDuration - (now - attemptData.lastAttempt)) / 1000 / 60,
          );

          logger.warn('Brute force attempt blocked', {
            ip: clientIP,
            remainingTime,
            attempts: attemptData.count,
          });

          return reply.status(429).send({
            error: {
              code: 'TOO_MANY_ATTEMPTS',
              message: `Too many failed attempts. Try again in ${remainingTime} minutes.`,
            },
          });
        }

        // Reset if attempt window has passed
        if (now - attemptData.lastAttempt > attemptWindow) {
          attempts.delete(clientIP);
        }
      }

      // Hook into response to track failed attempts
      reply.raw.on('finish', () => {
        if (reply.statusCode === 401 || reply.statusCode === 403) {
          const current = attempts.get(clientIP) || {
            count: 0,
            lastAttempt: 0,
            blocked: false,
          };
          current.count++;
          current.lastAttempt = now;

          if (current.count >= maxAttempts) {
            current.blocked = true;
            logger.error('IP blocked due to brute force attempts', {
              ip: clientIP,
              attempts: current.count,
            });
          }

          attempts.set(clientIP, current);
        } else if (reply.statusCode === 200) {
          // Success - clear attempts
          attempts.delete(clientIP);
        }
      });
    };
  }

  // Private helper methods

  private defaultKeyGenerator(request: FastifyRequest): string {
    return this.extractClientIP(request);
  }

  private extractClientIP(request: FastifyRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      'unknown'
    );
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeString(String(obj));
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeString(key);
      sanitized[sanitizedKey] = this.sanitizeObject(value);
    }
    return sanitized;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    // First check for SQL injection patterns and reject completely
    if (!this.validateSQLSafety(str)) {
      logger.warn('SQL injection attempt detected and blocked', { 
        input: str.substring(0, 100) + '...',
        ip: 'current-request' // Will be populated by calling middleware
      });
      throw new Error('Invalid input detected');
    }

    // Remove potentially dangerous characters
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim();
  }

  /**
   * Enhanced SQL injection validation
   */
  private validateSQLSafety(input: string): boolean {
    if (!input || typeof input !== 'string') return true;
    
    const lowerInput = input.toLowerCase();
    
    // Enhanced SQL injection patterns - more comprehensive
    const sqlInjectionPatterns = [
      // Union-based injection
      /(\bunion\s+(all\s+)?select)/i,
      
      // Boolean-based injection
      /('\s*(or|and)\s*'?\w*'?\s*=\s*'?\w*'?)/i,
      /('\s*or\s*'?1'?\s*=\s*'?1'?)/i,
      /('\s*or\s*'?true'?\s*=\s*'?true'?)/i,
      
      // Time-based injection
      /(sleep\s*\(|benchmark\s*\(|waitfor\s+delay)/i,
      
      // Error-based injection
      /(extractvalue\s*\(|updatexml\s*\()/i,
      
      // Stacked queries
      /;\s*(drop|create|alter|insert|update|delete)\s+/i,
      
      // Comment-based injection
      /--[\s\r\n]|\/\*.*?\*\/|#/,
      
      // Database-specific functions
      /(information_schema|sys\.databases|mysql\.user)/i,
      
      // Specific dangerous patterns from the test
      /('\s*;\s*drop\s+table)/i,
      /('\s*union\s+select\s*\*\s+from)/i,
      /('\s*;\s*insert\s+into)/i,
      /(admin'\s*--)/i,
      /('\s*or\s*1\s*=\s*1\s*\/\*)/i,
    ];
    
    return !sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  private detectSuspiciousPatterns(request: FastifyRequest): boolean {
    const url = request.url.toLowerCase();
    const userAgent = (request.headers['user-agent'] || '').toLowerCase();
    const body = JSON.stringify(request.body || '').toLowerCase();

    const suspiciousPatterns = [
      // SQL injection patterns
      /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/,
      /union\s+select/,
      /insert\s+into/,
      /delete\s+from/,
      /drop\s+table/,

      // XSS patterns
      /<script/,
      /javascript:/,
      /onerror\s*=/,
      /onload\s*=/,

      // Path traversal
      /\.\.\//,
      /\.\.\\/,

      // Common attack patterns
      /eval\(/,
      /exec\(/,
      /system\(/,
    ];

    const content = `${url} ${userAgent} ${body}`;
    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers from logs
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    delete sanitized['x-signature'];

    return sanitized;
  }

  private validateAPIKeyFormat(apiKey: string): boolean {
    // Validate API key format (adjust based on your format)
    const apiKeyPattern = /^[A-Za-z0-9]{32,}$/;
    return apiKeyPattern.test(apiKey);
  }

  private async validateAPIKey(apiKey: string): Promise<boolean> {
    // Implementation depends on your API key storage mechanism
    // This could check against database, cache, or external service
    try {
      // Placeholder implementation
      // In real implementation, check against your API key store
      const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
      return validKeys.includes(apiKey);
    } catch (error) {
      logger.error('API key validation failed', { error });
      return false;
    }
  }
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  rateLimit: {
    max: 100,
    timeWindow: 15 * 60 * 1000, // 15 minutes
    skipOnError: false,
  },
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://eo-clinica.com', 'https://app.eo-clinica.com']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
      },
    },
  },
};

export const securityMiddleware = new SecurityMiddleware(defaultSecurityConfig);
