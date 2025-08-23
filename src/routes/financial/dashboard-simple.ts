/**
 * Simplified Financial Dashboard Routes
 * Basic implementation for testing purposes
 */

import { FastifyInstance } from 'fastify';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Get basic dashboard data
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Financial Dashboard'],
        summary: 'Get financial dashboard data',
        description: 'Returns basic financial KPIs and data',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  totalRevenue: { type: 'number' },
                  totalExpenses: { type: 'number' },
                  netProfit: { type: 'number' },
                  cashBalance: { type: 'number' },
                  revenueGrowth: { type: 'number' },
                  expenseGrowth: { type: 'number' },
                  profitGrowth: { type: 'number' },
                  recentTransactions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        description: { type: 'string' },
                        netAmount: { type: 'number' },
                        transactionType: { type: 'string' },
                        date: { type: 'string' },
                      },
                    },
                  },
                  upcomingPayments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        description: { type: 'string' },
                        netAmount: { type: 'number' },
                        dueDate: { type: 'string' },
                      },
                    },
                  },
                  overdueReceivables: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        description: { type: 'string' },
                        netAmount: { type: 'number' },
                        dueDate: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Simple mock data for testing
        const dashboardData = {
          totalRevenue: 125000,
          totalExpenses: 45000,
          netProfit: 80000,
          cashBalance: 250000,
          revenueGrowth: 12.5,
          expenseGrowth: 3.2,
          profitGrowth: 8.7,
          recentTransactions: [
            {
              id: 'trans-001',
              description: 'Consulta - Dr. João Silva',
              netAmount: 200,
              transactionType: 'RECEIPT',
              date: new Date().toISOString(),
            }
          ],
          upcomingPayments: [
            {
              id: 'pay-001',
              description: 'Aluguel da Clínica',
              netAmount: 5000,
              dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            }
          ],
          overdueReceivables: [
            {
              id: 'rec-001',
              description: 'Consulta - Cliente Pendente',
              netAmount: 180,
              dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            }
          ]
        };

        return {
          success: true,
          data: dashboardData,
        };
      } catch (error) {
        console.error('Dashboard error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to load financial dashboard data',
          code: 'DASHBOARD_ERROR',
        });
      }
    },
  );

  // Get KPIs endpoint
  fastify.get(
    '/kpis',
    {
      schema: {
        tags: ['Financial Dashboard'],
        summary: 'Get financial KPIs',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  revenue: { type: 'number' },
                  expenses: { type: 'number' },
                  profit: { type: 'number' },
                  growth: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        return {
          success: true,
          data: {
            revenue: 125000,
            expenses: 45000,
            profit: 80000,
            growth: 12.5,
          },
        };
      } catch (error) {
        console.error('KPIs error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to load KPIs',
          code: 'KPI_ERROR',
        });
      }
    },
  );
}
