import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { prisma } from '@/config/database';
import { verifyJWT } from '@/plugins/auth';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService();
  const userService = new UserService(prisma);

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
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string', minLength: 2 },
            lastName: { type: 'string', minLength: 2 },
            phone: { type: 'string' },
            cpf: { type: 'string' },
            role: {
              type: 'string',
              enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST'],
            },
            timezone: { type: 'string', default: 'America/Sao_Paulo' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
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
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
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
        body: {
          type: 'object',
          required: ['email', 'token'],
          properties: {
            email: { type: 'string', format: 'email' },
            token: { type: 'string' },
          },
        },
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
      preHandler: [verifyJWT],
      schema: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ Bearer: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.userId;

        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'User not authenticated',
            },
          });
        }

        const user = await userService.findById(userId);

        // Parse settings from encryptedData if exists
        let settings = null;
        if (user.encryptedData) {
          try {
            settings =
              typeof user.encryptedData === 'string'
                ? JSON.parse(user.encryptedData)
                : user.encryptedData;
          } catch (error) {
            console.error('Error parsing user settings:', error);
          }
        }

        return reply.send({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            name: user.fullName,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            phone: user.phone,
            timezone: user.timezone,
            avatar: user.avatar,
            settings,
            bio: user.doctorProfile?.biography || '',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        });
      } catch (error) {
        const statusCode =
          error instanceof Error && error.message === 'User not found'
            ? 404
            : 500;

        return reply.status(statusCode).send({
          success: false,
          error: {
            code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to fetch user profile',
          },
        });
      }
    },
  );
}
