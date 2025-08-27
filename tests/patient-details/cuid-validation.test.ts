import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../../src/config/database';

describe('🔍 CUID Validation Fix - Patient Details', () => {
  let testPatientId: string;

  beforeEach(async () => {
    // Create a test patient to get a real CUID
    const testPatient = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        fullName: 'Test Patient',
        email: `test-${Date.now()}@example.com`,
        password: '$2a$12$test.hash.here',
        role: 'PATIENT',
        status: 'ACTIVE',
        phone: `119${Math.floor(10000000 + Math.random() * 90000000)}`,
        cpf: `${Math.floor(10000000000 + Math.random() * 90000000000)}`
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

  describe('✅ CUID Format Analysis', () => {
    it('should analyze the CUID format used in production', async () => {
      console.log(`🔍 Analyzing CUID: ${testPatientId}`);
      console.log(`📏 Length: ${testPatientId.length}`);
      console.log(`🔢 Starts with 'c': ${testPatientId.startsWith('c')}`);
      console.log(`📋 Character analysis:`);
      
      for (let i = 0; i < Math.min(testPatientId.length, 10); i++) {
        console.log(`  [${i}]: '${testPatientId[i]}' (${testPatientId.charCodeAt(i)})`);
      }

      // Basic CUID validation
      expect(testPatientId).toBeTruthy();
      expect(typeof testPatientId).toBe('string');
      expect(testPatientId.length).toBeGreaterThan(20);
      expect(testPatientId.startsWith('c')).toBe(true);
      
      // Should only contain lowercase letters and numbers
      const validChars = /^[a-z0-9]+$/.test(testPatientId.substring(1));
      expect(validChars).toBe(true);
    });

    it('should validate CUID against different regex patterns', () => {
      const patterns = [
        { name: 'UUID', regex: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
        { name: 'Strict CUID', regex: /^c[a-z0-9]{24}$/ },
        { name: 'Flexible CUID', regex: /^c[a-z0-9]+$/ },
        { name: 'Any ID (20-30 chars)', regex: /^.{20,30}$/ },
        { name: 'CUID Prefix', regex: /^c/ }
      ];

      patterns.forEach(pattern => {
        const matches = pattern.regex.test(testPatientId);
        console.log(`${pattern.name}: ${matches ? '✅' : '❌'} (${pattern.regex})`);
      });

      // Our ID should match the flexible CUID pattern
      expect(testPatientId).toMatch(/^c[a-z0-9]+$/);
    });
  });

  describe('🛠️ Schema Validation Recommendations', () => {
    it('should recommend proper schema validation', () => {
      const recommendations = {
        currentSchema: {
          type: 'string',
          format: 'uuid' // ❌ This is wrong for CUID
        },
        recommendedSchema: {
          type: 'string',
          minLength: 20,
          maxLength: 30,
          pattern: '^c[a-z0-9]+$' // ✅ This matches CUID
        }
      };

      console.log('📋 Schema Validation Recommendations:');
      console.log('❌ Current (problematic):');
      console.log(JSON.stringify(recommendations.currentSchema, null, 2));
      console.log('✅ Recommended (working):');
      console.log(JSON.stringify(recommendations.recommendedSchema, null, 2));

      // Test the recommended pattern
      const recommendedRegex = new RegExp(recommendations.recommendedSchema.pattern);
      expect(testPatientId).toMatch(recommendedRegex);
      expect(testPatientId.length).toBeGreaterThanOrEqual(recommendations.recommendedSchema.minLength);
      expect(testPatientId.length).toBeLessThanOrEqual(recommendations.recommendedSchema.maxLength);
    });
  });

  describe('🔍 Error Reproduction', () => {
    it('should show what happens with UUID validation on CUID', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const cuidRegex = /^c[a-z0-9]+$/;

      console.log(`🧪 Testing ID: ${testPatientId}`);
      console.log(`❌ UUID validation: ${uuidRegex.test(testPatientId)} (This causes 400 error)`);
      console.log(`✅ CUID validation: ${cuidRegex.test(testPatientId)} (This should work)`);

      // This demonstrates the problem
      expect(uuidRegex.test(testPatientId)).toBe(false); // UUID regex fails on CUID
      expect(cuidRegex.test(testPatientId)).toBe(true);  // CUID regex works
    });
  });

  describe('🎯 Real-world ID Examples', () => {
    it('should handle various ID formats that might appear in system', async () => {
      const testCases = [
        {
          description: 'Current test CUID',
          id: testPatientId,
          shouldValidateAs: 'CUID',
          expectedResult: 'PASS'
        },
        {
          description: 'Example from error log',
          id: 'cmet8mc410001jtvvwgy3erni',
          shouldValidateAs: 'CUID',
          expectedResult: 'PASS'
        },
        {
          description: 'Standard UUID',
          id: '550e8400-e29b-41d4-a716-446655440000',
          shouldValidateAs: 'UUID',
          expectedResult: 'PASS'
        },
        {
          description: 'Invalid ID',
          id: 'invalid-id',
          shouldValidateAs: 'INVALID',
          expectedResult: 'FAIL'
        }
      ];

      testCases.forEach(test => {
        const isCuid = /^c[a-z0-9]+$/.test(test.id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(test.id);
        const isValidLength = test.id.length >= 20 && test.id.length <= 50;
        
        console.log(`📋 ${test.description}:`);
        console.log(`   ID: ${test.id}`);
        console.log(`   Length: ${test.id.length}`);
        console.log(`   CUID format: ${isCuid ? '✅' : '❌'}`);
        console.log(`   UUID format: ${isUuid ? '✅' : '❌'}`);
        console.log(`   Valid length: ${isValidLength ? '✅' : '❌'}`);
        console.log(`   Expected: ${test.expectedResult}`);
        console.log('');

        if (test.expectedResult === 'PASS') {
          expect(isCuid || isUuid).toBe(true);
          expect(isValidLength).toBe(true);
        }
      });
    });
  });
});