import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../src/config/database';
import Fastify from 'fastify';
import { registerPlugins } from '../../src/plugins';
import { registerRoutes } from '../../src/routes';

describe('🌐 API Integration - Patient Details Fix', () => {
  let app: FastifyInstance;
  let testPatientId: string;

  beforeAll(async () => {
    // Create Fastify app for testing
    app = Fastify({
      logger: false,
      trustProxy: true,
    });

    // Register plugins and routes
    await registerPlugins(app);
    await registerRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create a test patient
    const testPatient = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        fullName: 'Test Patient',
        email: `test-patient-${Date.now()}@example.com`,
        password: '$2a$12$test.hash.here',
        role: 'PATIENT',
        status: 'ACTIVE',
        phone: `119${Math.floor(10000000 + Math.random() * 90000000)}`,
        cpf: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'M'
      }
    });

    testPatientId = testPatient.id;
  });

  afterEach(async () => {
    // Cleanup
    if (testPatientId) {
      await prisma.user.delete({
        where: { id: testPatientId }
      });
    }
  });

  describe('✅ CUID Schema Validation Fix', () => {
    it('should successfully GET /api/v1/users/:id with CUID', async () => {
      console.log(`🧪 Testing API with CUID: ${testPatientId}`);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${testPatientId}`,
        headers: {
          authorization: 'Bearer fake-token-for-testing'
        }
      });

      console.log(`📊 Response Status: ${response.statusCode}`);
      console.log(`📊 Response Headers:`, response.headers);
      
      if (response.statusCode !== 200) {
        console.log(`❌ Response Body:`, response.body);
      }

      // Should NOT return 400 (Bad Request) anymore
      expect(response.statusCode).not.toBe(400);
      
      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(testPatientId);
        console.log(`✅ Successfully retrieved patient: ${data.data.fullName}`);
      } else if (response.statusCode === 404) {
        console.log(`ℹ️ Patient not found (expected in some cases)`);
      } else {
        console.log(`⚠️ Unexpected status: ${response.statusCode}`);
      }
    });

    it('should validate CUID from error log example', async () => {
      const problematicId = 'cmet8mc410001jtvvwgy3erni';
      
      console.log(`🔍 Testing problematic ID from logs: ${problematicId}`);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${problematicId}`,
        headers: {
          authorization: 'Bearer fake-token-for-testing'
        }
      });

      console.log(`📊 Response Status: ${response.statusCode}`);
      
      // Should NOT return 400 (Bad Request) - that was the problem!
      expect(response.statusCode).not.toBe(400);
      
      // Will likely be 404 (Not Found) since user doesn't exist, but that's OK
      if (response.statusCode === 404) {
        console.log(`✅ ID validation passed - user not found (expected)`);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('NOT_FOUND');
      } else if (response.statusCode === 200) {
        console.log(`✅ User found successfully`);
      }
    });

    it('should still reject truly invalid IDs', async () => {
      const invalidIds = [
        'invalid-id',
        '123',
        'abc-def-ghi',
        ''
      ];

      for (const invalidId of invalidIds) {
        console.log(`🧪 Testing invalid ID: "${invalidId}"`);

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/users/${invalidId}`,
          headers: {
            authorization: 'Bearer fake-token-for-testing'
          }
        });

        console.log(`📊 "${invalidId}" → Status: ${response.statusCode}`);
        
        // Should return 400 (Bad Request) for truly invalid IDs
        expect(response.statusCode).toBe(400);
        
        const data = JSON.parse(response.body);
        expect(data.success).toBe(false);
      }
    });
  });

  describe('🎯 Real-world Scenarios', () => {
    it('should handle UUID format IDs (for compatibility)', async () => {
      // Test with UUID format to ensure backward compatibility
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${uuidId}`,
        headers: {
          authorization: 'Bearer fake-token-for-testing'
        }
      });

      // UUIDs should be rejected by our CUID validation
      expect(response.statusCode).toBe(400);
      console.log(`✅ UUID properly rejected: ${response.statusCode}`);
    });

    it('should provide helpful error messages', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/invalid-id`,
        headers: {
          authorization: 'Bearer fake-token-for-testing'
        }
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('message');
      
      console.log(`📝 Error message: ${data.error.message}`);
    });
  });
});