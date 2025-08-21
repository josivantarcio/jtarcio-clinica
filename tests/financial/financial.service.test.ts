import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { FinancialService } from '../../src/services/financial.service';

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  prisma: {
    financialTransaction: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = require('../../src/config/database').prisma;

describe('Financial Service - Unit Tests', () => {
  let financialService: FinancialService;

  beforeEach(() => {
    jest.clearAllMocks();
    financialService = new FinancialService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('💰 Dashboard Data', () => {
    it('should calculate financial overview correctly', async () => {
      // Mock aggregate data
      const mockTransactions = [
        {
          _sum: { netAmount: 125000 },
          type: 'INCOME',
        },
        {
          _sum: { netAmount: 45000 },
          type: 'EXPENSE',
        },
      ];

      mockPrisma.financialTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { netAmount: 125000 } }) // Income
        .mockResolvedValueOnce({ _sum: { netAmount: 45000 } });  // Expenses

      const result = await financialService.getDashboardData();

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          overview: expect.objectContaining({
            totalRevenue: 125000,
            totalExpenses: 45000,
            netProfit: 80000,
            cashBalance: expect.any(Number),
          }),
          kpis: expect.arrayContaining([
            expect.objectContaining({
              title: 'Receita Mensal',
              value: 'R$ 125.000',
              change: expect.any(String),
            }),
          ]),
        }),
      });

      expect(mockPrisma.financialTransaction.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should handle empty financial data gracefully', async () => {
      mockPrisma.financialTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { netAmount: null } })
        .mockResolvedValueOnce({ _sum: { netAmount: null } });

      const result = await financialService.getDashboardData();

      expect(result.success).toBe(true);
      expect(result.data.overview.totalRevenue).toBe(0);
      expect(result.data.overview.totalExpenses).toBe(0);
      expect(result.data.overview.netProfit).toBe(0);
    });
  });

  describe('📊 Financial KPIs', () => {
    it('should calculate KPIs with proper formatting', async () => {
      const result = await financialService.getKPIs();

      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            value: expect.stringMatching(/^R\$ /),
            change: expect.stringMatching(/^[+-]\d+\.\d%$/),
            changeType: expect.stringMatching(/^(positive|negative)$/),
          }),
        ]),
      });
    });

    it('should handle calculation errors gracefully', async () => {
      mockPrisma.financialTransaction.aggregate.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const result = await financialService.getKPIs();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('💳 Transactions Management', () => {
    it('should create a new financial transaction', async () => {
      const mockTransaction = {
        id: 'trans-001',
        description: 'Consulta - Dr. Silva',
        grossAmount: 200,
        netAmount: 180,
        type: 'INCOME',
        status: 'PENDING',
        dueDate: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.financialTransaction.create.mockResolvedValueOnce(mockTransaction);

      const transactionData = {
        description: 'Consulta - Dr. Silva',
        grossAmount: 200,
        discountAmount: 20,
        netAmount: 180,
        type: 'INCOME' as const,
        dueDate: new Date(),
        patientId: 'patient-001',
      };

      const result = await financialService.createTransaction(transactionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransaction);
      expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: transactionData.description,
          grossAmount: transactionData.grossAmount,
          netAmount: transactionData.netAmount,
          type: transactionData.type,
        }),
      });
    });

    it('should validate transaction data before creation', async () => {
      const invalidData = {
        description: '', // Empty description
        grossAmount: -100, // Negative amount
        type: 'INVALID' as any,
      };

      const result = await financialService.createTransaction(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(mockPrisma.financialTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('📈 Financial Reports', () => {
    it('should generate monthly revenue report', async () => {
      const mockRevenueData = [
        { month: '2025-08', revenue: 25000 },
        { month: '2025-07', revenue: 22000 },
        { month: '2025-06', revenue: 20000 },
      ];

      mockPrisma.$transaction.mockResolvedValueOnce(mockRevenueData);

      const result = await financialService.getMonthlyRevenueReport(2025);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          month: expect.any(String),
          revenue: expect.any(Number),
        }),
      ]));
    });

    it('should handle report generation errors', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(
        new Error('Query timeout')
      );

      const result = await financialService.getMonthlyRevenueReport(2025);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query timeout');
    });
  });

  describe('🏥 LGPD Compliance', () => {
    it('should anonymize financial data for LGPD compliance', async () => {
      const mockSensitiveTransaction = {
        id: 'trans-001',
        description: 'Consulta - João Silva CPF 123.456.789-00',
        patientEmail: 'joao@email.com',
        netAmount: 200,
      };

      const result = await financialService.anonymizeTransactionData(mockSensitiveTransaction);

      expect(result.description).not.toContain('João Silva');
      expect(result.description).not.toContain('123.456.789-00');
      expect(result.patientEmail).not.toContain('joao@email.com');
      expect(result.netAmount).toBe(200); // Financial amounts should be preserved
    });

    it('should audit financial operations for compliance', async () => {
      const auditSpy = jest.spyOn(financialService, 'auditOperation');
      
      await financialService.createTransaction({
        description: 'Test transaction',
        grossAmount: 100,
        netAmount: 100,
        type: 'INCOME',
      });

      expect(auditSpy).toHaveBeenCalledWith(
        'CREATE_TRANSACTION',
        expect.objectContaining({
          operation: 'create',
          entityType: 'financial_transaction',
        })
      );
    });
  });

  describe('💎 Premium Features', () => {
    it('should process payment integration correctly', async () => {
      const paymentData = {
        transactionId: 'trans-001',
        paymentMethod: 'CREDIT_CARD',
        amount: 200,
        currency: 'BRL',
      };

      mockPrisma.financialTransaction.update.mockResolvedValueOnce({
        id: 'trans-001',
        status: 'PAID',
        paidAt: new Date(),
      });

      const result = await financialService.processPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('PAID');
      expect(mockPrisma.financialTransaction.update).toHaveBeenCalledWith({
        where: { id: paymentData.transactionId },
        data: expect.objectContaining({
          status: 'PAID',
          paidAt: expect.any(Date),
        }),
      });
    });

    it('should handle payment failures gracefully', async () => {
      const paymentData = {
        transactionId: 'trans-001',
        paymentMethod: 'CREDIT_CARD',
        amount: 200,
        currency: 'BRL',
      };

      mockPrisma.financialTransaction.update.mockRejectedValueOnce(
        new Error('Payment gateway timeout')
      );

      const result = await financialService.processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment gateway timeout');
    });
  });

  describe('🔐 Security Validations', () => {
    it('should validate user permissions for financial operations', async () => {
      const userWithFinancialAccess = {
        id: 'user-001',
        role: 'ADMIN',
        permissions: ['FINANCIAL_READ', 'FINANCIAL_WRITE'],
      };

      const userWithoutAccess = {
        id: 'user-002',
        role: 'PATIENT',
        permissions: ['APPOINTMENT_READ'],
      };

      const hasAccessAdmin = await financialService.validateFinancialAccess(userWithFinancialAccess);
      const hasAccessPatient = await financialService.validateFinancialAccess(userWithoutAccess);

      expect(hasAccessAdmin).toBe(true);
      expect(hasAccessPatient).toBe(false);
    });

    it('should encrypt sensitive financial data', async () => {
      const sensitiveData = {
        cardNumber: '4111111111111111',
        bankAccount: '12345-6',
        cpf: '123.456.789-00',
      };

      const encrypted = await financialService.encryptSensitiveData(sensitiveData);

      expect(encrypted.cardNumber).not.toBe(sensitiveData.cardNumber);
      expect(encrypted.bankAccount).not.toBe(sensitiveData.bankAccount);
      expect(encrypted.cpf).not.toBe(sensitiveData.cpf);

      // Should be able to decrypt back
      const decrypted = await financialService.decryptSensitiveData(encrypted);
      expect(decrypted).toEqual(sensitiveData);
    });
  });
});

// Helper function to create mock financial data
function createMockFinancialTransaction(overrides = {}) {
  return {
    id: 'trans-001',
    description: 'Test Transaction',
    grossAmount: 100,
    discountAmount: 10,
    netAmount: 90,
    type: 'INCOME',
    status: 'PENDING',
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Integration test helper
function createMockFinancialService() {
  return {
    getDashboardData: jest.fn(),
    getKPIs: jest.fn(),
    createTransaction: jest.fn(),
    processPayment: jest.fn(),
    validateFinancialAccess: jest.fn(),
    encryptSensitiveData: jest.fn(),
    decryptSensitiveData: jest.fn(),
    auditOperation: jest.fn(),
    anonymizeTransactionData: jest.fn(),
    getMonthlyRevenueReport: jest.fn(),
  };
}

export { createMockFinancialTransaction, createMockFinancialService };