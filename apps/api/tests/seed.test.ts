import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateSeedCompanies, SEED_SOURCE } from '../prisma/seed-data.js';
import { seedDatabase } from '../prisma/seeder.js';
import { DEFAULT_CRITERIA } from '../src/domain/scoring/criteria.js';
import { prisma } from '../src/lib/prisma.js';

const email = 'seed-test@seq.local';

beforeAll(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE queue_items, user_preferences, companies, users RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('seed', () => {
  it('generates the same dataset every time', () => {
    expect(generateSeedCompanies()).toEqual(generateSeedCompanies());
  });

  it('is safely repeatable and keeps saved preferences and queue items', async () => {
    const first = await seedDatabase(prisma, email);
    const custom = { ...DEFAULT_CRITERIA, completeness: { weight: 9 } };
    await prisma.userPreference.update({
      where: { userId: first.userId },
      data: { criteria: custom },
    });
    const company = await prisma.company.findFirstOrThrow({ where: { source: SEED_SOURCE } });
    await prisma.queueItem.create({
      data: { userId: first.userId, companyId: company.id, estimatedCredits: 1 },
    });

    const second = await seedDatabase(prisma, email);

    expect(second.userId).toBe(first.userId);
    expect(await prisma.company.count({ where: { source: SEED_SOURCE } })).toBe(first.companies);
    expect(await prisma.queueItem.count({ where: { userId: first.userId } })).toBe(1);
    const prefs = await prisma.userPreference.findUniqueOrThrow({
      where: { userId: first.userId },
    });
    expect(prefs.criteria).toEqual(custom);
  });
});
