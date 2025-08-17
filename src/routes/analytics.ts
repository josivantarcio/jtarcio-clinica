import { FastifyInstance } from 'fastify';
import { PrismaClient } from '../database/generated/client';
import { verifyJWT } from '../plugins/auth';

const prisma = new PrismaClient();

// Types for Analytics API
interface AnalyticsOverview {
  totalRevenue: number;
  totalAppointments: number;
  totalPatients: number;
  averageRating: number;
  revenueGrowth: number;
  appointmentGrowth: number;
  patientGrowth: number;
  satisfactionGrowth: number;
}

interface AnalyticsAdvanced {
  conversionRate: number;
  churnRate: number;
  customerLifetimeValue: number;
  averageSessionTime: number;
  bounceRate: number;
  retentionRate: number;
  npsScore: number;
  operationalEfficiency: number;
}

interface AnalyticsPredictions {
  nextMonthRevenue: number;
  nextMonthAppointments: number;
  capacity: number;
  demandForecast: string;
  seasonalTrends: string[];
}

interface AnalyticsRealTime {
  activeUsers: number;
  todayBookings: number;
  systemLoad: number;
  responseTime: number;
}

interface AnalyticsResponse {
  overview: AnalyticsOverview;
  advanced: AnalyticsAdvanced;
  predictions: AnalyticsPredictions;
  realTime: AnalyticsRealTime;
}

export async function analyticsRoutes(fastify: FastifyInstance) {
  console.log('=== ANALYTICS ROUTES LOADED ===');
  // Get Analytics Data
  fastify.get(
    '/analytics',
    {
      // preHandler: [verifyJWT], // Temporarily disabled for debugging
      schema: {
        description: 'Get comprehensive analytics data',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            period: {
              type: 'string',
              enum: ['today', 'week', 'month', 'quarter', 'year'],
            },
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
                  overview: { type: 'object' },
                  advanced: { type: 'object' },
                  predictions: { type: 'object' },
                  realTime: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        console.log('=== DEBUG ANALYTICS ENDPOINT ===');
        const { startDate, endDate, period = 'month' } = request.query as any;

        // Calculate date range
        const now = new Date();
        let rangeStart: Date;
        let rangeEnd: Date = new Date(now);

        if (startDate && endDate) {
          rangeStart = new Date(startDate);
          rangeEnd = new Date(endDate);
        } else {
          switch (period) {
            case 'today':
              rangeStart = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
              );
              break;
            case 'week':
              rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'quarter':
              rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case 'year':
              rangeStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
            default: // month
              rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          }
        }

        // Calculate previous period for growth comparison
        const periodDuration = rangeEnd.getTime() - rangeStart.getTime();
        const previousStart = new Date(rangeStart.getTime() - periodDuration);
        const previousEnd = new Date(rangeStart.getTime());

        // OVERVIEW METRICS
        const [
          totalAppointments,
          totalPatients,
          totalRevenue,
          previousAppointments,
          previousPatients,
          previousRevenue,
          todayAppointments,
          newPatientsThisPeriod,
        ] = await Promise.all([
          // Current period
          prisma.appointment.count({
            where: {
              scheduledAt: { gte: rangeStart, lte: rangeEnd },
              status: { not: 'CANCELLED' },
            },
          }),
          // Total patients (all time) - this should show overall count
          prisma.user.count({
            where: {
              role: 'PATIENT',
            },
          }).then(count => {
            console.log('DEBUG: Total patients count:', count);
            return count;
          }),
          prisma.appointment.aggregate({
            where: {
              scheduledAt: { gte: rangeStart, lte: rangeEnd },
              status: 'COMPLETED',
              fee: { not: null },
            },
            _sum: { fee: true },
          }),
          // Previous period for growth calculation
          prisma.appointment.count({
            where: {
              scheduledAt: { gte: previousStart, lte: previousEnd },
              status: { not: 'CANCELLED' },
            },
          }),
          prisma.user.count({
            where: {
              role: 'PATIENT',
              createdAt: { gte: previousStart, lte: previousEnd },
            },
          }),
          prisma.appointment.aggregate({
            where: {
              scheduledAt: { gte: previousStart, lte: previousEnd },
              status: 'COMPLETED',
              fee: { not: null },
            },
            _sum: { fee: true },
          }),
          // Today's bookings for real-time
          prisma.appointment.count({
            where: {
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                lt: new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate() + 1,
                ),
              },
            },
          }),
          // New patients this period (for growth calculation)
          prisma.user.count({
            where: {
              role: 'PATIENT',
              createdAt: { gte: rangeStart, lte: rangeEnd },
            },
          }),
        ]);

        // Calculate growth percentages
        const revenueGrowth = previousRevenue._sum.fee
          ? ((Number(totalRevenue._sum.fee || 0) -
              Number(previousRevenue._sum.fee)) /
              Number(previousRevenue._sum.fee)) *
            100
          : 0;

        const appointmentGrowth = previousAppointments
          ? ((totalAppointments - previousAppointments) /
              previousAppointments) *
            100
          : 0;

        const patientGrowth = previousPatients
          ? ((newPatientsThisPeriod - previousPatients) / previousPatients) * 100
          : 0;

        // ADVANCED METRICS
        const completedAppointments = await prisma.appointment.count({
          where: {
            scheduledAt: { gte: rangeStart, lte: rangeEnd },
            status: 'COMPLETED',
          },
        });

        const cancelledAppointments = await prisma.appointment.count({
          where: {
            scheduledAt: { gte: rangeStart, lte: rangeEnd },
            status: 'CANCELLED',
          },
        });

        const totalScheduled = totalAppointments + cancelledAppointments;
        const conversionRate =
          totalScheduled > 0
            ? (completedAppointments / totalScheduled) * 100
            : 0;
        const cancelRate =
          totalScheduled > 0
            ? (cancelledAppointments / totalScheduled) * 100
            : 0;

        // Calculate average revenue per patient
        const avgRevenuePerPatient =
          totalPatients > 0
            ? Number(totalRevenue._sum.fee || 0) / totalPatients
            : 0;

        // PREDICTIONS (simplified algorithms)
        const avgDailyRevenue =
          periodDuration > 0
            ? Number(totalRevenue._sum.fee || 0) /
              (periodDuration / (24 * 60 * 60 * 1000))
            : 0;

        const avgDailyAppointments =
          periodDuration > 0
            ? totalAppointments / (periodDuration / (24 * 60 * 60 * 1000))
            : 0;

        const nextMonthRevenue =
          avgDailyRevenue * 30 * (1 + revenueGrowth / 100);
        const nextMonthAppointments = Math.round(
          avgDailyAppointments * 30 * (1 + appointmentGrowth / 100),
        );

        // Capacity calculation (assuming 8 hours/day, 30 min/appointment)
        const maxDailyCapacity = 16; // 8 hours * 2 appointments per hour
        const currentCapacity =
          avgDailyAppointments > 0
            ? (avgDailyAppointments / maxDailyCapacity) * 100
            : 0;

        // Demand forecast based on growth trends
        let demandForecast = 'Estável';
        if (appointmentGrowth > 15) demandForecast = 'Alto';
        else if (appointmentGrowth < -10) demandForecast = 'Baixo';

        // Seasonal trends (simplified)
        const seasonalTrends = [
          `Crescimento atual: ${appointmentGrowth.toFixed(1)}%`,
          `Receita: ${revenueGrowth.toFixed(1)}%`,
          `Pacientes: ${patientGrowth.toFixed(1)}%`,
        ];

        // Real-time metrics (simplified for now)
        const activeUsers = Math.floor(Math.random() * 50) + 10; // Placeholder
        const systemLoad = Math.floor(Math.random() * 30) + 40; // Placeholder
        const responseTime = Math.floor(Math.random() * 100) + 150; // Placeholder

        const analyticsData: AnalyticsResponse = {
          overview: {
            totalRevenue: Number(totalRevenue._sum.fee || 0),
            totalAppointments,
            totalPatients,
            averageRating: 4.5, // Placeholder - could be calculated from feedback
            revenueGrowth: Number(revenueGrowth.toFixed(1)),
            appointmentGrowth: Number(appointmentGrowth.toFixed(1)),
            patientGrowth: Number(patientGrowth.toFixed(1)),
            satisfactionGrowth: 2.1, // Placeholder
          },
          advanced: {
            conversionRate: Number(conversionRate.toFixed(1)),
            churnRate: Number(cancelRate.toFixed(1)),
            customerLifetimeValue: Number(avgRevenuePerPatient.toFixed(2)),
            averageSessionTime: 15.5, // Placeholder
            bounceRate: 12.3, // Placeholder
            retentionRate: 100 - Number(cancelRate.toFixed(1)),
            npsScore: 75, // Placeholder
            operationalEfficiency: Math.max(
              0,
              100 - Number(cancelRate.toFixed(1)),
            ),
          },
          predictions: {
            nextMonthRevenue: Number(nextMonthRevenue.toFixed(2)),
            nextMonthAppointments,
            capacity: Number(currentCapacity.toFixed(1)),
            demandForecast,
            seasonalTrends,
          },
          realTime: {
            activeUsers,
            todayBookings: todayAppointments,
            systemLoad,
            responseTime,
          },
        };

        return reply.send({
          success: true,
          data: analyticsData,
        });
      } catch (error) {
        fastify.log.error('Error fetching analytics:', error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'ANALYTICS_ERROR',
            message: 'Erro ao buscar dados de analytics',
          },
        });
      }
    },
  );

  // Get Revenue Chart Data
  fastify.get(
    '/analytics/revenue-chart',
    {
      preHandler: [verifyJWT],
      schema: {
        description: 'Get revenue chart data by period',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['week', 'month', 'quarter', 'year'],
            },
            granularity: { type: 'string', enum: ['day', 'week', 'month'] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { period = 'month', granularity: _granularity = 'day' } =
          request.query as any;

        const now = new Date();
        let rangeStart: Date;

        switch (period) {
          case 'week':
            rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            rangeStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get revenue data grouped by period
        const revenueData = await prisma.appointment.groupBy({
          by: ['scheduledAt'],
          where: {
            scheduledAt: { gte: rangeStart, lte: now },
            status: 'COMPLETED',
            fee: { not: null },
          },
          _sum: { fee: true },
          orderBy: { scheduledAt: 'asc' },
        });

        // Process data according to granularity
        const chartData = revenueData.map(item => ({
          date: item.scheduledAt.toISOString().split('T')[0],
          revenue: Number(item._sum.fee || 0),
        }));

        return reply.send({
          success: true,
          data: chartData,
        });
      } catch (error) {
        fastify.log.error('Error fetching revenue chart:', error);
        return reply.status(500).send({
          success: false,
          error: {
            code: 'CHART_ERROR',
            message: 'Erro ao buscar dados do gráfico',
          },
        });
      }
    },
  );
}
