import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { prisma } from '@/config/database';
import { verifyJWT } from '@/plugins/auth';
import { validateCPF, checkCPFExists } from '@/utils/cpf-validation';
import { rateLimiters } from '@/middleware/rateLimiting';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService();
  const userService = new UserService(prisma);

  // Login endpoint
  fastify.post(
    '/login',
    {
      preHandler: [rateLimiters.login, rateLimiters.bruteForceProtection],
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
      preHandler: [rateLimiters.general],
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
              enum: [
                'PATIENT',
                'DOCTOR',
                'ADMIN',
                'RECEPTIONIST',
                'FINANCIAL_MANAGER',
              ],
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
      try {
        const {
          email,
          password,
          firstName,
          lastName,
          phone,
          cpf,
          role = 'PATIENT',
          timezone = 'America/Sao_Paulo',
        } = request.body;

        // Check if user with email already exists
        const existingUser = await userService.findAll({
          search: email,
        });
        if (existingUser.users.length > 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'Um usuário com este email já existe',
            },
          });
        }

        // Validate and check CPF if provided
        if (cpf) {
          if (!validateCPF(cpf)) {
            return reply.status(400).send({
              success: false,
              error: {
                code: 'INVALID_CPF',
                message: 'CPF inválido',
              },
            });
          }

          const cpfCheck = await checkCPFExists(cpf, prisma);
          if (cpfCheck.exists) {
            return reply.status(400).send({
              success: false,
              error: {
                code: 'CPF_ALREADY_EXISTS',
                message: `CPF já cadastrado para: ${cpfCheck.user?.fullName} (${cpfCheck.user?.email})`,
              },
            });
          }
        }

        // Create user
        const userData = {
          email,
          password,
          firstName,
          lastName,
          phone,
          cpf,
          role: role || 'PATIENT',
          timezone: timezone || 'America/Sao_Paulo',
          status: 'ACTIVE',
        };

        const user = await userService.create(userData);

        // Generate tokens
        const tokens = await authService.generateTokens(user.id, user.role);

        return reply.status(201).send({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              fullName: user.fullName,
              role: user.role,
              status: user.status,
            },
            tokens,
          },
        });
      } catch (error: any) {
        console.error('Registration error:', error);

        return reply.status(500).send({
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message:
              error instanceof Error ? error.message : 'Erro ao criar conta',
          },
        });
      }
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
      preHandler: [rateLimiters.general],
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
      preHandler: [rateLimiters.login],
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
      preHandler: [rateLimiters.login],
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
        const user = (request as any).user;

        if (!user?.userId) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'User not authenticated',
            },
          });
        }

        // Handle fake token in development mode
        if (
          process.env.NODE_ENV === 'development' &&
          user.userId === 'dev-user-1'
        ) {
          request.log.debug('Development mode: Returning mock user data');

          return reply.send({
            success: true,
            data: {
              id: 'dev-user-1',
              email: 'admin@eoclinica.com.br',
              name: 'Admin Developer',
              firstName: 'Admin',
              lastName: 'Developer',
              role: 'ADMIN',
              status: 'ACTIVE',
              phone: '(11) 99999-9999',
              timezone: 'America/Sao_Paulo',
              avatar: null,
              settings: {
                notifications: {
                  email: true,
                  sms: true,
                  push: true,
                  appointmentReminders: true,
                  cancellationAlerts: true,
                  promotionalEmails: false,
                  systemUpdates: true,
                  reminderTiming: 24,
                },
                privacy: {
                  profileVisibility: 'contacts',
                  shareActivityStatus: true,
                  allowDirectMessages: true,
                  showOnlineStatus: true,
                },
                appearance: {
                  theme: 'light',
                  fontSize: 'medium',
                  reducedMotion: false,
                  highContrast: false,
                },
                security: {
                  twoFactorEnabled: false,
                  loginNotifications: true,
                  sessionTimeout: 60,
                },
              },
              bio: 'Usuário de desenvolvimento para testes',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          });
        }

        const dbUser = await userService.findById(user.userId);

        // Parse settings from encryptedData if exists
        let settings = null;
        if (dbUser.encryptedData) {
          try {
            settings =
              typeof dbUser.encryptedData === 'string'
                ? JSON.parse(dbUser.encryptedData)
                : dbUser.encryptedData;
          } catch (error) {
            console.error('Error parsing user settings:', error);
          }
        }

        return reply.send({
          success: true,
          data: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.fullName,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            role: dbUser.role,
            status: dbUser.status,
            phone: dbUser.phone,
            timezone: dbUser.timezone,
            avatar: dbUser.avatar,
            settings,
            bio: dbUser.doctorProfile?.biography || '',
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
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

  // Update system settings endpoint
  fastify.put(
    '/system-settings',
    {
      preHandler: [verifyJWT],
      schema: {
        tags: ['Auth'],
        summary: 'Update system settings',
        security: [{ Bearer: [] }],
        body: {
          type: 'object',
          properties: {
            system: {
              type: 'object',
              properties: {
                consultationPricingMode: {
                  type: 'string',
                  enum: ['doctor', 'specialty'],
                },
                defaultCurrency: { type: 'string' },
                taxRate: { type: 'number', minimum: 0, maximum: 100 },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const { system } = request.body;

        if (!system) {
          return reply.status(400).send({
            success: false,
            error: { message: 'System settings are required' },
          });
        }

        // Import here to avoid circular dependencies
        const { updatePricingConfig } = await import('@/utils/pricing');

        const success = await updatePricingConfig({
          consultationPricingMode: system.consultationPricingMode,
          defaultCurrency: system.defaultCurrency,
          taxRate: system.taxRate,
        });

        if (success) {
          return reply.send({
            success: true,
            message: 'System settings updated successfully',
          });
        } else {
          return reply.status(500).send({
            success: false,
            error: { message: 'Failed to update system settings' },
          });
        }
      } catch (error: any) {
        console.error('System settings update error:', error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to update settings',
          },
        });
      }
    },
  );
}
