import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../../src/config/database';

describe('🧑‍⚕️ Patient Details - CUID Schema Validation', () => {
  let testPatientId: string;

  beforeEach(async () => {
    // Create a test patient with all required fields
    const testPatient = await prisma.user.create({
      data: {
        firstName: 'João',
        lastName: 'Silva',
        fullName: 'João Silva',
        email: 'joao.silva@test.com',
        password: '$2a$12$encrypted.hash.here',
        role: 'PATIENT',
        status: 'ACTIVE',
        phone: '11999887766',
        cpf: '12345678901',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'M',
        patientProfile: {
          create: {
            emergencyContactName: 'Maria Silva',
            emergencyContactPhone: '11999776655',
            allergies: ['Penicilina', 'Amendoim'],
            medications: ['Dipirona 500mg'],
            address: {
              street: 'Rua Test, 123',
              neighborhood: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              zipCode: '01000-000'
            }
          }
        }
      },
      include: {
        patientProfile: true
      }
    });

    testPatientId = testPatient.id;
  });

  afterEach(async () => {
    // Cleanup
    if (testPatientId) {
      await prisma.patient.deleteMany({
        where: { userId: testPatientId }
      });
      await prisma.user.delete({
        where: { id: testPatientId }
      });
    }
  });

  describe('✅ Database Schema Tests', () => {
    it('should create patient with CUID format ID', async () => {
      expect(testPatientId).toBeDefined();
      expect(typeof testPatientId).toBe('string');
      expect(testPatientId.length).toBeGreaterThan(20);
      expect(testPatientId.length).toBeLessThan(30);
      
      // CUID should start with 'c'
      expect(testPatientId).toMatch(/^c[a-z0-9]+$/);
      
      console.log(`✅ Created patient with CUID: ${testPatientId}`);
    });

    it('should retrieve patient details from database', async () => {
      const patient = await prisma.user.findUnique({
        where: { id: testPatientId },
        include: {
          patientProfile: true,
          appointments: true
        }
      });

      expect(patient).toBeDefined();
      expect(patient?.id).toBe(testPatientId);
      expect(patient?.firstName).toBe('João');
      expect(patient?.patientProfile).toBeDefined();
      expect(patient?.patientProfile?.emergencyContactName).toBe('Maria Silva');
      expect(patient?.patientProfile?.allergies).toEqual(['Penicilina', 'Amendoim']);
      
      console.log(`✅ Retrieved patient: ${patient?.fullName} (${patient?.email})`);
    });

    it('should validate CUID format characteristics', async () => {
      // Test with the existing patient ID
      const cuidRegex = /^c[a-z0-9]{24}$/; // Standard CUID format
      const flexibleCuidRegex = /^c[a-z0-9]+$/; // More flexible CUID check

      console.log(`Testing CUID: ${testPatientId}`);
      console.log(`Length: ${testPatientId.length}`);
      console.log(`Starts with 'c': ${testPatientId.startsWith('c')}`);
      console.log(`Standard CUID regex: ${cuidRegex.test(testPatientId)}`);
      console.log(`Flexible CUID regex: ${flexibleCuidRegex.test(testPatientId)}`);

      // Use flexible check since Prisma CUIDs may vary in length
      expect(testPatientId).toMatch(flexibleCuidRegex);
      expect(testPatientId.startsWith('c')).toBe(true);
      expect(testPatientId.length).toBeGreaterThan(20);
    });
  });

  describe('🔍 Patient Profile Structure', () => {
    it('should have all required fields for frontend display', async () => {
      const patient = await prisma.user.findUnique({
        where: { id: testPatientId },
        include: {
          patientProfile: true,
          appointments: {
            include: {
              specialty: true
            }
          }
        }
      });

      // Required by frontend PatientData interface
      expect(patient).toHaveProperty('id');
      expect(patient).toHaveProperty('firstName');
      expect(patient).toHaveProperty('lastName');
      expect(patient).toHaveProperty('fullName');
      expect(patient).toHaveProperty('email');
      expect(patient).toHaveProperty('phone');
      expect(patient).toHaveProperty('cpf');
      expect(patient).toHaveProperty('dateOfBirth');
      expect(patient).toHaveProperty('gender');
      expect(patient).toHaveProperty('status');
      expect(patient).toHaveProperty('createdAt');

      // Patient profile should exist
      expect(patient?.patientProfile).toBeDefined();
      expect(patient?.patientProfile).toHaveProperty('emergencyContactName');
      expect(patient?.patientProfile).toHaveProperty('emergencyContactPhone');
      expect(patient?.patientProfile).toHaveProperty('allergies');
      expect(patient?.patientProfile).toHaveProperty('medications');
      expect(patient?.patientProfile).toHaveProperty('address');

      // Arrays should be properly formatted
      expect(Array.isArray(patient?.patientProfile?.allergies)).toBe(true);
      expect(Array.isArray(patient?.patientProfile?.medications)).toBe(true);

      console.log('✅ All required fields present for frontend');
    });
  });

  describe('⚠️ ID Format Validation', () => {
    it('should identify different ID formats correctly', () => {
      const testIds = [
        { id: testPatientId, type: 'CUID', valid: true },
        { id: '550e8400-e29b-41d4-a716-446655440000', type: 'UUID', valid: true },
        { id: 'invalid-id', type: 'INVALID', valid: false },
        { id: '123', type: 'INVALID', valid: false },
        { id: '', type: 'INVALID', valid: false },
      ];

      testIds.forEach(test => {
        const isCuid = /^c[a-z0-9]+$/.test(test.id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(test.id);
        const isValidId = isCuid || isUuid;

        console.log(`ID: ${test.id}, Type: ${test.type}, CUID: ${isCuid}, UUID: ${isUuid}, Valid: ${isValidId}`);

        if (test.valid) {
          expect(isValidId).toBe(true);
        } else {
          expect(isValidId).toBe(false);
        }
      });
    });
  });
});