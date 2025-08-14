import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { updateUserSchema, userResponseSchema } from '@/types/user';
import { paginationSchema, responseSchema } from '@/types/common';
import { UserService } from '@/services/user.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const userService = new UserService(prisma);

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all users (admin only)
  fastify.get('/', {
    schema: {
      tags: ['Users'],
      summary: 'Get all users',
      security: [{ Bearer: [] }],
      querystring: paginationSchema.extend({
        role: { type: 'string', enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST'] },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] },
        search: { type: 'string' },
      }),
      response: {
        200: responseSchema({
          type: 'array',
          items: userResponseSchema,
        }),
      },
    },
  }, async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
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
          message: error instanceof Error ? error.message : 'Failed to fetch users',
        },
      });
    }
  });

  // Get user by ID
  fastify.get('/:id', {
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
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const user = await userService.findById(id);

      return reply.status(200).send({
        success: true,
        data: user,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
      
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch user',
        },
      });
    }
  });

  // Update user
  fastify.patch('/:id', {
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
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      
      const updatedUser = await userService.update(id, updateData);

      return reply.status(200).send({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
      
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update user',
        },
      });
    }
  });

  // Delete user (soft delete)
  fastify.delete('/:id', {
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
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      await userService.delete(id);

      return reply.status(200).send({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
      
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete user',
        },
      });
    }
  });

  // Get user's appointments
  fastify.get('/:id/appointments', {
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
  }, async (request: FastifyRequest<{ Params: { id: string }; Querystring: any }>, reply: FastifyReply) => {
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
          message: error instanceof Error ? error.message : 'Failed to fetch user appointments',
        },
      });
    }
  });

  // Update user status (admin only)
  fastify.patch('/:id/status', {
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
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'] },
          reason: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { status, reason } = request.body;
      
      const updatedUser = await userService.updateStatus(id, status, reason);

      return reply.status(200).send({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'User not found' ? 404 : 500;
      
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update user status',
        },
      });
    }
  });
}