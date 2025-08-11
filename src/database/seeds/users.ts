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

    // No sample users - only admin will remain

    const userCount = await prisma.user.count();
    logger.info(`✅ Seeded ${userCount} user (admin only)`);
    logger.info(`📧 Admin credentials: admin@eoclinica.com.br / Admin123!`);
  } catch (error) {
    logger.error('❌ Failed to seed users:', error);
    throw error;
  }
}