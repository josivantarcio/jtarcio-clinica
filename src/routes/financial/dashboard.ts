/**
 * Financial Dashboard Routes
 * Real-time financial KPIs and dashboard data
 */

import { FastifyInstance } from 'fastify';
import { FinancialService } from '@/services/financial.service';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  const financialService = new FinancialService(fastify.prisma);

  // Get dashboard data
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Financial Dashboard'],
        summary: 'Get financial dashboard data',
        description:
          'Returns real-time financial KPIs, charts and recent activity',
        querystring: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['week', 'month', 'quarter', 'year'],
              default: 'month',
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
                  // KPIs
                  totalRevenue: { type: 'number' },
                  totalExpenses: { type: 'number' },
                  netProfit: { type: 'number' },
                  cashBalance: { type: 'number' },

                  // Growth indicators
                  revenueGrowth: { type: 'number' },
                  expenseGrowth: { type: 'number' },
                  profitGrowth: { type: 'number' },

                  // Recent activity
                  recentTransactions: { type: 'array' },
                  upcomingPayments: { type: 'array' },
                  overdueReceivables: { type: 'array' },

                  // Chart data
                  cashFlowData: { type: 'array' },
                  revenueByPeriod: { type: 'array' },
                  expensesByCategory: { type: 'array' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { period = 'month' } = request.query as { period?: string };

        const dashboardData = await financialService.getDashboardData(
          request.user.id,
          request.user.role,
        );

        return {
          success: true,
          data: dashboardData,
        };
      } catch (error) {
        request.log.error(error, 'Error loading financial dashboard');

        return reply.status(500).send({
          success: false,
          error: 'Failed to load financial dashboard data',
          code: 'DASHBOARD_ERROR',
        });
      }
    },
  );

  // Get specific KPI
  fastify.get(
    '/kpi/:metric',
    {
      schema: {
        tags: ['Financial Dashboard'],
        summary: 'Get specific KPI metric',
        params: {
          type: 'object',
          properties: {
            metric: {
              type: 'string',
              enum: [
                'revenue',
                'expenses',
                'profit',
                'cash_balance',
                'receivables',
                'payables',
              ],
            },
          },
          required: ['metric'],
        },
        querystring: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['day', 'week', 'month', 'quarter', 'year'],
              default: 'month',
            },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { metric } = request.params as { metric: string };
        const { period = 'month', startDate, endDate } = request.query as any;

        // Calculate date range based on period
        const now = new Date();
        let start: Date, end: Date;

        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
        } else {
          switch (period) {
            case 'day':
              start = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
              );
              end = now;
              break;
            case 'week':
              start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              end = now;
              break;
            case 'month':
              start = new Date(now.getFullYear(), now.getMonth(), 1);
              end = now;
              break;
            case 'quarter':
              const quarter = Math.floor(now.getMonth() / 3);
              start = new Date(now.getFullYear(), quarter * 3, 1);
              end = now;
              break;
            case 'year':
              start = new Date(now.getFullYear(), 0, 1);
              end = now;
              break;
            default:
              start = new Date(now.getFullYear(), now.getMonth(), 1);
              end = now;
          }
        }

        let value: number;
        let previousValue: number;

        switch (metric) {
          case 'revenue':
            const revenueResult =
              await fastify.prisma.financialTransaction.aggregate({
                _sum: { netAmount: true },
                where: {
                  transactionType: 'RECEIPT',
                  status: { in: ['PAID', 'CONFIRMED'] },
                  createdAt: { gte: start, lte: end },
                },
              });
            value = Number(revenueResult._sum.netAmount || 0);
            break;

          case 'expenses':
            const expensesResult =
              await fastify.prisma.accountsPayable.aggregate({
                _sum: { netAmount: true },
                where: {
                  status: 'PAID',
                  paymentDate: { gte: start, lte: end },
                },
              });
            value = Number(expensesResult._sum.netAmount || 0);
            break;

          case 'profit':
            const [revenue, expenses] = await Promise.all([
              fastify.prisma.financialTransaction.aggregate({
                _sum: { netAmount: true },
                where: {
                  transactionType: 'RECEIPT',
                  status: { in: ['PAID', 'CONFIRMED'] },
                  createdAt: { gte: start, lte: end },
                },
              }),
              fastify.prisma.accountsPayable.aggregate({
                _sum: { netAmount: true },
                where: {
                  status: 'PAID',
                  paymentDate: { gte: start, lte: end },
                },
              }),
            ]);
            value =
              Number(revenue._sum.netAmount || 0) -
              Number(expenses._sum.netAmount || 0);
            break;

          case 'cash_balance':
            const [totalReceived, totalPaid] = await Promise.all([
              fastify.prisma.financialTransaction.aggregate({
                _sum: { netAmount: true },
                where: {
                  transactionType: 'RECEIPT',
                  status: { in: ['PAID', 'CONFIRMED'] },
                },
              }),
              fastify.prisma.accountsPayable.aggregate({
                _sum: { netAmount: true },
                where: { status: 'PAID' },
              }),
            ]);
            value =
              Number(totalReceived._sum.netAmount || 0) -
              Number(totalPaid._sum.netAmount || 0);
            break;

          case 'receivables':
            const receivablesResult =
              await fastify.prisma.financialTransaction.aggregate({
                _sum: { netAmount: true },
                where: {
                  transactionType: 'RECEIPT',
                  status: { in: ['PENDING', 'CONFIRMED'] },
                },
              });
            value = Number(receivablesResult._sum.netAmount || 0);
            break;

          case 'payables':
            const payablesResult =
              await fastify.prisma.accountsPayable.aggregate({
                _sum: { netAmount: true },
                where: {
                  status: { in: ['PENDING', 'APPROVED'] },
                },
              });
            value = Number(payablesResult._sum.netAmount || 0);
            break;

          default:
            return reply.status(400).send({
              success: false,
              error: 'Invalid metric requested',
              code: 'INVALID_METRIC',
            });
        }

        return {
          success: true,
          data: {
            metric,
            value,
            period,
            startDate: start,
            endDate: end,
            formattedValue: new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value),
          },
        };
      } catch (error) {
        request.log.error(error, `Error loading KPI metric: ${request.params}`);

        return reply.status(500).send({
          success: false,
          error: 'Failed to load KPI metric',
          code: 'KPI_ERROR',
        });
      }
    },
  );
}
