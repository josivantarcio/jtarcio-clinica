import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '@/config/env';
import { redis } from '@/config/redis';

export async function registerPlugins(fastify: FastifyInstance): Promise<void> {
  // Security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin) return callback(null, true);

      // In development, allow all origins
      if (env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      // In production, validate against allowed origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://your-production-domain.com',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Rate limiting - Disabled for development debugging
  if (env.NODE_ENV === 'production') {
    await fastify.register(rateLimit, {
      max: env.RATE_LIMIT_MAX_REQUESTS,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,
      redis,
      skipOnError: true,
      skipSuccessfulRequests: true,
      errorResponseBuilder: (request, context) => ({
        error: 'Rate limit exceeded',
        message: `Too many requests, retry after ${Math.round(context.ttl / 1000)} seconds`,
        retryAfter: Math.round(context.ttl / 1000),
      }),
    });
  }

  // File upload support
  await fastify.register(multipart, {
    limits: {
      fileSize: env.MAX_FILE_SIZE,
      files: 1,
    },
  });

  // API Documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'EO Clinica API',
        description:
          'Sistema completo de agendamento médico com integração IA - Production Ready v1.3.6',
        version: '1.3.6',
        contact: {
          name: 'EO Clínica Support',
          email: 'support@eoclinica.com.br',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      host: `localhost:${env.PORT}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Health', description: 'Health check e status do sistema' },
        { name: 'Auth', description: 'Autenticação e autorização JWT' },
        {
          name: 'Users',
          description: 'Gestão completa de usuários (CRUD + Admin)',
        },
        { name: 'Appointments', description: 'Agendamentos médicos completos' },
        {
          name: 'Specialties',
          description: 'Especialidades médicas disponíveis',
        },
        { name: 'Availability', description: 'Disponibilidade de médicos' },
        { name: 'Analytics', description: 'Analytics e relatórios do sistema' },
        { name: 'Audit', description: 'Logs de auditoria e compliance' },
        { name: 'Admin', description: 'Funcionalidades administrativas' },
      ],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'JWT Bearer Token - Format: "Bearer {token}"',
        },
      },
      externalDocs: {
        description: 'EO Clínica GitHub Repository',
        url: 'https://github.com/josivantarcio/jtarcio-clinica',
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: header => header,
  });

  // Static file serving for uploads
  await fastify.register(require('@fastify/static'), {
    root: require('path').join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    const { validation } = error;

    // Handle validation errors
    if (validation) {
      const errorMessage = validation
        .map(err => `${err.instancePath} ${err.message}`)
        .join(', ');
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${errorMessage}`,
          details: validation,
        },
      });
    }

    // Handle rate limiting errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message,
        },
      });
    }

    // Handle authentication errors
    if (error.statusCode === 401) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Handle authorization errors
    if (error.statusCode === 403) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    // Handle not found errors
    if (error.statusCode === 404) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    }

    // Handle internal server errors
    request.log.error(error);

    if (env.NODE_ENV === 'production') {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
        },
      });
    } else {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
          stack: error.stack,
        },
      });
    }
  });
}
