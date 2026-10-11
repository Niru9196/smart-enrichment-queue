import type { PrismaClient } from '@prisma/client';
import { DEFAULT_CRITERIA } from '../src/domain/scoring/criteria.js';
import { generateSeedCompanies, SEED_SOURCE } from './seed-data.js';

export interface SeedResult {
  userId: string;
  companies: number;
}

/**
 * Idempotent demo seed: upserts the demo user, default preferences (kept if already saved), and
 * synthetic companies keyed by (source, source_record_id). It never deletes or touches queue items
 * or records from other sources. Do not run against production data.
 */
export async function seedDatabase(prisma: PrismaClient, email: string): Promise<SeedResult> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
    select: { id: true },
  });

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, criteria: DEFAULT_CRITERIA },
  });

  const companies = generateSeedCompanies();
  await prisma.$transaction(
    companies.map(({ sourceRecordId, estimatedRevenue, ...data }) => {
      const record = {
        ...data,
        estimatedRevenue: estimatedRevenue === null ? null : BigInt(estimatedRevenue),
      };
      return prisma.company.upsert({
        where: { source_sourceRecordId: { source: SEED_SOURCE, sourceRecordId } },
        update: record,
        create: { ...record, source: SEED_SOURCE, sourceRecordId },
        select: { id: true },
      });
    }),
  );

  return { userId: user.id, companies: companies.length };
}
