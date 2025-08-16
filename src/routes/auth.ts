import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  loginSchema,
  createUserSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@/types/user';
import { responseSchema } from '@/types/common';
import { AuthService } from '@/services/auth.service';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService();

  // Login endpoint
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'User login',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { email: string; password: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { email, password } = request.body;

        const authResponse = await authService.login({ email, password });

        return reply.send({
          success: true,
          data: authResponse,
        });
      } catch (error: any) {
        const errorCode = error.message || 'LOGIN_FAILED';

        let statusCode = 401;
        let message = 'Email ou senha inválidos';

        if (errorCode === 'ACCOUNT_INACTIVE') {
          statusCode = 403;
          message = 'Conta inativa. Entre em contato com o administrador.';
        }

        return reply.status(statusCode).send({
          success: false,
          error: {
            code: errorCode,
            message,
          },
        });
      }
    },
  );

  // Register endpoint
  fastify.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'User registration',
        body: createUserSchema,
        response: {
          201: responseSchema(
            createUserSchema.omit({ password: true }).extend({
              id: loginSchema.shape.email,
            }),
          ),
        },
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      // TODO: Implement user registration logic
      return reply.status(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Register endpoint not yet implemented',
        },
      });
    },
  );

  // Logout endpoint
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'User logout',
        security: [{ Bearer: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // TODO: Implement logout logic (invalidate tokens)
      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    },
  );

  // Refresh token endpoint
  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { refreshToken: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { refreshToken } = request.body;

        const result = await authService.refreshAccessToken(refreshToken);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Token de refresh inválido ou expirado',
          },
        });
      }
    },
  );

  // Password reset request
  fastify.post(
    '/forgot-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request password reset',
        body: resetPasswordSchema,
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      // TODO: Implement password reset request logic
      return reply.send({
        success: true,
        message: 'Password reset instructions sent to your email',
      });
    },
  );

  // Password reset confirmation
  fastify.post(
    '/reset-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { token: string; newPassword: string } }>,
      reply: FastifyReply,
    ) => {
      // TODO: Implement password reset logic
      return reply.status(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Reset password endpoint not yet implemented',
        },
      });
    },
  );

  // Email verification
  fastify.post(
    '/verify-email',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Verify email address',
        body: verifyEmailSchema,
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      // TODO: Implement email verification logic
      return reply.status(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Email verification endpoint not yet implemented',
        },
      });
    },
  );

  // Get current user profile
  fastify.get(
    '/me',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ Bearer: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // TODO: Implement get current user logic
      return reply.status(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Get profile endpoint not yet implemented',
        },
      });
    },
  );
}
