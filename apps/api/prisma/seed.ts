import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seeder.js';

// Local `apps/api/.env` is gitignored. Render/CI inject DATABASE_URL instead; --env-file=.env
// would exit 9 there because the file does not exist.
const localEnv = resolve(import.meta.dirname, '../.env');
if (existsSync(localEnv)) {
  process.loadEnvFile(localEnv);
}

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
