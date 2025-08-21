import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build } from '../../src/app';
import { prisma } from '../../src/config/database';

describe('Financial API - Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Build Fastify app for testing
    app = build({
      logger: false,
    });

    await app.ready();

    // Create test admin user and get auth token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@eoclinica.com.br',
        password: 'Admin123!',
      },
    });

    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.data.token;
    adminUserId = loginData.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.financialTransaction.deleteMany({
      where: {
        description: {
          contains: 'TEST',
        },
      },
    });
  });

  describe('GET /api/v1/financial/health', () => {
    it('should return financial module health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/health',
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toEqual({
        status: 'ok',
        module: 'financial',
        timestamp: expect.any(String),
        database: 'connected',
      });
    });
  });

  describe('GET /api/v1/financial/dashboard', () => {
    it('should return dashboard data for authenticated admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/dashboard',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        overview: expect.objectContaining({
          totalRevenue: expect.any(Number),
          totalExpenses: expect.any(Number),
          netProfit: expect.any(Number),
          cashBalance: expect.any(Number),
        }),
        kpis: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            value: expect.any(String),
            change: expect.any(String),
            changeType: expect.stringMatching(/^(positive|negative)$/),
          }),
        ]),
        recentTransactions: expect.any(Array),
      });
    });

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/dashboard',
      });

      expect(response.statusCode).toBe(401);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin users', async () => {
      // Create a patient user token
      const patientLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'paciente@example.com',
          password: 'Admin123!',
        },
      });

      const patientData = JSON.parse(patientLoginResponse.body);
      const patientToken = patientData.data.token;

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/dashboard',
        headers: {
          authorization: `Bearer ${patientToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/financial/transactions', () => {
    it('should create a new financial transaction', async () => {
      const transactionData = {
        description: 'TEST - Consulta Dr. Silva',
        grossAmount: 200,
        discountAmount: 20,
        netAmount: 180,
        type: 'INCOME',
        dueDate: new Date().toISOString(),
        patientId: null, // Can be null for generic transactions
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/financial/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: transactionData,
      });

      expect(response.statusCode).toBe(201);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining({
        id: expect.any(String),
        description: transactionData.description,
        grossAmount: transactionData.grossAmount,
        netAmount: transactionData.netAmount,
        type: transactionData.type,
        status: 'PENDING',
      }));
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: '', // Empty description
        grossAmount: -100, // Negative amount
        type: 'INVALID_TYPE',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/financial/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce financial access permissions', async () => {
      // Get doctor token (should not have financial access)
      const doctorLoginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'dr.silva@eoclinica.com.br',
          password: 'Admin123!',
        },
      });

      const doctorData = JSON.parse(doctorLoginResponse.body);
      const doctorToken = doctorData.data.token;

      const transactionData = {
        description: 'TEST - Unauthorized transaction',
        grossAmount: 100,
        netAmount: 100,
        type: 'INCOME',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/financial/transactions',
        headers: {
          authorization: `Bearer ${doctorToken}`,
        },
        payload: transactionData,
      });

      expect(response.statusCode).toBe(403);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/financial/transactions', () => {
    beforeEach(async () => {
      // Create test transactions
      await prisma.financialTransaction.createMany({
        data: [
          {
            description: 'TEST - Transaction 1',
            grossAmount: 100,
            netAmount: 100,
            type: 'INCOME',
            status: 'PAID',
            dueDate: new Date(),
          },
          {
            description: 'TEST - Transaction 2',
            grossAmount: 200,
            netAmount: 180,
            type: 'INCOME',
            status: 'PENDING',
            dueDate: new Date(),
          },
          {
            description: 'TEST - Expense 1',
            grossAmount: 50,
            netAmount: 50,
            type: 'EXPENSE',
            status: 'PAID',
            dueDate: new Date(),
          },
        ],
      });
    });

    it('should list transactions with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/transactions?limit=2&offset=0',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.transactions).toHaveLength(2);
      expect(data.data.pagination).toEqual({
        total: expect.any(Number),
        limit: 2,
        offset: 0,
        pages: expect.any(Number),
      });
    });

    it('should filter transactions by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/transactions?type=INCOME',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      
      // All returned transactions should be INCOME type
      data.data.transactions.forEach((transaction: any) => {
        expect(transaction.type).toBe('INCOME');
      });
    });

    it('should filter transactions by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/transactions?status=PENDING',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      
      // All returned transactions should be PENDING status
      data.data.transactions.forEach((transaction: any) => {
        expect(transaction.status).toBe('PENDING');
      });
    });
  });

  describe('PATCH /api/v1/financial/transactions/:id', () => {
    let transactionId: string;

    beforeEach(async () => {
      // Create a test transaction
      const transaction = await prisma.financialTransaction.create({
        data: {
          description: 'TEST - Update transaction',
          grossAmount: 100,
          netAmount: 100,
          type: 'INCOME',
          status: 'PENDING',
          dueDate: new Date(),
        },
      });
      transactionId = transaction.id;
    });

    it('should update transaction status', async () => {
      const updateData = {
        status: 'PAID',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/financial/transactions/${transactionId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('PAID');
      expect(data.data.paidAt).toBeTruthy();
    });

    it('should handle non-existent transaction', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/financial/transactions/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: { status: 'PAID' },
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/financial/reports/revenue', () => {
    it('should generate revenue report', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/reports/revenue?year=2025',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.report).toEqual(expect.arrayContaining([
        expect.objectContaining({
          month: expect.any(String),
          revenue: expect.any(Number),
          expenses: expect.any(Number),
          profit: expect.any(Number),
        }),
      ]));
    });

    it('should validate year parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/reports/revenue?year=invalid',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to financial endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 150; i++) {
        requests.push(
          app.inject({
            method: 'GET',
            url: '/api/v1/financial/dashboard',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('LGPD Compliance', () => {
    it('should not expose sensitive data in API responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/financial/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(response.body);
      
      if (data.data.transactions.length > 0) {
        const transaction = data.data.transactions[0];
        
        // Ensure no sensitive data is exposed
        expect(transaction).not.toHaveProperty('patientCpf');
        expect(transaction).not.toHaveProperty('patientEmail');
        expect(transaction).not.toHaveProperty('cardNumber');
        expect(transaction).not.toHaveProperty('bankAccount');
      }
    });

    it('should audit financial API operations', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/financial/transactions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: 'TEST - Audit test',
          grossAmount: 100,
          netAmount: 100,
          type: 'INCOME',
        },
      });

      expect(response.statusCode).toBe(201);
      
      // Check if audit log was created
      // Note: This would require access to audit log table
      // Implementation depends on audit system design
    });
  });
});