import { describe, it, expect } from '@jest/globals';

describe('🔍 Schema Validation - CUID Fix Verification', () => {
  
  describe('✅ CUID Pattern Validation', () => {
    it('should validate CUID pattern used in API schemas', () => {
      // Pattern from our API schema fix
      const cuidPattern = /^c[a-z0-9]+$/;
      
      // Test cases from real system
      const testCases = [
        // ✅ Valid CUIDs (should pass)
        { id: 'cmet8mc410001jtvvwgy3erni', description: 'CUID from error log', valid: true },
        { id: 'cmet94r3z0000iexeb8y36dxr', description: 'Generated CUID', valid: true },
        { id: 'ckpqrstu1234567890abcdef', description: 'Standard CUID format', valid: true },
        { id: 'c123456789abcdefghijklmno', description: 'Alphanumeric CUID', valid: true },
        
        // ❌ Invalid formats (should fail)
        { id: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID format', valid: false },
        { id: 'invalid-id', description: 'Invalid with dashes', valid: false },
        { id: '123', description: 'Short number', valid: false },
        { id: '', description: 'Empty string', valid: false },
        { id: 'Cmet8mc410001jtvvwgy3erni', description: 'Uppercase C', valid: false },
        { id: 'met8mc410001jtvvwgy3erni', description: 'Missing c prefix', valid: false },
        { id: 'cmet8mc410001jtvvwgy3erni!', description: 'Special characters', valid: false },
      ];

      testCases.forEach(test => {
        const matches = cuidPattern.test(test.id);
        const lengthOk = test.id.length >= 20 && test.id.length <= 30;
        const isValid = matches && lengthOk;

        console.log(`📋 ${test.description}:`);
        console.log(`   ID: "${test.id}"`);
        console.log(`   Pattern match: ${matches ? '✅' : '❌'}`);
        console.log(`   Length (${test.id.length}): ${lengthOk ? '✅' : '❌'}`);
        console.log(`   Overall: ${isValid ? '✅' : '❌'} (Expected: ${test.valid ? '✅' : '❌'})`);
        console.log('');

        expect(isValid).toBe(test.valid);
      });
    });

    it('should demonstrate the fix for 400 Bad Request error', () => {
      const problematicId = 'cmet8mc410001jtvvwgy3erni';
      
      // Old UUID validation (what was causing the error)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const oldValidation = uuidPattern.test(problematicId);
      
      // New CUID validation (our fix)
      const cuidPattern = /^c[a-z0-9]+$/;
      const newValidation = cuidPattern.test(problematicId) && 
                           problematicId.length >= 20 && 
                           problematicId.length <= 30;

      console.log(`🔍 Testing ID: ${problematicId}`);
      console.log(`❌ Old (UUID) validation: ${oldValidation} (caused 400 error)`);
      console.log(`✅ New (CUID) validation: ${newValidation} (should work now)`);

      expect(oldValidation).toBe(false); // This was the problem
      expect(newValidation).toBe(true);  // This is the solution
    });
  });

  describe('🛠️ Schema Definition Validation', () => {
    it('should validate the schema properties we implemented', () => {
      // Our schema definition for CUID validation
      const schemaDefinition = {
        type: 'string',
        minLength: 20,
        maxLength: 30,
        pattern: '^c[a-z0-9]+$'
      };

      // Test the constraints
      const testIds = [
        { id: 'cmet8mc410001jtvvwgy3erni', shouldPass: true, reason: 'Valid CUID' },
        { id: 'c12345678901234567890', shouldPass: true, reason: 'Minimum length CUID' },
        { id: 'c12345678901234567890123456789', shouldPass: true, reason: 'Maximum length CUID (30 chars)' },
        { id: 'c123456789012345678', shouldPass: false, reason: 'Too short' },
        { id: 'c1234567890123456789012345678901', shouldPass: false, reason: 'Too long' },
        { id: '550e8400-e29b-41d4-a716-446655440000', shouldPass: false, reason: 'UUID format' },
      ];

      testIds.forEach(test => {
        const pattern = new RegExp(schemaDefinition.pattern);
        const patternMatch = pattern.test(test.id);
        const lengthValid = test.id.length >= schemaDefinition.minLength && 
                           test.id.length <= schemaDefinition.maxLength;
        const isValid = patternMatch && lengthValid;

        console.log(`🧪 ${test.reason}: ${test.id}`);
        console.log(`   Length ${test.id.length}: ${lengthValid ? '✅' : '❌'}`);
        console.log(`   Pattern: ${patternMatch ? '✅' : '❌'}`);
        console.log(`   Valid: ${isValid ? '✅' : '❌'} (Expected: ${test.shouldPass ? '✅' : '❌'})`);

        expect(isValid).toBe(test.shouldPass);
      });
    });
  });

  describe('📊 Performance and Compatibility', () => {
    it('should have efficient pattern matching', () => {
      const pattern = /^c[a-z0-9]+$/;
      const testId = 'cmet8mc410001jtvvwgy3erni';
      
      // Measure pattern matching performance
      const start = process.hrtime.bigint();
      
      for (let i = 0; i < 10000; i++) {
        pattern.test(testId);
      }
      
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1000000;
      
      console.log(`⚡ Pattern matching performance: ${durationMs.toFixed(2)}ms for 10,000 tests`);
      
      // Should be very fast
      expect(durationMs).toBeLessThan(100); // Less than 100ms for 10k tests
    });

    it('should work with both old and new ID formats for migration', () => {
      const cuidPattern = /^c[a-z0-9]+$/;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      const mixedIds = [
        'cmet8mc410001jtvvwgy3erni', // CUID
        '550e8400-e29b-41d4-a716-446655440000', // UUID
      ];

      mixedIds.forEach(id => {
        const isCuid = cuidPattern.test(id);
        const isUuid = uuidPattern.test(id);
        const validId = isCuid || isUuid; // Either format is technically valid
        
        console.log(`🔄 ID: ${id}`);
        console.log(`   CUID: ${isCuid ? '✅' : '❌'}`);
        console.log(`   UUID: ${isUuid ? '✅' : '❌'}`);
        console.log(`   Valid ID: ${validId ? '✅' : '❌'}`);
        
        expect(validId).toBe(true);
      });
    });
  });
});