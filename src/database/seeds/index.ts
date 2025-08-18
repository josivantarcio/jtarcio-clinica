import { seedSpecialties } from './specialties';
import { seedUsers } from './users';
import { seedSystemConfigurations } from './system-configurations';
import { prisma } from '../../config/database';

// Simple logger for seed
const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
};

async function main(): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    // Seed in order of dependencies
    await seedSystemConfigurations(prisma);
    await seedSpecialties(prisma);
    await seedUsers(prisma);

    logger.info('[SUCCESS] Database seeding completed successfully');
  } catch (error) {
    logger.error('[ERROR] Database seeding failed:', error);
    throw error;
  }
}

// Run seeds if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export { main as seedDatabase };
