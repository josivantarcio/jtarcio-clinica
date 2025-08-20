/**
 * Financial Service
 * Real implementation with PostgreSQL database connections
 */

import { PrismaClient } from '@/database/generated/client';
import {
  FinancialTransaction,
  FinancialDashboardData,
  FinancialTransactionFilters,
  AccountsPayableFilters,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  CreatePayableRequest,
  UpdatePayableRequest,
  CashFlowReport,
  ProfitabilityAnalysis,
  TransactionType,
  FinancialStatus,
  PayableStatus,
} from '@/types/financial';
import { Decimal } from '@prisma/client/runtime/library';

export class FinancialService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get financial dashboard data with real calculations from database
   */
  async getDashboardData(
    userId: string,
    userRole: string,
  ): Promise<FinancialDashboardData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month financial data
    const [
      currentMonthRevenue,
      currentMonthExpenses,
      lastMonthRevenue,
      lastMonthExpenses,
      recentTransactions,
      upcomingPayments,
      overdueReceivables,
    ] = await Promise.all([
      // Current month revenue (completed transactions)
      this.prisma.financialTransaction.aggregate({
        _sum: { netAmount: true },
        where: {
          transactionType: 'RECEIPT',
          status: { in: ['PAID', 'CONFIRMED'] },
          createdAt: { gte: startOfMonth },
        },
      }),

      // Current month expenses (paid accounts payable)
      this.prisma.accountsPayable.aggregate({
        _sum: { netAmount: true },
        where: {
          status: 'PAID',
          paymentDate: { gte: startOfMonth },
        },
      }),

      // Last month revenue for growth calculation
      this.prisma.financialTransaction.aggregate({
        _sum: { netAmount: true },
        where: {
          transactionType: 'RECEIPT',
          status: { in: ['PAID', 'CONFIRMED'] },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      // Last month expenses for growth calculation
      this.prisma.accountsPayable.aggregate({
        _sum: { netAmount: true },
        where: {
          status: 'PAID',
          paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      // Recent transactions (last 10)
      this.prisma.financialTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { firstName: true, lastName: true } },
          appointment: { select: { id: true, scheduledAt: true } },
        },
      }),

      // Upcoming payments (due in next 30 days)
      this.prisma.accountsPayable.findMany({
        where: {
          status: { in: ['PENDING', 'APPROVED'] },
          dueDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          supplier: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),

      // Overdue receivables
      this.prisma.financialTransaction.findMany({
        where: {
          transactionType: 'RECEIPT',
          status: { in: ['PENDING', 'CONFIRMED'] },
          dueDate: { lt: now },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          appointment: { select: { scheduledAt: true } },
        },
      }),
    ]);

    // Calculate values
    const totalRevenue = Number(currentMonthRevenue._sum.netAmount || 0);
    const totalExpenses = Number(currentMonthExpenses._sum.netAmount || 0);
    const netProfit = totalRevenue - totalExpenses;
    const cashBalance = await this.calculateCashBalance();

    const lastMonthRevenueValue = Number(lastMonthRevenue._sum.netAmount || 0);
    const lastMonthExpensesValue = Number(
      lastMonthExpenses._sum.netAmount || 0,
    );

    // Calculate growth percentages
    const revenueGrowth =
      lastMonthRevenueValue > 0
        ? ((totalRevenue - lastMonthRevenueValue) / lastMonthRevenueValue) * 100
        : totalRevenue > 0
          ? 100
          : 0;

    const expenseGrowth =
      lastMonthExpensesValue > 0
        ? ((totalExpenses - lastMonthExpensesValue) / lastMonthExpensesValue) *
          100
        : totalExpenses > 0
          ? 100
          : 0;

    const lastMonthProfit = lastMonthRevenueValue - lastMonthExpensesValue;
    const profitGrowth =
      lastMonthProfit !== 0
        ? ((netProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100
        : netProfit > 0
          ? 100
          : 0;

    // Get chart data (simplified for now)
    const cashFlowData = await this.getCashFlowData(startOfMonth, now);
    const revenueByPeriod = await this.getRevenueByPeriod(startOfMonth, now);
    const expensesByCategory = await this.getExpensesByCategory(
      startOfMonth,
      now,
    );

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      cashBalance,
      revenueGrowth,
      expenseGrowth,
      profitGrowth,
      recentTransactions: recentTransactions as any,
      upcomingPayments: upcomingPayments as any,
      overdueReceivables: overdueReceivables as any,
      cashFlowData,
      revenueByPeriod,
      expensesByCategory,
    };
  }

  /**
   * Get financial transactions with filters
   */
  async getTransactions(filters: FinancialTransactionFilters) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...whereFilters
    } = filters;

    const where: any = {};

    // Apply filters
    if (whereFilters.patientId) where.patientId = whereFilters.patientId;
    if (whereFilters.doctorId) where.doctorId = whereFilters.doctorId;
    if (whereFilters.status) where.status = whereFilters.status;
    if (whereFilters.transactionType)
      where.transactionType = whereFilters.transactionType;
    if (whereFilters.paymentMethod)
      where.paymentMethod = whereFilters.paymentMethod;
    if (whereFilters.categoryId) where.categoryId = whereFilters.categoryId;
    if (whereFilters.insuranceId) where.insuranceId = whereFilters.insuranceId;

    // Date filters
    if (whereFilters.dateFrom || whereFilters.dateTo) {
      where.createdAt = {};
      if (whereFilters.dateFrom) where.createdAt.gte = whereFilters.dateFrom;
      if (whereFilters.dateTo) where.createdAt.lte = whereFilters.dateTo;
    }

    if (whereFilters.dueDateFrom || whereFilters.dueDateTo) {
      where.dueDate = {};
      if (whereFilters.dueDateFrom)
        where.dueDate.gte = whereFilters.dueDateFrom;
      if (whereFilters.dueDateTo) where.dueDate.lte = whereFilters.dueDateTo;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          doctor: { select: { id: true, firstName: true, lastName: true } },
          appointment: { select: { id: true, scheduledAt: true } },
          insurance: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, type: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new financial transaction
   */
  async createTransaction(data: CreateTransactionRequest, createdBy: string) {
    const netAmount =
      data.grossAmount - (data.discountAmount || 0) - (data.taxAmount || 0);

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        ...data,
        netAmount: new Decimal(netAmount),
        createdBy,
        status: 'PENDING',
      },
      include: {
        patient: { select: { firstName: true, lastName: true, email: true } },
        doctor: { select: { firstName: true, lastName: true } },
        appointment: { select: { scheduledAt: true } },
      },
    });

    // Update appointment payment status if linked
    if (data.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { paymentStatus: 'PENDING' },
      });
    }

    return transaction;
  }

  /**
   * Update financial transaction
   */
  async updateTransaction(id: string, data: UpdateTransactionRequest) {
    const transaction = await this.prisma.financialTransaction.update({
      where: { id },
      data,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        appointment: { select: { id: true } },
      },
    });

    // Update appointment payment status if needed
    if (transaction.appointmentId && data.status) {
      let appointmentStatus = 'PENDING';
      if (data.status === 'PAID') appointmentStatus = 'PAID';
      else if (data.status === 'PARTIAL') appointmentStatus = 'PARTIAL';
      else if (data.status === 'CANCELLED') appointmentStatus = 'CANCELLED';

      await this.prisma.appointment.update({
        where: { id: transaction.appointmentId },
        data: { paymentStatus: appointmentStatus as any },
      });
    }

    return transaction;
  }

  /**
   * Get accounts payable with filters
   */
  async getAccountsPayable(filters: AccountsPayableFilters) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'dueDate',
      sortOrder = 'asc',
      ...whereFilters
    } = filters;

    const where: any = {};

    // Apply filters
    if (whereFilters.supplierId) where.supplierId = whereFilters.supplierId;
    if (whereFilters.status) where.status = whereFilters.status;
    if (whereFilters.categoryId) where.categoryId = whereFilters.categoryId;

    // Date filters
    if (whereFilters.dueDateFrom || whereFilters.dueDateTo) {
      where.dueDate = {};
      if (whereFilters.dueDateFrom)
        where.dueDate.gte = whereFilters.dueDateFrom;
      if (whereFilters.dueDateTo) where.dueDate.lte = whereFilters.dueDateTo;
    }

    if (whereFilters.paymentDateFrom || whereFilters.paymentDateTo) {
      where.paymentDate = {};
      if (whereFilters.paymentDateFrom)
        where.paymentDate.gte = whereFilters.paymentDateFrom;
      if (whereFilters.paymentDateTo)
        where.paymentDate.lte = whereFilters.paymentDateTo;
    }

    const [payables, total] = await Promise.all([
      this.prisma.accountsPayable.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, category: true } },
          category: { select: { id: true, name: true, type: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accountsPayable.count({ where }),
    ]);

    return {
      data: payables,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create accounts payable
   */
  async createAccountsPayable(data: CreatePayableRequest, createdBy: string) {
    const netAmount =
      data.grossAmount - (data.discountAmount || 0) - (data.taxAmount || 0);

    return await this.prisma.accountsPayable.create({
      data: {
        ...data,
        netAmount: new Decimal(netAmount),
        createdBy,
        status: 'PENDING',
      },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
  }

  /**
   * Update accounts payable
   */
  async updateAccountsPayable(id: string, data: UpdatePayableRequest) {
    return await this.prisma.accountsPayable.update({
      where: { id },
      data,
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
  }

  /**
   * Private helper methods for calculations
   */
  private async calculateCashBalance(): Promise<number> {
    const [totalReceived, totalPaid] = await Promise.all([
      this.prisma.financialTransaction.aggregate({
        _sum: { netAmount: true },
        where: {
          transactionType: 'RECEIPT',
          status: { in: ['PAID', 'CONFIRMED'] },
        },
      }),
      this.prisma.accountsPayable.aggregate({
        _sum: { netAmount: true },
        where: { status: 'PAID' },
      }),
    ]);

    const received = Number(totalReceived._sum.netAmount || 0);
    const paid = Number(totalPaid._sum.netAmount || 0);

    return received - paid;
  }

  private async getCashFlowData(startDate: Date, endDate: Date) {
    // This would be implemented with actual daily/weekly aggregations
    // For now, returning simple structure
    return [];
  }

  private async getRevenueByPeriod(startDate: Date, endDate: Date) {
    // This would be implemented with period-based grouping
    // For now, returning simple structure
    return [];
  }

  private async getExpensesByCategory(startDate: Date, endDate: Date) {
    const expenses = await this.prisma.accountsPayable.groupBy({
      by: ['categoryId'],
      _sum: { netAmount: true },
      where: {
        status: 'PAID',
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    // Get category names
    const categoryIds = expenses
      .map(e => e.categoryId)
      .filter(Boolean) as string[];
    const categories = await this.prisma.financialCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    });

    const total = expenses.reduce(
      (sum, exp) => sum + Number(exp._sum.netAmount || 0),
      0,
    );

    return expenses.map(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      const amount = Number(expense._sum.netAmount || 0);

      return {
        category: category?.name || 'Sem categoria',
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: category?.color,
      };
    });
  }
}
