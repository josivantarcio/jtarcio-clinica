/**
 * Financial Module Types
 * Real types matching PostgreSQL database schema
 */

import { Prisma } from '@/database/generated/client';

// Prisma generated types
export type FinancialTransaction = Prisma.FinancialTransactionGetPayload<{
  include: {
    appointment: true;
    patient: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
    doctor: { select: { id: true; firstName: true; lastName: true } };
    insurance: true;
    category: true;
  };
}>;

export type FinancialTransactionCreate = Prisma.FinancialTransactionCreateInput;
export type FinancialTransactionUpdate = Prisma.FinancialTransactionUpdateInput;

export type InsurancePlan = Prisma.InsurancePlanGetPayload<{}>;
export type InsurancePlanCreate = Prisma.InsurancePlanCreateInput;
export type InsurancePlanUpdate = Prisma.InsurancePlanUpdateInput;

export type FinancialCategory = Prisma.FinancialCategoryGetPayload<{
  include: {
    parent: true;
    children: true;
  };
}>;
export type FinancialCategoryCreate = Prisma.FinancialCategoryCreateInput;
export type FinancialCategoryUpdate = Prisma.FinancialCategoryUpdateInput;

export type Supplier = Prisma.SupplierGetPayload<{}>;
export type SupplierCreate = Prisma.SupplierCreateInput;
export type SupplierUpdate = Prisma.SupplierUpdateInput;

export type AccountsPayable = Prisma.AccountsPayableGetPayload<{
  include: {
    supplier: true;
    category: true;
    creator: { select: { id: true; firstName: true; lastName: true } };
  };
}>;
export type AccountsPayableCreate = Prisma.AccountsPayableCreateInput;
export type AccountsPayableUpdate = Prisma.AccountsPayableUpdateInput;

// Enum types from database
export type TransactionType = Prisma.TransactionType;
export type FinancialStatus = Prisma.FinancialStatus;
export type PaymentMethod = Prisma.PaymentMethod;
export type InsuranceCategory = Prisma.InsuranceCategory;
export type CategoryType = Prisma.CategoryType;
export type SupplierCategory = Prisma.SupplierCategory;
export type PayableStatus = Prisma.PayableStatus;

// API Response types
export interface FinancialDashboardData {
  // KPIs
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;

  // Growth indicators
  revenueGrowth: number;
  expenseGrowth: number;
  profitGrowth: number;

  // Lists
  recentTransactions: FinancialTransaction[];
  upcomingPayments: AccountsPayable[];
  overdueReceivables: FinancialTransaction[];

  // Chart data
  cashFlowData: CashFlowData[];
  revenueByPeriod: RevenueData[];
  expensesByCategory: ExpenseData[];
}

export interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface RevenueData {
  period: string;
  revenue: number;
  appointments: number;
}

export interface ExpenseData {
  category: string;
  amount: number;
  percentage: number;
  color?: string;
}

// Filter types for API queries
export interface FinancialTransactionFilters {
  patientId?: string;
  doctorId?: string;
  status?: FinancialStatus;
  transactionType?: TransactionType;
  paymentMethod?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  categoryId?: string;
  insuranceId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'dueDate' | 'paymentDate' | 'netAmount';
  sortOrder?: 'asc' | 'desc';
}

export interface AccountsPayableFilters {
  supplierId?: string;
  status?: PayableStatus;
  categoryId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  paymentDateFrom?: Date;
  paymentDateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'dueDate' | 'paymentDate' | 'netAmount';
  sortOrder?: 'asc' | 'desc';
}

// Financial Report types
export interface CashFlowReport {
  period: string;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  closingBalance: number;
  transactions: {
    income: FinancialTransaction[];
    expenses: AccountsPayable[];
  };
}

export interface ProfitabilityAnalysis {
  period: string;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingProfit: number;
  operatingMargin: number;
  netProfit: number;
  netMargin: number;
  byDoctor: {
    doctorId: string;
    doctorName: string;
    revenue: number;
    appointments: number;
    averageTicket: number;
    profitability: number;
  }[];
  bySpecialty: {
    specialtyName: string;
    revenue: number;
    appointments: number;
    averageTicket: number;
    profitability: number;
  }[];
}

// Financial validation schemas (for runtime validation)
export interface CreateTransactionRequest {
  appointmentId?: string;
  patientId: string;
  doctorId?: string;
  transactionType: TransactionType;
  categoryId?: string;
  grossAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  paymentMethod?: PaymentMethod;
  dueDate?: Date;
  installments?: number;
  insuranceId?: string;
  insuranceAuth?: string;
  description?: string;
  notes?: string;
}

export interface UpdateTransactionRequest {
  status?: FinancialStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date;
  notes?: string;
}

export interface CreatePayableRequest {
  supplierId?: string;
  categoryId?: string;
  documentNumber?: string;
  description: string;
  grossAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  issueDate: Date;
  dueDate: Date;
}

export interface UpdatePayableRequest {
  status?: PayableStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date;
}

// Permission checking
export type FinancialPermission =
  | 'financial.dashboard.view'
  | 'financial.transactions.view'
  | 'financial.transactions.create'
  | 'financial.transactions.update'
  | 'financial.transactions.delete'
  | 'financial.payables.view'
  | 'financial.payables.create'
  | 'financial.payables.update'
  | 'financial.payables.delete'
  | 'financial.payables.approve'
  | 'financial.reports.view'
  | 'financial.settings.manage';

// Error types
export interface FinancialError extends Error {
  code:
    | 'INSUFFICIENT_FUNDS'
    | 'INVALID_PAYMENT'
    | 'DUPLICATE_TRANSACTION'
    | 'PAYMENT_FAILED';
  details?: any;
}
