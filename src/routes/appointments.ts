import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  CompleteAppointmentDto,
} from '@/types/appointment';
import { AppointmentBooking } from '@/types/scheduling';
import { ServiceFactory } from '@/services';
import { rateLimiters } from '@/middleware/rateLimiting';

export async function appointmentRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // Create appointment
  fastify.post(
    '/',
    {
      preHandler: [rateLimiters.createAppointment],
      schema: {
        tags: ['Appointments'],
        summary: 'Create new appointment',
        security: [{ Bearer: [] }],
        body: {
          type: 'object',
          required: [
            'patientId',
            'doctorId',
            'specialtyId',
            'slotId',
            'appointmentType',
            'duration',
          ],
          properties: {
            patientId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
            doctorId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
            specialtyId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
            slotId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
            appointmentType: {
              type: 'string',
              enum: [
                'CONSULTATION',
                'FOLLOW_UP',
                'EMERGENCY',
                'ROUTINE_CHECKUP',
              ],
            },
            duration: { type: 'number', minimum: 1 },
            reason: { type: 'string', minLength: 10 },
            symptoms: { type: 'string' },
            notes: { type: 'string' },
            urgencyLevel: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              default: 5,
            },
            preferredLanguage: { type: 'string' },
            specialRequests: {
              type: 'array',
              items: { type: 'string' },
            },
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
                  patientId: { type: 'string' },
                  doctorId: { type: 'string' },
                  specialtyId: { type: 'string' },
                  status: { type: 'string' },
                  scheduledAt: { type: 'string' },
                  duration: { type: 'number' },
                  appointmentType: { type: 'string' },
                  reason: { type: 'string' },
                  symptoms: { type: 'string' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  warnings: { type: 'array', items: { type: 'string' } },
                  suggestedImprovements: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  confirmationRequired: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: AppointmentBooking }>,
      reply: FastifyReply,
    ) => {
      try {
        const services = ServiceFactory.getInstance();
        const _userId = request.user?.id; // Assuming auth middleware sets user

        const result = await services.appointmentService.bookAppointment(
          request.body,
        );

        return reply.status(201).send({
          success: true,
          data: result.appointment,
          meta: {
            warnings: result.warnings,
            suggestedImprovements: result.suggestedImprovements,
            confirmationRequired: result.confirmationRequired,
          },
        });
      } catch (error) {
        fastify.log.error('Error creating appointment', {
          error,
          body: request.body,
        });

        return reply.status(400).send({
          success: false,
          error: {
            code: 'BOOKING_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to create appointment',
          },
        });
      }
    },
  );

  // Get all appointments
  fastify.get(
    '/',
    {
      preHandler: [rateLimiters.general],
      schema: {
        tags: ['Appointments'],
        summary: 'Get appointments',
        security: [{ Bearer: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sortBy: { type: 'string' },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
            },
            doctorId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
            patientId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
            specialtyId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
            status: { type: 'string' },
            appointmentType: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            search: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  appointments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        patientId: { type: 'string' },
                        doctorId: { type: 'string' },
                        specialtyId: { type: 'string' },
                        status: { type: 'string' },
                        scheduledAt: { type: 'string' },
                        duration: { type: 'number' },
                        appointmentType: { type: 'string' },
                        reason: { type: 'string' },
                        symptoms: { type: 'string' },
                        notes: { type: 'string' },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' },
                      },
                    },
                  },
                  total: { type: 'number' },
                  page: { type: 'number' },
                  pageSize: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: any }>,
      reply: FastifyReply,
    ) => {
      try {
        const services = ServiceFactory.getInstance();
        const _userId = request.user?.id;
        const userRole = request.user?.role || 'PATIENT';

        const filters = {
          ...request.query,
          skip: request.query.page
            ? (request.query.page - 1) * (request.query.pageSize || 20)
            : 0,
          take: request.query.pageSize || 20,
        };

        const result = await services.appointmentService.searchAppointments(
          filters,
          _userId,
          userRole,
        );

        return reply.send({
          success: true,
          data: {
            appointments: result.appointments,
            total: result.total,
            page: request.query.page || 1,
            pageSize: request.query.pageSize || 20,
          },
        });
      } catch (error) {
        console.error('=== APPOINTMENTS ERROR DETAILS ===');
        console.error('Error:', error);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        console.error('Query:', request.query);
        console.error('User ID:', _userId);
        console.error('User Role:', userRole);
        console.error('=====================================');

        fastify.log.error('Error getting appointments', {
          error,
          query: request.query,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to retrieve appointments',
          },
        });
      }
    },
  );

  // Get appointment by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Get appointment by ID',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  patientId: { type: 'string' },
                  doctorId: { type: 'string' },
                  specialtyId: { type: 'string' },
                  status: { type: 'string' },
                  scheduledAt: { type: 'string' },
                  duration: { type: 'number' },
                  appointmentType: { type: 'string' },
                  reason: { type: 'string' },
                  symptoms: { type: 'string' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const services = ServiceFactory.getInstance();
        const _userId = request.user?.id;

        const appointment =
          await services.appointmentService.getAppointmentById(
            request.params.id,
            _userId,
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
          data: appointment,
        });
      } catch (error) {
        fastify.log.error('Error getting appointment by ID', {
          error,
          appointmentId: request.params.id,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to retrieve appointment',
          },
        });
      }
    },
  );

  // Update appointment
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Update appointment',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
          },
        },
        body: {
          type: 'object',
          properties: {
            scheduledAt: { type: 'string', format: 'date-time' },
            duration: { type: 'number', minimum: 1 },
            reason: { type: 'string' },
            symptoms: { type: 'string' },
            notes: { type: 'string' },
            status: {
              type: 'string',
              enum: [
                'SCHEDULED',
                'CONFIRMED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW',
              ],
            },
            urgencyLevel: { type: 'number', minimum: 1, maximum: 10 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  patientId: { type: 'string' },
                  doctorId: { type: 'string' },
                  specialtyId: { type: 'string' },
                  status: { type: 'string' },
                  scheduledAt: { type: 'string' },
                  duration: { type: 'number' },
                  appointmentType: { type: 'string' },
                  reason: { type: 'string' },
                  symptoms: { type: 'string' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: any }>,
      reply: FastifyReply,
    ) => {
      // TODO: Implement update appointment logic
      return reply.status(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Update appointment endpoint not yet implemented',
        },
      });
    },
  );

  // Reschedule appointment
  fastify.post(
    '/:id/reschedule',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Reschedule appointment',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
          },
        },
        body: {
          type: 'object',
          required: ['newScheduledAt'],
          properties: {
            newScheduledAt: { type: 'string', format: 'date-time' },
            reason: { type: 'string', minLength: 10 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  patientId: { type: 'string' },
                  doctorId: { type: 'string' },
                  specialtyId: { type: 'string' },
                  status: { type: 'string' },
                  scheduledAt: { type: 'string' },
                  duration: { type: 'number' },
                  appointmentType: { type: 'string' },
                  reason: { type: 'string' },
                  symptoms: { type: 'string' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: RescheduleAppointmentDto;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const services = ServiceFactory.getInstance();
        const _userId = request.user?.id;

        const result = await services.appointmentService.rescheduleAppointment(
          request.params.id,
          request.body,
          _userId,
        );

        return reply.send({
          success: true,
          data: result.appointment,
          meta: {
            fee: result.fee,
            originalSlotReleased: result.originalSlotReleased,
            notificationsSent: result.notificationsSent,
          },
        });
      } catch (error) {
        fastify.log.error('Error rescheduling appointment', {
          error,
          appointmentId: request.params.id,
          body: request.body,
        });

        return reply.status(400).send({
          success: false,
          error: {
            code: 'RESCHEDULE_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to reschedule appointment',
          },
        });
      }
    },
  );

  // Cancel appointment
  fastify.post(
    '/:id/cancel',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Cancel appointment',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
          },
        },
        body: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 10 },
            code: { type: 'string' },
            refundable: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  refundAmount: { type: 'number' },
                  cancellationFee: { type: 'number' },
                  reschedulingSuggestions: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: CancelAppointmentDto;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const services = ServiceFactory.getInstance();
        const _userId = request.user?.id;

        const result = await services.appointmentService.cancelAppointment(
          request.params.id,
          request.body,
          _userId,
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error('Error cancelling appointment', {
          error,
          appointmentId: request.params.id,
          body: request.body,
        });

        return reply.status(400).send({
          success: false,
          error: {
            code: 'CANCELLATION_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to cancel appointment',
          },
        });
      }
    },
  );

  // Confirm appointment
  fastify.post(
    '/:id/confirm',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Confirm appointment',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
          },
        },
        body: {
          type: 'object',
          properties: {
            confirmedAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  patientId: { type: 'string' },
                  doctorId: { type: 'string' },
                  specialtyId: { type: 'string' },
                  status: { type: 'string' },
                  scheduledAt: { type: 'string' },
                  duration: { type: 'number' },
                  appointmentType: { type: 'string' },
                  reason: { type: 'string' },
                  symptoms: { type: 'string' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: any }>,
      reply: FastifyReply,
    ) => {
      // TODO: Implement confirm appointment logic
      return reply.status(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Confirm appointment endpoint not yet implemented',
        },
      });
    },
  );

  // Complete appointment
  fastify.post(
    '/:id/complete',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Complete appointment',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
          },
        },
        body: {
          type: 'object',
          properties: {
            diagnosis: { type: 'string' },
            treatment: { type: 'string' },
            notes: { type: 'string' },
            prescriptions: {
              type: 'array',
              items: { type: 'string' },
            },
            followUpRequired: { type: 'boolean' },
            followUpDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  patientId: { type: 'string' },
                  doctorId: { type: 'string' },
                  specialtyId: { type: 'string' },
                  status: { type: 'string' },
                  scheduledAt: { type: 'string' },
                  duration: { type: 'number' },
                  appointmentType: { type: 'string' },
                  reason: { type: 'string' },
                  symptoms: { type: 'string' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: CompleteAppointmentDto;
      }>,
      reply: FastifyReply,
    ) => {
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

        const appointment =
          await services.appointmentService.completeAppointment(
            request.params.id,
            request.body,
            doctorId,
          );

        return reply.send({
          success: true,
          data: appointment,
        });
      } catch (error) {
        fastify.log.error('Error completing appointment', {
          error,
          appointmentId: request.params.id,
          body: request.body,
        });

        return reply.status(400).send({
          success: false,
          error: {
            code: 'COMPLETION_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to complete appointment',
          },
        });
      }
    },
  );

  // Get appointment history
  fastify.get(
    '/patient/:patientId/history',
    {
      schema: {
        tags: ['Appointments'],
        summary: 'Get patient appointment history',
        security: [{ Bearer: [] }],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: {
              type: 'string',
              minLength: 20,
              maxLength: 30,
              pattern: '^c[a-z0-9]+$',
            }, // CUID format
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    patientId: { type: 'string' },
                    doctorId: { type: 'string' },
                    specialtyId: { type: 'string' },
                    status: { type: 'string' },
                    scheduledAt: { type: 'string' },
                    duration: { type: 'number' },
                    appointmentType: { type: 'string' },
                    reason: { type: 'string' },
                    symptoms: { type: 'string' },
                    notes: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { patientId: string };
        Querystring: { limit?: number };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const services = ServiceFactory.getInstance();
        const _userId = request.user?.id;
        const userRole = request.user?.role;

        // Check authorization - patients can only view their own history
        if (
          userRole === 'PATIENT' &&
          request.user?.patientId !== request.params.patientId
        ) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: "Cannot access other patients' appointment history",
            },
          });
        }

        const appointments =
          await services.appointmentService.getAppointmentHistory(
            request.params.patientId,
            request.query.limit || 10,
          );

        return reply.send({
          success: true,
          data: appointments,
        });
      } catch (error) {
        fastify.log.error('Error getting appointment history', {
          error,
          patientId: request.params.patientId,
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to retrieve appointment history',
          },
        });
      }
    },
  );
}
