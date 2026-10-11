import { prisma } from '../lib/prisma.js';

export async function assertDatabaseReachable(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

export const healthService = {
  assertDatabaseReachable,
};
