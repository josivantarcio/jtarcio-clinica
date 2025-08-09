import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { availabilityQuerySchema, timeSlotSchema } from '@/types/appointment';
import { responseSchema } from '@/types/common';

export async function availabilityRoutes(fastify: FastifyInstance): Promise<void> {
  // Get doctor availability
  fastify.get('/doctor/:doctorId', {
    schema: {
      tags: ['Availability'],
      summary: 'Get doctor availability',
      params: {
        type: 'object',
        required: ['doctorId'],
        properties: {
          doctorId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        required: ['date'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          duration: { type: 'number', minimum: 15, maximum: 120, default: 30 },
        },
      },
      response: {
        200: responseSchema({
          type: 'object',
          properties: {
            doctorId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            timeSlots: {
              type: 'array',
              items: timeSlotSchema,
            },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { doctorId: string }; Querystring: any }>, reply: FastifyReply) => {
    // TODO: Implement get doctor availability logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Get doctor availability endpoint not yet implemented',
      },
    });
  });

  // Get availability by specialty
  fastify.get('/specialty/:specialtyId', {
    schema: {
      tags: ['Availability'],
      summary: 'Get availability by specialty',
      params: {
        type: 'object',
        required: ['specialtyId'],
        properties: {
          specialtyId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        required: ['date'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          duration: { type: 'number', minimum: 15, maximum: 120 },
        },
      },
      response: {
        200: responseSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              doctorId: { type: 'string', format: 'uuid' },
              doctor: {
                type: 'object',
                properties: {
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
              timeSlots: {
                type: 'array',
                items: timeSlotSchema,
              },
            },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { specialtyId: string }; Querystring: any }>, reply: FastifyReply) => {
    // TODO: Implement get availability by specialty logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Get availability by specialty endpoint not yet implemented',
      },
    });
  });

  // Create/Update doctor availability (doctor/admin only)
  fastify.post('/doctor/:doctorId', {
    schema: {
      tags: ['Availability'],
      summary: 'Create/Update doctor availability',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['doctorId'],
        properties: {
          doctorId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['dayOfWeek', 'startTime', 'endTime'],
        properties: {
          dayOfWeek: { type: 'number', minimum: 0, maximum: 6 },
          startTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$' },
          endTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$' },
          slotDuration: { type: 'number', minimum: 15, maximum: 120, default: 30 },
          validFrom: { type: 'string', format: 'date' },
          validUntil: { type: 'string', format: 'date' },
        },
      },
      response: {
        200: responseSchema({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            doctorId: { type: 'string', format: 'uuid' },
            dayOfWeek: { type: 'number' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            slotDuration: { type: 'number' },
            isActive: { type: 'boolean' },
            validFrom: { type: 'string', format: 'date-time' },
            validUntil: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { doctorId: string }; Body: any }>, reply: FastifyReply) => {
    // TODO: Implement create/update doctor availability logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Create doctor availability endpoint not yet implemented',
      },
    });
  });

  // Get doctor's availability settings
  fastify.get('/doctor/:doctorId/settings', {
    schema: {
      tags: ['Availability'],
      summary: 'Get doctor availability settings',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['doctorId'],
        properties: {
          doctorId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: responseSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              dayOfWeek: { type: 'number' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              slotDuration: { type: 'number' },
              isActive: { type: 'boolean' },
              validFrom: { type: 'string', format: 'date-time' },
              validUntil: { type: 'string', format: 'date-time' },
            },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { doctorId: string } }>, reply: FastifyReply) => {
    // TODO: Implement get doctor availability settings logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Get doctor availability settings endpoint not yet implemented',
      },
    });
  });

  // Update availability setting
  fastify.patch('/settings/:id', {
    schema: {
      tags: ['Availability'],
      summary: 'Update availability setting',
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
          startTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$' },
          endTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$' },
          slotDuration: { type: 'number', minimum: 15, maximum: 120 },
          isActive: { type: 'boolean' },
          validFrom: { type: 'string', format: 'date' },
          validUntil: { type: 'string', format: 'date' },
        },
      },
      response: {
        200: responseSchema({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            doctorId: { type: 'string', format: 'uuid' },
            dayOfWeek: { type: 'number' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            slotDuration: { type: 'number' },
            isActive: { type: 'boolean' },
            validFrom: { type: 'string', format: 'date-time' },
            validUntil: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
    // TODO: Implement update availability setting logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Update availability setting endpoint not yet implemented',
      },
    });
  });

  // Delete availability setting
  fastify.delete('/settings/:id', {
    schema: {
      tags: ['Availability'],
      summary: 'Delete availability setting',
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
    // TODO: Implement delete availability setting logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Delete availability setting endpoint not yet implemented',
      },
    });
  });
}