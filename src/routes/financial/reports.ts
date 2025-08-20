/**
 * Financial Reports Routes
 * Real database operations for comprehensive financial reporting
 */

import { FastifyInstance } from 'fastify';
import {
  checkFinancialPermission,
  applyFinancialDataFilter,
} from '@/middleware/financial-auth.middleware';

export default async function reportRoutes(fastify: FastifyInstance) {
  // Get cash flow report
  fastify.get(
    '/cash-flow',
    {
      preHandler: checkFinancialPermission('financial.reports.view'),
      schema: {
        tags: ['Financial Reports'],
        summary: 'Get cash flow report',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            period: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              default: 'monthly',
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { startDate, endDate, period = 'monthly' } = request.query as any;

        // Default to current month if no dates provided
        const now = new Date();
        const start = startDate
          ? new Date(startDate)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : now;

        // Apply role-based filtering
        const filters = applyFinancialDataFilter(request, {});

        // Get opening balance (transactions before start date)
        const [openingIncome, openingExpenses] = await Promise.all([
          fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PAID', 'CONFIRMED'] },
              createdAt: { lt: start },
              ...filters,
            },
          }),
          fastify.prisma.accountsPayable.aggregate({
            _sum: { netAmount: true },
            where: {
              status: 'PAID',
              paymentDate: { lt: start },
            },
          }),
        ]);

        const openingBalance =
          Number(openingIncome._sum.netAmount || 0) -
          Number(openingExpenses._sum.netAmount || 0);

        // Get period transactions
        const [periodIncome, periodExpenses] = await Promise.all([
          fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PAID', 'CONFIRMED'] },
              createdAt: { gte: start, lte: end },
              ...filters,
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

        const totalIncome = Number(periodIncome._sum.netAmount || 0);
        const totalExpenses = Number(periodExpenses._sum.netAmount || 0);
        const netCashFlow = totalIncome - totalExpenses;
        const closingBalance = openingBalance + netCashFlow;

        // Get detailed transactions for the period
        const [incomeTransactions, expenseTransactions] = await Promise.all([
          fastify.prisma.financialTransaction.findMany({
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PAID', 'CONFIRMED'] },
              createdAt: { gte: start, lte: end },
              ...filters,
            },
            include: {
              patient: { select: { firstName: true, lastName: true } },
              doctor: { select: { firstName: true, lastName: true } },
              category: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          }),
          fastify.prisma.accountsPayable.findMany({
            where: {
              status: 'PAID',
              paymentDate: { gte: start, lte: end },
            },
            include: {
              supplier: { select: { name: true } },
              category: { select: { name: true } },
            },
            orderBy: { paymentDate: 'desc' },
          }),
        ]);

        return {
          success: true,
          data: {
            period: {
              startDate: start,
              endDate: end,
              periodType: period,
            },
            summary: {
              openingBalance,
              totalIncome,
              totalExpenses,
              netCashFlow,
              closingBalance,
            },
            transactions: {
              income: incomeTransactions,
              expenses: expenseTransactions,
            },
          },
        };
      } catch (error) {
        request.log.error(error, 'Error generating cash flow report');

        return reply.status(500).send({
          success: false,
          error: 'Failed to generate cash flow report',
          code: 'CASH_FLOW_REPORT_ERROR',
        });
      }
    },
  );

  // Get profitability analysis
  fastify.get(
    '/profitability',
    {
      preHandler: checkFinancialPermission('financial.reports.view'),
      schema: {
        tags: ['Financial Reports'],
        summary: 'Get profitability analysis',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            groupBy: {
              type: 'string',
              enum: ['doctor', 'specialty', 'month'],
              default: 'doctor',
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { startDate, endDate, groupBy = 'doctor' } = request.query as any;

        // Default to current year if no dates provided
        const now = new Date();
        const start = startDate
          ? new Date(startDate)
          : new Date(now.getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : now;

        // Apply role-based filtering
        const filters = applyFinancialDataFilter(request, {});

        // Get revenue data
        const [revenue, expenses] = await Promise.all([
          fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            _count: true,
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PAID', 'CONFIRMED'] },
              createdAt: { gte: start, lte: end },
              ...filters,
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

        const totalRevenue = Number(revenue._sum.netAmount || 0);
        const totalExpenses = Number(expenses._sum.netAmount || 0);
        const grossProfit = totalRevenue;
        const operatingProfit = totalRevenue - totalExpenses;
        const netProfit = operatingProfit;

        const grossMargin =
          totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const operatingMargin =
          totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
        const netMargin =
          totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        let detailedAnalysis: any[] = [];

        if (groupBy === 'doctor') {
          // Group by doctor
          const doctorData = await fastify.prisma.financialTransaction.groupBy({
            by: ['doctorId'],
            _sum: { netAmount: true },
            _count: true,
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PAID', 'CONFIRMED'] },
              createdAt: { gte: start, lte: end },
              doctorId: { not: null },
              ...filters,
            },
            orderBy: { _sum: { netAmount: 'desc' } },
          });

          // Get doctor details
          const doctorIds = doctorData
            .map(d => d.doctorId)
            .filter(Boolean) as string[];
          const doctors = await fastify.prisma.user.findMany({
            where: {
              id: { in: doctorIds },
              role: 'DOCTOR',
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          });

          detailedAnalysis = doctorData.map(data => {
            const doctor = doctors.find(d => d.id === data.doctorId);
            const revenue = Number(data._sum.netAmount || 0);
            const appointments = data._count;
            const averageTicket = appointments > 0 ? revenue / appointments : 0;
            const profitability =
              totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

            return {
              doctorId: data.doctorId,
              doctorName: doctor
                ? `${doctor.firstName} ${doctor.lastName}`
                : 'Unknown',
              revenue,
              appointments,
              averageTicket,
              profitability,
            };
          });
        } else if (groupBy === 'specialty') {
          // Group by specialty (through doctor)
          const specialtyData =
            await fastify.prisma.financialTransaction.groupBy({
              by: ['doctorId'],
              _sum: { netAmount: true },
              _count: true,
              where: {
                transactionType: 'RECEIPT',
                status: { in: ['PAID', 'CONFIRMED'] },
                createdAt: { gte: start, lte: end },
                doctorId: { not: null },
                ...filters,
              },
            });

          // Get doctor-specialty mapping
          const doctorIds = specialtyData
            .map(d => d.doctorId)
            .filter(Boolean) as string[];
          const doctorSpecialties = await fastify.prisma.user.findMany({
            where: {
              id: { in: doctorIds },
              role: 'DOCTOR',
            },
            select: {
              id: true,
              specialties: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          // Group by specialty
          const specialtyMap = new Map<
            string,
            { revenue: number; appointments: number; name: string }
          >();

          specialtyData.forEach(data => {
            const doctor = doctorSpecialties.find(d => d.id === data.doctorId);
            const revenue = Number(data._sum.netAmount || 0);
            const appointments = data._count;

            if (doctor && doctor.specialties.length > 0) {
              doctor.specialties.forEach(specialty => {
                const existing = specialtyMap.get(specialty.id) || {
                  revenue: 0,
                  appointments: 0,
                  name: specialty.name,
                };
                existing.revenue += revenue / doctor.specialties.length; // Distribute equally among specialties
                existing.appointments +=
                  appointments / doctor.specialties.length;
                specialtyMap.set(specialty.id, existing);
              });
            }
          });

          detailedAnalysis = Array.from(specialtyMap.entries())
            .map(([specialtyId, data]) => ({
              specialtyName: data.name,
              revenue: data.revenue,
              appointments: Math.round(data.appointments),
              averageTicket:
                data.appointments > 0 ? data.revenue / data.appointments : 0,
              profitability:
                totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);
        } else if (groupBy === 'month') {
          // Group by month
          const monthlyData = (await fastify.prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', "createdAt") as month,
            SUM("netAmount") as revenue,
            COUNT(*) as appointments
          FROM "FinancialTransaction"
          WHERE "transactionType" = 'RECEIPT'
            AND "status" IN ('PAID', 'CONFIRMED')
            AND "createdAt" >= ${start}
            AND "createdAt" <= ${end}
            ${filters.doctorId ? fastify.prisma.sql`AND "doctorId" = ${filters.doctorId}` : fastify.prisma.sql``}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month
        `) as any[];

          detailedAnalysis = monthlyData.map(data => {
            const revenue = Number(data.revenue || 0);
            const appointments = Number(data.appointments || 0);
            const averageTicket = appointments > 0 ? revenue / appointments : 0;
            const profitability =
              totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

            return {
              month: data.month,
              revenue,
              appointments,
              averageTicket,
              profitability,
            };
          });
        }

        return {
          success: true,
          data: {
            period: {
              startDate: start,
              endDate: end,
              groupBy,
            },
            summary: {
              totalRevenue,
              totalCosts: 0, // Could be enhanced with cost tracking
              grossProfit,
              grossMargin,
              operatingExpenses: totalExpenses,
              operatingProfit,
              operatingMargin,
              netProfit,
              netMargin,
            },
            detailedAnalysis,
          },
        };
      } catch (error) {
        request.log.error(error, 'Error generating profitability analysis');

        return reply.status(500).send({
          success: false,
          error: 'Failed to generate profitability analysis',
          code: 'PROFITABILITY_REPORT_ERROR',
        });
      }
    },
  );

  // Get accounts receivable aging report
  fastify.get(
    '/receivables-aging',
    {
      preHandler: checkFinancialPermission('financial.reports.view'),
      schema: {
        tags: ['Financial Reports'],
        summary: 'Get accounts receivable aging report',
      },
    },
    async (request, reply) => {
      try {
        // Apply role-based filtering
        const filters = applyFinancialDataFilter(request, {});

        const now = new Date();
        const agingRanges = [
          { name: 'Current', days: 0, startDays: 0, endDays: 0 },
          { name: '1-30 days', days: 30, startDays: 1, endDays: 30 },
          { name: '31-60 days', days: 60, startDays: 31, endDays: 60 },
          { name: '61-90 days', days: 90, startDays: 61, endDays: 90 },
          { name: '90+ days', days: 999, startDays: 91, endDays: 999 },
        ];

        const agingAnalysis = await Promise.all(
          agingRanges.map(async range => {
            let dateFilter: any;

            if (range.name === 'Current') {
              dateFilter = { gte: now };
            } else if (range.name === '90+ days') {
              const cutoffDate = new Date(
                now.getTime() - 91 * 24 * 60 * 60 * 1000,
              );
              dateFilter = { lt: cutoffDate };
            } else {
              const startDate = new Date(
                now.getTime() - range.endDays * 24 * 60 * 60 * 1000,
              );
              const endDate = new Date(
                now.getTime() - range.startDays * 24 * 60 * 60 * 1000,
              );
              dateFilter = { gte: startDate, lt: endDate };
            }

            const result = await fastify.prisma.financialTransaction.aggregate({
              _sum: { netAmount: true },
              _count: true,
              where: {
                transactionType: 'RECEIPT',
                status: { in: ['PENDING', 'CONFIRMED'] },
                dueDate: dateFilter,
                ...filters,
              },
            });

            // Get detailed transactions for this range
            const transactions =
              await fastify.prisma.financialTransaction.findMany({
                where: {
                  transactionType: 'RECEIPT',
                  status: { in: ['PENDING', 'CONFIRMED'] },
                  dueDate: dateFilter,
                  ...filters,
                },
                take: 10, // Limit to prevent too much data
                orderBy: { dueDate: 'asc' },
                include: {
                  patient: {
                    select: { firstName: true, lastName: true, email: true },
                  },
                  doctor: { select: { firstName: true, lastName: true } },
                },
              });

            return {
              range: range.name,
              amount: Number(result._sum.netAmount || 0),
              count: result._count,
              transactions,
            };
          }),
        );

        const totalAmount = agingAnalysis.reduce(
          (sum, item) => sum + item.amount,
          0,
        );
        const totalCount = agingAnalysis.reduce(
          (sum, item) => sum + item.count,
          0,
        );

        const agingWithPercentages = agingAnalysis.map(item => ({
          ...item,
          percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
        }));

        return {
          success: true,
          data: {
            summary: {
              totalAmount,
              totalCount,
            },
            agingBuckets: agingWithPercentages,
            generatedAt: now,
          },
        };
      } catch (error) {
        request.log.error(error, 'Error generating receivables aging report');

        return reply.status(500).send({
          success: false,
          error: 'Failed to generate receivables aging report',
          code: 'RECEIVABLES_AGING_ERROR',
        });
      }
    },
  );

  // Get financial summary report
  fastify.get(
    '/summary',
    {
      preHandler: checkFinancialPermission('financial.reports.view'),
      schema: {
        tags: ['Financial Reports'],
        summary: 'Get financial summary report',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { startDate, endDate } = request.query as any;

        // Default to current month if no dates provided
        const now = new Date();
        const start = startDate
          ? new Date(startDate)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : now;

        // Apply role-based filtering
        const filters = applyFinancialDataFilter(request, {});

        // Get comprehensive financial data
        const [
          totalRevenue,
          totalExpenses,
          pendingReceivables,
          pendingPayables,
          paidTransactions,
          cancelledTransactions,
        ] = await Promise.all([
          // Total revenue (paid receipts)
          fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            _count: true,
            where: {
              transactionType: 'RECEIPT',
              status: 'PAID',
              createdAt: { gte: start, lte: end },
              ...filters,
            },
          }),

          // Total expenses (paid payables)
          fastify.prisma.accountsPayable.aggregate({
            _sum: { netAmount: true },
            _count: true,
            where: {
              status: 'PAID',
              paymentDate: { gte: start, lte: end },
            },
          }),

          // Pending receivables
          fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            _count: true,
            where: {
              transactionType: 'RECEIPT',
              status: { in: ['PENDING', 'CONFIRMED'] },
              ...filters,
            },
          }),

          // Pending payables
          fastify.prisma.accountsPayable.aggregate({
            _sum: { netAmount: true },
            _count: true,
            where: {
              status: { in: ['PENDING', 'APPROVED'] },
            },
          }),

          // Paid transactions summary
          fastify.prisma.financialTransaction.aggregate({
            _count: true,
            where: {
              status: 'PAID',
              createdAt: { gte: start, lte: end },
              ...filters,
            },
          }),

          // Cancelled transactions
          fastify.prisma.financialTransaction.aggregate({
            _sum: { netAmount: true },
            _count: true,
            where: {
              status: 'CANCELLED',
              createdAt: { gte: start, lte: end },
              ...filters,
            },
          }),
        ]);

        const revenue = Number(totalRevenue._sum.netAmount || 0);
        const expenses = Number(totalExpenses._sum.netAmount || 0);
        const netProfit = revenue - expenses;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return {
          success: true,
          data: {
            period: {
              startDate: start,
              endDate: end,
            },
            revenue: {
              total: revenue,
              transactionCount: totalRevenue._count,
            },
            expenses: {
              total: expenses,
              transactionCount: totalExpenses._count,
            },
            profitability: {
              netProfit,
              profitMargin,
            },
            receivables: {
              pending: Number(pendingReceivables._sum.netAmount || 0),
              count: pendingReceivables._count,
            },
            payables: {
              pending: Number(pendingPayables._sum.netAmount || 0),
              count: pendingPayables._count,
            },
            transactionSummary: {
              paid: paidTransactions._count,
              cancelled: {
                count: cancelledTransactions._count,
                amount: Number(cancelledTransactions._sum.netAmount || 0),
              },
            },
            generatedAt: now,
          },
        };
      } catch (error) {
        request.log.error(error, 'Error generating financial summary report');

        return reply.status(500).send({
          success: false,
          error: 'Failed to generate financial summary report',
          code: 'FINANCIAL_SUMMARY_ERROR',
        });
      }
    },
  );
}
