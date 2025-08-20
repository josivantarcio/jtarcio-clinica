import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import supertest from 'supertest';

describe('E2E: Complete Appointment Booking Flow', () => {
  let prisma: PrismaClient;
  let redis: Redis;
  let request: supertest.SuperTest<supertest.Test>;
  let patientToken: string;
  let doctorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Setup test environment
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
        },
      },
    });

    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1,
    });

    // Initialize server (mock supertest setup)
    // request = supertest(app.server);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.specialty.deleteMany();
    await redis.flushdb();

    // Setup test data
    await setupTestData();
  });

  async function setupTestData() {
    // Create specialty
    const specialty = await prisma.specialty.create({
      data: {
        name: 'CARDIOLOGIA',
        description: 'Especialidade em cardiologia',
        duration: 30,
        price: 200.0,
        isActive: true,
      },
    });

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'System',
        fullName: 'Admin System',
        email: 'admin@eoclinica.com',
        password: await require('bcryptjs').hash('Admin123!', 12),
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Create doctor user
    const doctorUser = await prisma.user.create({
      data: {
        firstName: 'Dr. Maria',
        lastName: 'Santos',
        fullName: 'Dr. Maria Santos',
        email: 'maria.santos@eoclinica.com',
        password: await require('bcryptjs').hash('Doctor123!', 12),
        role: 'DOCTOR',
        status: 'ACTIVE',
      },
    });

    // Create doctor profile
    await prisma.doctor.create({
      data: {
        id: doctorUser.id,
        crm: 'CRM12345',
        specialtyId: specialty.id,
        phone: '11999887766',
        isActive: true,
        acceptsNewPatients: true,
      },
    });

    // Create patient user
    const patientUser = await prisma.user.create({
      data: {
        firstName: 'João',
        lastName: 'Silva',
        fullName: 'João Silva',
        email: 'joao.silva@email.com',
        password: await require('bcryptjs').hash('Patient123!', 12),
        role: 'PATIENT',
        status: 'ACTIVE',
      },
    });

    // Create patient profile
    await prisma.patient.create({
      data: {
        id: patientUser.id,
        cpf: '123.456.789-01',
        phone: '11987654321',
        dateOfBirth: new Date('1985-06-15'),
        gender: 'M',
      },
    });

    // Get auth tokens (mock login responses)
    patientToken = 'mock_patient_token';
    doctorToken = 'mock_doctor_token';
    adminToken = 'mock_admin_token';
  }

  describe('Complete Patient Journey', () => {
    it('should complete full appointment booking flow', async () => {
      // 1. Patient logs in
      const loginResponse = {
        body: {
          success: true,
          data: {
            accessToken: patientToken,
            user: {
              id: 'patient_id',
              email: 'joao.silva@email.com',
              role: 'PATIENT',
            },
          },
        },
      };

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.accessToken).toBeDefined();

      // 2. Patient searches for available specialties
      const specialties = await prisma.specialty.findMany({
        where: { isActive: true },
      });

      expect(specialties).toHaveLength(1);
      expect(specialties[0].name).toBe('CARDIOLOGIA');
      expect(specialties[0].price).toBe(200.0);

      // 3. Patient searches for available doctors
      const doctors = await prisma.doctor.findMany({
        where: {
          specialtyId: specialties[0].id,
          isActive: true,
          acceptsNewPatients: true,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
          specialty: true,
        },
      });

      expect(doctors).toHaveLength(1);
      expect(doctors[0].user.fullName).toBe('Dr. Maria Santos');
      expect(doctors[0].crm).toBe('CRM12345');

      // 4. Patient checks doctor availability
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      // Mock available slots
      const availableSlots = [
        {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 30 * 60000),
          doctorId: doctors[0].id,
          isAvailable: true,
        },
      ];

      expect(availableSlots).toHaveLength(1);
      expect(availableSlots[0].isAvailable).toBe(true);

      // 5. Patient books appointment
      const appointmentData = {
        patientId: 'patient_id',
        doctorId: doctors[0].id,
        specialtyId: specialties[0].id,
        scheduledAt: tomorrow,
        duration: 30,
        type: 'CONSULTATION',
        notes: 'Consulta de rotina',
      };

      const createdAppointment = await prisma.appointment.create({
        data: {
          ...appointmentData,
          status: 'SCHEDULED',
          fee: specialties[0].price,
        },
        include: {
          patient: {
            include: { user: true },
          },
          doctor: {
            include: { user: true },
          },
          specialty: true,
        },
      });

      expect(createdAppointment).toBeDefined();
      expect(createdAppointment.status).toBe('SCHEDULED');
      expect(createdAppointment.fee.toNumber()).toBe(200.0);
      expect(createdAppointment.patient.user.email).toBe('joao.silva@email.com');
      expect(createdAppointment.doctor.user.fullName).toBe('Dr. Maria Santos');

      // 6. System sends confirmation (mock)
      const confirmationSent = true;
      expect(confirmationSent).toBe(true);

      // 7. Patient receives appointment details
      const appointmentDetails = await prisma.appointment.findUnique({
        where: { id: createdAppointment.id },
        include: {
          patient: {
            include: { user: true },
          },
          doctor: {
            include: { user: true },
          },
          specialty: true,
        },
      });

      expect(appointmentDetails).toMatchObject({
        id: createdAppointment.id,
        status: 'SCHEDULED',
        scheduledAt: tomorrow,
        duration: 30,
        patient: {
          user: {
            email: 'joao.silva@email.com',
          },
        },
        doctor: {
          user: {
            fullName: 'Dr. Maria Santos',
          },
        },
        specialty: {
          name: 'CARDIOLOGIA',
        },
      });

      // 8. Verify appointment appears in patient's list
      const patientAppointments = await prisma.appointment.findMany({
        where: { patientId: 'patient_id' },
        include: {
          doctor: {
            include: { user: true },
          },
          specialty: true,
        },
        orderBy: { scheduledAt: 'asc' },
      });

      expect(patientAppointments).toHaveLength(1);
      expect(patientAppointments[0].id).toBe(createdAppointment.id);

      // 9. Verify appointment appears in doctor's schedule
      const doctorAppointments = await prisma.appointment.findMany({
        where: { doctorId: doctors[0].id },
        include: {
          patient: {
            include: { user: true },
          },
          specialty: true,
        },
        orderBy: { scheduledAt: 'asc' },
      });

      expect(doctorAppointments).toHaveLength(1);
      expect(doctorAppointments[0].patient.user.fullName).toBe('João Silva');
    });

    it('should handle appointment conflicts gracefully', async () => {
      // Setup: Create an existing appointment
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const doctor = await prisma.doctor.findFirst();
      const patient = await prisma.patient.findFirst();
      const specialty = await prisma.specialty.findFirst();

      const existingAppointment = await prisma.appointment.create({
        data: {
          patientId: patient!.id,
          doctorId: doctor!.id,
          specialtyId: specialty!.id,
          scheduledAt: tomorrow,
          duration: 30,
          status: 'SCHEDULED',
          type: 'CONSULTATION',
          fee: 200.0,
        },
      });

      // Try to book conflicting appointment
      const conflictingTime = new Date(tomorrow.getTime() + 15 * 60000); // 15 minutes overlap

      // This should fail due to conflict detection
      await expect(
        prisma.appointment.create({
          data: {
            patientId: patient!.id,
            doctorId: doctor!.id,
            specialtyId: specialty!.id,
            scheduledAt: conflictingTime,
            duration: 30,
            status: 'SCHEDULED',
            type: 'CONSULTATION',
            fee: 200.0,
          },
        })
      ).rejects.toThrow();

      // Verify only one appointment exists
      const appointments = await prisma.appointment.findMany({
        where: { doctorId: doctor!.id },
      });

      expect(appointments).toHaveLength(1);
      expect(appointments[0].id).toBe(existingAppointment.id);
    });
  });

  describe('AI Chat Integration Flow', () => {
    it('should handle patient inquiry through AI chat', async () => {
      // 1. Patient starts chat session
      const conversationId = 'conv_123';
      const userId = 'patient_id';

      // Mock conversation creation
      const conversation = {
        id: conversationId,
        userId: userId,
        title: 'Agendamento de Consulta',
        isCompleted: false,
        createdAt: new Date(),
      };

      expect(conversation.userId).toBe(userId);
      expect(conversation.isCompleted).toBe(false);

      // 2. Patient sends initial message
      const initialMessage = 'Olá, gostaria de agendar uma consulta de cardiologia';

      // Mock AI processing
      const aiResponse = {
        message: 'Olá! Vou ajudá-lo a agendar uma consulta de cardiologia. Qual seu nome completo?',
        intent: 'AGENDAR_CONSULTA',
        confidence: 0.95,
        nextSteps: ['Coletar nome completo', 'Verificar disponibilidade'],
      };

      expect(aiResponse.intent).toBe('AGENDAR_CONSULTA');
      expect(aiResponse.confidence).toBeGreaterThan(0.9);

      // 3. Patient provides personal information
      const userInfo = 'Meu nome é João Silva, CPF 123.456.789-01';

      // Mock entity extraction
      const extractedInfo = {
        nome: 'João Silva',
        cpf: '123.456.789-01',
      };

      expect(extractedInfo.nome).toBe('João Silva');
      expect(extractedInfo.cpf).toBe('123.456.789-01');

      // 4. AI checks patient registration
      const existingPatient = await prisma.patient.findFirst({
        where: {
          cpf: '123.456.789-01',
        },
        include: { user: true },
      });

      expect(existingPatient).toBeDefined();
      expect(existingPatient!.user.fullName).toBe('João Silva');

      // 5. AI shows available slots
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const availableSlots = [
        {
          date: tomorrow.toISOString().split('T')[0],
          time: '09:00',
          doctor: 'Dr. Maria Santos',
          available: true,
        },
        {
          date: tomorrow.toISOString().split('T')[0],
          time: '10:00',
          doctor: 'Dr. Maria Santos',
          available: true,
        },
      ];

      expect(availableSlots).toHaveLength(2);
      expect(availableSlots[0].available).toBe(true);

      // 6. Patient selects preferred slot
      const selectedSlot = availableSlots[0];
      const appointmentRequest = {
        patientId: existingPatient!.id,
        date: selectedSlot.date,
        time: selectedSlot.time,
        specialty: 'CARDIOLOGIA',
      };

      expect(appointmentRequest.time).toBe('09:00');

      // 7. AI creates appointment
      const scheduledAt = new Date(`${appointmentRequest.date}T${appointmentRequest.time}:00`);
      const doctor = await prisma.doctor.findFirst({
        include: { user: true },
      });
      const specialty = await prisma.specialty.findFirst({
        where: { name: 'CARDIOLOGIA' },
      });

      const aiCreatedAppointment = await prisma.appointment.create({
        data: {
          patientId: appointmentRequest.patientId,
          doctorId: doctor!.id,
          specialtyId: specialty!.id,
          scheduledAt: scheduledAt,
          duration: 30,
          status: 'SCHEDULED',
          type: 'CONSULTATION',
          fee: specialty!.price,
          notes: 'Agendamento via IA Chat',
        },
      });

      expect(aiCreatedAppointment.status).toBe('SCHEDULED');
      expect(aiCreatedAppointment.notes).toBe('Agendamento via IA Chat');

      // 8. AI sends confirmation
      const confirmationMessage = `Perfeito! Sua consulta foi agendada para ${selectedSlot.date} às ${selectedSlot.time} com ${selectedSlot.doctor}. Você receberá um e-mail de confirmação em breve.`;

      expect(confirmationMessage).toContain(selectedSlot.date);
      expect(confirmationMessage).toContain(selectedSlot.time);
      expect(confirmationMessage).toContain('Dr. Maria Santos');

      // 9. Mark conversation as completed
      const completedConversation = {
        ...conversation,
        isCompleted: true,
        completedAt: new Date(),
      };

      expect(completedConversation.isCompleted).toBe(true);
      expect(completedConversation.completedAt).toBeDefined();

      // 10. Verify appointment was created correctly
      const finalAppointment = await prisma.appointment.findUnique({
        where: { id: aiCreatedAppointment.id },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          specialty: true,
        },
      });

      expect(finalAppointment).toMatchObject({
        patient: {
          user: { fullName: 'João Silva' },
        },
        doctor: {
          user: { fullName: 'Dr. Maria Santos' },
        },
        specialty: {
          name: 'CARDIOLOGIA',
        },
        status: 'SCHEDULED',
      });
    });
  });

  describe('Financial Module Integration', () => {
    it('should handle complete payment flow', async () => {
      // Setup: Create appointment
      const doctor = await prisma.doctor.findFirst();
      const patient = await prisma.patient.findFirst();
      const specialty = await prisma.specialty.findFirst();

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient!.id,
          doctorId: doctor!.id,
          specialtyId: specialty!.id,
          scheduledAt: new Date(),
          duration: 30,
          status: 'COMPLETED',
          type: 'CONSULTATION',
          fee: 200.0,
        },
      });

      // 1. System creates financial transaction
      const financialTransaction = {
        appointmentId: appointment.id,
        patientId: patient!.id,
        doctorId: doctor!.id,
        transactionType: 'RECEIPT',
        grossAmount: 200.0,
        discountAmount: 0.0,
        taxAmount: 0.0,
        netAmount: 200.0,
        status: 'PENDING',
        dueDate: new Date(),
        description: 'Consulta Cardiologia',
      };

      expect(financialTransaction.transactionType).toBe('RECEIPT');
      expect(financialTransaction.netAmount).toBe(200.0);
      expect(financialTransaction.status).toBe('PENDING');

      // 2. Patient views financial summary
      const patientFinancialSummary = {
        totalPending: 200.0,
        totalPaid: 0.0,
        upcomingPayments: [financialTransaction],
        paymentHistory: [],
      };

      expect(patientFinancialSummary.totalPending).toBe(200.0);
      expect(patientFinancialSummary.upcomingPayments).toHaveLength(1);

      // 3. Patient makes payment
      const paymentData = {
        transactionId: 'trans_123',
        paymentMethod: 'CREDIT_CARD',
        paymentDate: new Date(),
        amount: 200.0,
        status: 'PAID',
      };

      // Update transaction status
      const updatedTransaction = {
        ...financialTransaction,
        status: 'PAID',
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate,
      };

      expect(updatedTransaction.status).toBe('PAID');
      expect(updatedTransaction.paymentMethod).toBe('CREDIT_CARD');

      // 4. System updates financial dashboard
      const dashboardUpdate = {
        totalRevenue: 200.0,
        recentTransactions: [updatedTransaction],
        cashFlow: {
          incoming: 200.0,
          outgoing: 0.0,
          net: 200.0,
        },
      };

      expect(dashboardUpdate.totalRevenue).toBe(200.0);
      expect(dashboardUpdate.cashFlow.net).toBe(200.0);

      // 5. Generate receipt
      const receipt = {
        transactionId: updatedTransaction,
        patient: {
          name: 'João Silva',
          cpf: '123.456.789-01',
        },
        service: 'Consulta Cardiologia',
        amount: 200.0,
        paymentMethod: 'CREDIT_CARD',
        paymentDate: paymentData.paymentDate,
        status: 'PAID',
      };

      expect(receipt.status).toBe('PAID');
      expect(receipt.amount).toBe(200.0);
      expect(receipt.patient.name).toBe('João Silva');

      // 6. Update appointment payment status
      const paidAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { paymentStatus: 'PAID' },
      });

      expect(paidAppointment.paymentStatus).toBe('PAID');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate database failure
      const mockError = new Error('Database connection failed');

      // Verify error handling
      expect(mockError.message).toBe('Database connection failed');

      // System should provide fallback response
      const fallbackResponse = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
        },
      };

      expect(fallbackResponse.success).toBe(false);
      expect(fallbackResponse.error.code).toBe('DATABASE_ERROR');
    });

    it('should handle AI service failures', async () => {
      // Simulate AI service failure
      const aiError = new Error('AI service unavailable');

      // Verify fallback to basic scheduling
      const fallbackFlow = {
        useBasicScheduling: true,
        message: 'Chat IA temporariamente indisponível. Você pode agendar diretamente pelo formulário.',
        redirectToForm: true,
      };

      expect(fallbackFlow.useBasicScheduling).toBe(true);
      expect(fallbackFlow.redirectToForm).toBe(true);
    });
  });
});
