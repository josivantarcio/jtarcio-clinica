import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { paginationSchema, responseSchema } from '@/types/common';
import { prisma } from '@/config/database';

export async function specialtyRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all specialties
  fastify.get('/', {
    schema: {
      tags: ['Specialties'],
      summary: 'Get all medical specialties',
      querystring: paginationSchema.extend({
        search: { type: 'string' },
        isActive: { type: 'boolean' },
        withActiveDoctors: { type: 'boolean' },
      }),
      response: {
        200: responseSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string' },
              duration: { type: 'number' },
              price: { type: 'number' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const { page = 1, pageSize = 20, search, isActive, withActiveDoctors } = request.query;
      
      // Convert string parameters to boolean
      const withActiveDoctorsBool = withActiveDoctors === 'true' || withActiveDoctors === true;
      
      const where: any = {
        ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        ...(isActive !== undefined && { isActive }),
      };

      // Filter only specialties that have active doctors with specialty assigned
      if (withActiveDoctorsBool) {
        where.doctors = {
          some: {
            isActive: true,
            specialtyId: { not: null }, // Must have specialty assigned
            user: {
              status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }, // Accept both active and pending verification doctors
              deletedAt: null
            }
          }
        };
      }
      
      const specialties = await prisma.specialty.findMany({
        where,
        include: {
          _count: {
            select: {
              doctors: {
                where: {
                  isActive: true,
                  specialtyId: { not: null }, // Only count doctors with specialty assigned
                  user: {
                    status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }, // Accept both active and pending verification doctors
                    deletedAt: null
                  }
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      
      return reply.send({
        success: true,
        data: specialties,
      });
    } catch (error) {
      fastify.log.error('Error fetching specialties:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch specialties',
        },
      });
    }
  });

  // Get specialty by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Specialties'],
      summary: 'Get specialty by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: responseSchema({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            duration: { type: 'number' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            doctors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid' },
                  crm: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      fullName: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    // TODO: Implement get specialty by ID logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Get specialty endpoint not yet implemented',
      },
    });
  });

  // Create specialty (admin only)
  fastify.post('/', {
    schema: {
      tags: ['Specialties'],
      summary: 'Create new specialty',
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['name', 'duration'],
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string' },
          duration: { type: 'number', minimum: 15, maximum: 120 },
        },
      },
      response: {
        201: responseSchema({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            duration: { type: 'number' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    // TODO: Implement create specialty logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Create specialty endpoint not yet implemented',
      },
    });
  });

  // Update specialty (admin only)
  fastify.patch('/:id', {
    schema: {
      tags: ['Specialties'],
      summary: 'Update specialty',
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
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string' },
          duration: { type: 'number', minimum: 15, maximum: 120 },
          isActive: { type: 'boolean' },
        },
      },
      response: {
        200: responseSchema({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            duration: { type: 'number' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
    // TODO: Implement update specialty logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Update specialty endpoint not yet implemented',
      },
    });
  });

  // Delete specialty (admin only)
  fastify.delete('/:id', {
    schema: {
      tags: ['Specialties'],
      summary: 'Delete specialty',
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
    // TODO: Implement delete specialty logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Delete specialty endpoint not yet implemented',
      },
    });
  });

  // Get doctors by specialty
  fastify.get('/:id/doctors', {
    schema: {
      tags: ['Specialties'],
      summary: 'Get doctors by specialty',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: paginationSchema.extend({
        isActive: { type: 'boolean' },
        acceptsNewPatients: { type: 'boolean' },
      }),
      response: {
        200: responseSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              crm: { type: 'string' },
              experience: { type: 'number' },
              consultationFee: { type: 'number' },
              consultationDuration: { type: 'number' },
              isActive: { type: 'boolean' },
              acceptsNewPatients: { type: 'boolean' },
              user: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  fullName: { type: 'string' },
                  avatar: { type: 'string' },
                },
              },
            },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Querystring: any }>, reply: FastifyReply) => {
    // TODO: Implement get doctors by specialty logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Get doctors by specialty endpoint not yet implemented',
      },
    });
  });
}