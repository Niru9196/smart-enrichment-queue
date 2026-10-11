import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seeder.js';

const prisma = new PrismaClient();
const email = process.env.DEMO_USER_EMAIL ?? 'demo@saasquatch.local';

seedDatabase(prisma, email)
  .then(({ companies }) => {
    console.info(`Seeded demo user ${email} and ${companies} synthetic companies.`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
