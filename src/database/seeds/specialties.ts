import { PrismaClient } from '../generated/client';

// Simple logger for seed
const logger = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err)
};

const specialties = [
  {
    name: 'Clínica Geral',
    description: 'Especialidade médica que aborda de forma integral e contínua os problemas de saúde mais prevalentes.',
    duration: 30,
  },
  {
    name: 'Cardiologia',
    description: 'Especialidade médica que se ocupa do diagnóstico e tratamento das doenças que acometem o coração.',
    duration: 45,
  },
  {
    name: 'Dermatologia',
    description: 'Especialidade médica que se ocupa do diagnóstico, prevenção e tratamento de doenças da pele.',
    duration: 30,
  },
  {
    name: 'Ginecologia',
    description: 'Especialidade médica que trata de doenças do sistema reprodutor feminino.',
    duration: 45,
  },
  {
    name: 'Pediatria',
    description: 'Especialidade médica dedicada à assistência à criança e ao adolescente.',
    duration: 30,
  },
  {
    name: 'Ortopedia',
    description: 'Especialidade médica que se concentra no diagnóstico, tratamento e prevenção de doenças do aparelho locomotor.',
    duration: 45,
  },
  {
    name: 'Oftalmologia',
    description: 'Especialidade médica que estuda e trata as doenças relacionadas aos olhos.',
    duration: 30,
  },
  {
    name: 'Neurologia',
    description: 'Especialidade médica que trata dos distúrbios estruturais do sistema nervoso.',
    duration: 60,
  },
  {
    name: 'Psiquiatria',
    description: 'Especialidade médica que lida com a prevenção, diagnóstico e tratamento de transtornos mentais.',
    duration: 50,
  },
  {
    name: 'Endocrinologia',
    description: 'Especialidade médica que estuda as ordens e desordens relacionadas aos hormônios.',
    duration: 45,
  },
  {
    name: 'Urologia',
    description: 'Especialidade médica que trata do trato urinário de homens e mulheres e do sistema reprodutor masculino.',
    duration: 30,
  },
  {
    name: 'Otorrinolaringologia',
    description: 'Especialidade médica que cuida dos distúrbios do ouvido, nariz, seios paranasais, faringe e laringe.',
    duration: 30,
  },
];

export async function seedSpecialties(prisma: PrismaClient): Promise<void> {
  try {
    logger.info('🏥 Seeding medical specialties...');

    for (const specialty of specialties) {
      await prisma.specialty.upsert({
        where: { name: specialty.name },
        update: specialty,
        create: specialty,
      });
    }

    const count = await prisma.specialty.count();
    logger.info(`✅ Seeded ${count} medical specialties`);
  } catch (error) {
    logger.error('❌ Failed to seed specialties:', error);
    throw error;
  }
}