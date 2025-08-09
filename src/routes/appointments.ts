import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  confirmAppointmentSchema,
  completeAppointmentSchema,
  searchAppointmentsSchema,
  appointmentSchema,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  CompleteAppointmentDto
} from '@/types/appointment';
import { appointmentBookingSchema, AppointmentBooking } from '@/types/scheduling';
import { paginationSchema, responseSchema } from '@/types/common';
import { ServiceFactory } from '@/services';

export async function appointmentRoutes(fastify: FastifyInstance): Promise<void> {
  // Create appointment
  fastify.post('/', {
    schema: {
      tags: ['Appointments'],
      summary: 'Create new appointment',
      security: [{ Bearer: [] }],
      body: appointmentBookingSchema,
      response: {
        201: responseSchema(appointmentSchema),
      },
    },
  }, async (request: FastifyRequest<{ Body: AppointmentBooking }>, reply: FastifyReply) => {
    try {
      const services = ServiceFactory.getInstance();
      const userId = request.user?.id; // Assuming auth middleware sets user
      
      const result = await services.appointmentService.bookAppointment(request.body);
      
      return reply.status(201).send({
        success: true,
        data: result.appointment,
        meta: {
          warnings: result.warnings,
          suggestedImprovements: result.suggestedImprovements,
          confirmationRequired: result.confirmationRequired
        }
      });
    } catch (error) {
      fastify.log.error('Error creating appointment', { error, body: request.body });
      
      return reply.status(400).send({
        success: false,
        error: {
          code: 'BOOKING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create appointment',
        },
      });
    }
  });

  // Get all appointments
  fastify.get('/', {
    schema: {
      tags: ['Appointments'],
      summary: 'Get appointments',
      security: [{ Bearer: [] }],
      querystring: paginationSchema.merge(searchAppointmentsSchema),
      response: {
        200: responseSchema({
          type: 'object',
          properties: {
            appointments: {
              type: 'array',
              items: appointmentSchema,
            },
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' }
          }
        }),
      },
    },
  }, async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
    try {
      const services = ServiceFactory.getInstance();
      const userId = request.user?.id;
      const userRole = request.user?.role || 'PATIENT';
      
      const filters = {
        ...request.query,
        skip: request.query.page ? (request.query.page - 1) * (request.query.pageSize || 20) : 0,
        take: request.query.pageSize || 20
      };
      
      const result = await services.appointmentService.searchAppointments(filters, userId, userRole);
      
      return reply.send({
        success: true,
        data: {
          appointments: result.appointments,
          total: result.total,
          page: request.query.page || 1,
          pageSize: request.query.pageSize || 20
        }
      });
    } catch (error) {
      fastify.log.error('Error getting appointments', { error, query: request.query });
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve appointments',
        },
      });
    }
  });

  // Get appointment by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Appointments'],
      summary: 'Get appointment by ID',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: responseSchema(appointmentSchema),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const services = ServiceFactory.getInstance();
      const userId = request.user?.id;
      
      const appointment = await services.appointmentService.getAppointmentById(
        request.params.id, 
        userId
      );
      
      if (!appointment) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'APPOINTMENT_NOT_FOUND',
            message: 'Appointment not found or access denied',
          },
        });
      }
      
      return reply.send({
        success: true,
        data: appointment
      });
    } catch (error) {
      fastify.log.error('Error getting appointment by ID', { error, appointmentId: request.params.id });
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve appointment',
        },
      });
    }
  });

  // Update appointment
  fastify.patch('/:id', {
    schema: {
      tags: ['Appointments'],
      summary: 'Update appointment',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: updateAppointmentSchema,
      response: {
        200: responseSchema(appointmentSchema),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
    // TODO: Implement update appointment logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Update appointment endpoint not yet implemented',
      },
    });
  });

  // Reschedule appointment
  fastify.post('/:id/reschedule', {
    schema: {
      tags: ['Appointments'],
      summary: 'Reschedule appointment',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: rescheduleAppointmentSchema,
      response: {
        200: responseSchema(appointmentSchema),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: RescheduleAppointmentDto }>, reply: FastifyReply) => {
    try {
      const services = ServiceFactory.getInstance();
      const userId = request.user?.id;
      
      const result = await services.appointmentService.rescheduleAppointment(
        request.params.id,
        request.body,
        userId
      );
      
      return reply.send({
        success: true,
        data: result.appointment,
        meta: {
          fee: result.fee,
          originalSlotReleased: result.originalSlotReleased,
          notificationsSent: result.notificationsSent
        }
      });
    } catch (error) {
      fastify.log.error('Error rescheduling appointment', { 
        error, 
        appointmentId: request.params.id,
        body: request.body 
      });
      
      return reply.status(400).send({
        success: false,
        error: {
          code: 'RESCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reschedule appointment',
        },
      });
    }
  });

  // Cancel appointment
  fastify.post('/:id/cancel', {
    schema: {
      tags: ['Appointments'],
      summary: 'Cancel appointment',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: cancelAppointmentSchema,
      response: {
        200: responseSchema({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            refundAmount: { type: 'number' },
            cancellationFee: { type: 'number' },
            reschedulingSuggestions: {
              type: 'array',
              items: { type: 'object' }
            }
          }
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: CancelAppointmentDto }>, reply: FastifyReply) => {
    try {
      const services = ServiceFactory.getInstance();
      const userId = request.user?.id;
      
      const result = await services.appointmentService.cancelAppointment(
        request.params.id,
        request.body,
        userId
      );
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      fastify.log.error('Error cancelling appointment', { 
        error, 
        appointmentId: request.params.id,
        body: request.body 
      });
      
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANCELLATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to cancel appointment',
        },
      });
    }
  });

  // Confirm appointment
  fastify.post('/:id/confirm', {
    schema: {
      tags: ['Appointments'],
      summary: 'Confirm appointment',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: confirmAppointmentSchema,
      response: {
        200: responseSchema(appointmentSchema),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) => {
    // TODO: Implement confirm appointment logic
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Confirm appointment endpoint not yet implemented',
      },
    });
  });

  // Complete appointment
  fastify.post('/:id/complete', {
    schema: {
      tags: ['Appointments'],
      summary: 'Complete appointment',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: completeAppointmentSchema,
      response: {
        200: responseSchema(appointmentSchema),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: CompleteAppointmentDto }>, reply: FastifyReply) => {
    try {
      const services = ServiceFactory.getInstance();
      const doctorId = request.user?.doctorId; // Assuming auth middleware sets doctor info
      
      if (!doctorId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Only doctors can complete appointments',
          },
        });
      }
      
      const appointment = await services.appointmentService.completeAppointment(
        request.params.id,
        request.body,
        doctorId
      );
      
      return reply.send({
        success: true,
        data: appointment
      });
    } catch (error) {
      fastify.log.error('Error completing appointment', { 
        error, 
        appointmentId: request.params.id,
        body: request.body 
      });
      
      return reply.status(400).send({
        success: false,
        error: {
          code: 'COMPLETION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to complete appointment',
        },
      });
    }
  });

  // Get appointment history
  fastify.get('/patient/:patientId/history', {
    schema: {
      tags: ['Appointments'],
      summary: 'Get patient appointment history',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['patientId'],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 }
        }
      },
      response: {
        200: responseSchema({
          type: 'array',
          items: appointmentSchema
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { patientId: string }; Querystring: { limit?: number } }>, reply: FastifyReply) => {
    try {
      const services = ServiceFactory.getInstance();
      const userId = request.user?.id;
      const userRole = request.user?.role;
      
      // Check authorization - patients can only view their own history
      if (userRole === 'PATIENT' && request.user?.patientId !== request.params.patientId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Cannot access other patients\' appointment history',
          },
        });
      }
      
      const appointments = await services.appointmentService.getAppointmentHistory(
        request.params.patientId,
        request.query.limit || 10
      );
      
      return reply.send({
        success: true,
        data: appointments
      });
    } catch (error) {
      fastify.log.error('Error getting appointment history', { 
        error, 
        patientId: request.params.patientId 
      });
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to retrieve appointment history',
        },
      });
    }
  });
}