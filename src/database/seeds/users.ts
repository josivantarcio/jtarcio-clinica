import { PrismaClient } from '../generated/client';
import bcrypt from 'bcryptjs';

// Simple logger for seed
const logger = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err)
};

// Simple env for seed
const env = {
  SALT_ROUNDS: 12
};

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  try {
    logger.info('👥 Seeding users...');

    // Get some specialties for doctors
    const specialties = await prisma.specialty.findMany({
      take: 5,
    });

    if (specialties.length === 0) {
      throw new Error('No specialties found. Please seed specialties first.');
    }

    const defaultPassword = await bcrypt.hash('Admin123!', env.SALT_ROUNDS);

    // Admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@eoclinica.com.br' },
      update: {},
      create: {
        email: 'admin@eoclinica.com.br',
        phone: '+5511999999999',
        password: defaultPassword,
        firstName: 'Administrador',
        lastName: 'Sistema',
        fullName: 'Administrador Sistema',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });

    // Sample doctor
    const doctorUser = await prisma.user.upsert({
      where: { email: 'dr.silva@eoclinica.com.br' },
      update: {},
      create: {
        email: 'dr.silva@eoclinica.com.br',
        phone: '+5511888888888',
        cpf: '123.456.789-00',
        password: defaultPassword,
        firstName: 'João',
        lastName: 'Silva',
        fullName: 'Dr. João Silva',
        dateOfBirth: new Date('1980-05-15'),
        gender: 'M',
        role: 'DOCTOR',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });

    // Create doctor profile
    await prisma.doctor.upsert({
      where: { userId: doctorUser.id },
      update: {},
      create: {
        userId: doctorUser.id,
        crm: '12345/SP',
        specialtyId: specialties[0].id,
        biography: 'Médico com mais de 15 anos de experiência em clínica geral.',
        experience: 15,
        consultationFee: 200.0,
        consultationDuration: 30,
        isActive: true,
        acceptsNewPatients: true,
        workingHours: {
          monday: { start: '08:00', end: '17:00' },
          tuesday: { start: '08:00', end: '17:00' },
          wednesday: { start: '08:00', end: '17:00' },
          thursday: { start: '08:00', end: '17:00' },
          friday: { start: '08:00', end: '17:00' },
          saturday: { start: '08:00', end: '12:00' },
        },
      },
    });

    // Sample receptionist
    const receptionistUser = await prisma.user.upsert({
      where: { email: 'recepcao@eoclinica.com.br' },
      update: {},
      create: {
        email: 'recepcao@eoclinica.com.br',
        phone: '+5511777777777',
        password: defaultPassword,
        firstName: 'Maria',
        lastName: 'Santos',
        fullName: 'Maria Santos',
        role: 'RECEPTIONIST',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    // Sample patient
    const patientUser = await prisma.user.upsert({
      where: { email: 'paciente@example.com' },
      update: {},
      create: {
        email: 'paciente@example.com',
        phone: '+5511666666666',
        cpf: '987.654.321-00',
        password: defaultPassword,
        firstName: 'Ana',
        lastName: 'Costa',
        fullName: 'Ana Costa',
        dateOfBirth: new Date('1990-03-20'),
        gender: 'F',
        role: 'PATIENT',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    // Create patient profile
    await prisma.patient.upsert({
      where: { userId: patientUser.id },
      update: {},
      create: {
        userId: patientUser.id,
        emergencyContactName: 'José Costa',
        emergencyContactPhone: '+5511555555555',
        allergies: ['Penicilina'],
        medications: [],
        address: {
          street: 'Rua das Flores, 123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
          country: 'Brasil',
        },
        preferredDoctors: [],
        preferredTimes: {
          morning: true,
          afternoon: false,
          evening: false,
        },
      },
    });

    // Create availability for the doctor
    const doctor = await prisma.doctor.findUnique({ where: { userId: doctorUser.id } });
    if (doctor) {
      const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday
      for (const day of daysOfWeek) {
        await prisma.availability.upsert({
          where: {
            doctorId_dayOfWeek: {
              doctorId: doctor.id,
              dayOfWeek: day,
            },
          },
          update: {},
          create: {
            doctorId: doctor.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '17:00',
            slotDuration: 30,
            isActive: true,
          },
        });
      }

      // Saturday morning
      await prisma.availability.upsert({
        where: {
          doctorId_dayOfWeek: {
            doctorId: doctor.id,
            dayOfWeek: 6,
          },
        },
        update: {},
        create: {
          doctorId: doctor.id,
          dayOfWeek: 6,
          startTime: '08:00',
          endTime: '12:00',
          slotDuration: 30,
          isActive: true,
        },
      });
    }

    const userCount = await prisma.user.count();
    logger.info(`✅ Seeded ${userCount} users with profiles`);
    logger.info(`📧 Admin credentials: admin@eoclinica.com.br / Admin123!`);
    logger.info(`👨‍⚕️ Doctor credentials: dr.silva@eoclinica.com.br / Admin123!`);
    logger.info(`👩‍💼 Receptionist credentials: recepcao@eoclinica.com.br / Admin123!`);
    logger.info(`🤒 Patient credentials: paciente@example.com / Admin123!`);
  } catch (error) {
    logger.error('❌ Failed to seed users:', error);
    throw error;
  }
}