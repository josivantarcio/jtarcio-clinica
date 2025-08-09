import { PrismaClient } from '../generated/client';
import { seedSpecialties } from './specialties';
import { seedUsers } from './users';
import { seedSystemConfigurations } from './system-configurations';

// Simple logger for seed
const logger = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err)
};

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    logger.info('🌱 Starting database seeding...');

    // Seed in order of dependencies
    await seedSystemConfigurations(prisma);
    await seedSpecialties(prisma);
    await seedUsers(prisma);

    logger.info('✅ Database seeding completed successfully');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeds if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { main as seedDatabase };