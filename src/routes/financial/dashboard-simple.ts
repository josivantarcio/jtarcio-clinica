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
                  overview: {
                    type: 'object',
                    properties: {
                      totalRevenue: { type: 'number' },
                      totalExpenses: { type: 'number' },
                      netProfit: { type: 'number' },
                      cashBalance: { type: 'number' }
                    }
                  },
                  kpis: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        value: { type: 'string' },
                        change: { type: 'string' },
                        changeType: { type: 'string' }
                      }
                    }
                  },
                  recentTransactions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        description: { type: 'string' },
                        amount: { type: 'number' },
                        type: { type: 'string' },
                        date: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        // Simple mock data for testing
        const dashboardData = {
          overview: {
            totalRevenue: 125000.00,
            totalExpenses: 45000.00,
            netProfit: 80000.00,
            cashBalance: 250000.00
          },
          kpis: [
            {
              title: 'Receita Mensal',
              value: 'R$ 125.000',
              change: '+12.5%',
              changeType: 'positive'
            },
            {
              title: 'Despesas Mensais', 
              value: 'R$ 45.000',
              change: '+3.2%',
              changeType: 'negative'
            },
            {
              title: 'Lucro Líquido',
              value: 'R$ 80.000',
              change: '+18.7%',
              changeType: 'positive'
            },
            {
              title: 'Contas a Receber',
              value: 'R$ 35.000',
              change: '-5.1%',
              changeType: 'negative'
            }
          ],
          recentTransactions: [
            {
              id: 'trans-001',
              description: 'Consulta - Dr. João Silva',
              amount: 200.00,
              type: 'INCOME',
              date: new Date().toISOString()
            },
            {
              id: 'trans-002', 
              description: 'Fornecedor - Material Médico',
              amount: -1500.00,
              type: 'EXPENSE',
              date: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: 'trans-003',
              description: 'Consulta - Dra. Maria Santos',
              amount: 250.00,
              type: 'INCOME',
              date: new Date(Date.now() - 172800000).toISOString()
            }
          ]
        };

        return {
          success: true,
          data: dashboardData
        };
      } catch (error) {
        console.error('Dashboard error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to load financial dashboard data',
          code: 'DASHBOARD_ERROR'
        });
      }
    }
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
                  growth: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        return {
          success: true,
          data: {
            revenue: 125000,
            expenses: 45000,
            profit: 80000,
            growth: 12.5
          }
        };
      } catch (error) {
        console.error('KPIs error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to load KPIs',
          code: 'KPI_ERROR'
        });
      }
    }
  );
}