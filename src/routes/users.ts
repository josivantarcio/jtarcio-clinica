import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { updateUserSchema, userResponseSchema } from '@/types/user';
import { paginationSchema, responseSchema } from '@/types/common';
import { UserService } from '@/services/user.service';
import { prisma } from '@/config/database';
import { verifyJWT } from '@/plugins/auth';

const userService = new UserService(prisma);

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all users (admin only)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get all users',
        security: [{ Bearer: [] }],
        querystring: paginationSchema.extend({
          role: {
            type: 'string',
            enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST'],
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
          },
          search: { type: 'string' },
        }),
        response: {
          200: responseSchema({
            type: 'array',
            items: userResponseSchema,
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: any }>,
      reply: FastifyReply,
    ) => {
      try {
        const { page, limit, role, status, search } = request.query;

        const result = await userService.findAll({
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 20,
          role,
          status,
          search,
        });

        return reply.status(200).send({
          success: true,
          data: result.users,
          pagination: result.pagination,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message:
              error instanceof Error ? error.message : 'Failed to fetch users',
          },
        });
      }
    },
  );

  // Get user by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get user by ID',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: responseSchema(userResponseSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;

        const user = await userService.findById(id);

        return reply.status(200).send({
          success: true,
          data: user,
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
              error instanceof Error ? error.message : 'Failed to fetch user',
          },
        });
      }
    },
  );

  // Update user
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update user',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: updateUserSchema,
        response: {
          200: responseSchema(userResponseSchema),
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: any }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const updateData = request.body;

        const updatedUser = await userService.update(id, updateData);

        return reply.status(200).send({
          success: true,
          data: updatedUser,
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
              error instanceof Error ? error.message : 'Failed to update user',
          },
        });
      }
    },
  );

  // Delete user (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Delete user (soft delete)',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;

        await userService.delete(id);

        return reply.status(200).send({
          success: true,
          message: 'User deleted successfully',
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
              error instanceof Error ? error.message : 'Failed to delete user',
          },
        });
      }
    },
  );

  // Get user's appointments
  fastify.get(
    '/:id/appointments',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get user appointments',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: paginationSchema.extend({
          status: { type: 'string' },
          dateFrom: { type: 'string', format: 'date' },
          dateTo: { type: 'string', format: 'date' },
        }),
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: any }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const { page, limit, status, dateFrom, dateTo } = request.query;

        const result = await userService.getUserAppointments(id, {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 20,
          status,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
        });

        return reply.status(200).send({
          success: true,
          data: result.appointments,
          pagination: result.pagination,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to fetch user appointments',
          },
        });
      }
    },
  );

  // Update user status (admin only)
  fastify.patch(
    '/:id/status',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update user status',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
            },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: any }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const { status, reason } = request.body;

        const updatedUser = await userService.updateStatus(id, status, reason);

        return reply.status(200).send({
          success: true,
          data: updatedUser,
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
                : 'Failed to update user status',
          },
        });
      }
    },
  );

  // Create doctor endpoint
  fastify.post(
    '/doctors',
    {
      schema: {
        tags: ['Users'],
        summary: 'Create a new doctor',
        security: [{ Bearer: [] }],
        body: {
          type: 'object',
          required: ['user', 'crm', 'specialtyId', 'graduationDate'],
          properties: {
            user: {
              type: 'object',
              required: ['firstName', 'lastName', 'email', 'password', 'role'],
              properties: {
                firstName: { type: 'string', minLength: 2 },
                lastName: { type: 'string', minLength: 2 },
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                role: { type: 'string', enum: ['DOCTOR'] },
              },
            },
            crm: { type: 'string', minLength: 5 },
            phone: { type: 'string' },
            cpf: { type: 'string' },
            specialtyId: { type: 'string' },
            subSpecialties: {
              type: 'array',
              items: { type: 'string' },
            },
            graduationDate: { type: 'string', format: 'date' },
            crmRegistrationDate: { type: 'string', format: 'date' },
            education: { type: 'string' },
            bio: { type: 'string' },
            consultationFee: { type: 'string' },
          },
        },
        response: {
          201: responseSchema(userResponseSchema),
        },
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        const doctorData = request.body;

        // Check if user with email already exists
        const existingUser = await userService.findAll({
          search: doctorData.user.email,
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

        const createdDoctor = await userService.createDoctor(doctorData);

        return reply.status(201).send({
          success: true,
          data: createdDoctor,
          message: 'Médico criado com sucesso',
        });
      } catch (error) {
        console.error('Error creating doctor:', error);

        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message:
              error instanceof Error ? error.message : 'Erro ao criar médico',
          },
        });
      }
    },
  );

  // Get current user profile
  fastify.get(
    '/profile',
    {
      preHandler: [verifyJWT],
      schema: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ Bearer: [] }],
        response: {
          200: responseSchema(userResponseSchema),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get user ID from JWT token (assuming middleware sets it in request)
        const userId = (request as any).user?.userId
        
        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'User not authenticated',
            },
          })
        }

        const user = await userService.findById(userId)

        // Parse settings from encryptedData if exists
        let settings = null
        if (user.encryptedData) {
          try {
            settings = typeof user.encryptedData === 'string' 
              ? JSON.parse(user.encryptedData)
              : user.encryptedData
          } catch (error) {
            console.error('Error parsing user settings:', error)
          }
        }

        return reply.status(200).send({
          success: true,
          data: {
            ...user,
            settings,
            bio: user.doctorProfile?.biography || user.patientProfile?.medicalHistory || ''
          },
        })
      } catch (error) {
        const statusCode =
          error instanceof Error && error.message === 'User not found'
            ? 404
            : 500

        return reply.status(statusCode).send({
          success: false,
          error: {
            code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message:
              error instanceof Error ? error.message : 'Failed to fetch user profile',
          },
        })
      }
    },
  )

  // Update current user profile
  fastify.patch(
    '/profile',
    {
      preHandler: [verifyJWT],
      schema: {
        tags: ['Users'],
        summary: 'Update current user profile',
        security: [{ Bearer: [] }],
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            timezone: { type: 'string' },
            bio: { type: 'string' },
            settings: {
              type: 'object',
              properties: {
                notifications: { type: 'object' },
                privacy: { type: 'object' },
                appearance: { type: 'object' },
                security: { type: 'object' }
              }
            }
          },
        },
        response: {
          200: responseSchema(userResponseSchema),
        },
      },
    },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      try {
        // Get user ID from JWT token
        const userId = (request as any).user?.userId
        
        if (!userId) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'User not authenticated',
            },
          })
        }

        const updateData = request.body
        const { bio, settings, ...userFields } = updateData

        // Prepare user update data
        const userUpdateData: any = {
          ...userFields,
        }

        // Update fullName if firstName or lastName changed
        if (userFields.firstName || userFields.lastName) {
          const currentUser = await userService.findById(userId)
          const firstName = userFields.firstName || currentUser.firstName
          const lastName = userFields.lastName || currentUser.lastName
          userUpdateData.fullName = `${firstName} ${lastName}`
        }

        // Store settings in encryptedData field
        if (settings) {
          userUpdateData.encryptedData = JSON.stringify(settings)
        }

        const updatedUser = await userService.update(userId, userUpdateData)

        // Update bio in the appropriate profile
        if (bio !== undefined) {
          if (updatedUser.doctorProfile) {
            await prisma.doctor.update({
              where: { userId },
              data: { biography: bio }
            })
          }
          // For patients, we could store bio in a custom field or medicalHistory
        }

        // Fetch updated user with all data
        const refreshedUser = await userService.findById(userId)
        
        // Parse settings for response
        let parsedSettings = null
        if (refreshedUser.encryptedData) {
          try {
            parsedSettings = typeof refreshedUser.encryptedData === 'string' 
              ? JSON.parse(refreshedUser.encryptedData)
              : refreshedUser.encryptedData
          } catch (error) {
            console.error('Error parsing user settings:', error)
          }
        }

        return reply.status(200).send({
          success: true,
          data: {
            ...refreshedUser,
            settings: parsedSettings,
            bio: refreshedUser.doctorProfile?.biography || ''
          },
        })
      } catch (error) {
        const statusCode =
          error instanceof Error && error.message === 'User not found'
            ? 404
            : 500

        return reply.status(statusCode).send({
          success: false,
          error: {
            code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
            message:
              error instanceof Error ? error.message : 'Failed to update user profile',
          },
        })
      }
    },
  )
}
