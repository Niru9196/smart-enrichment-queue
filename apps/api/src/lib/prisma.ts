import { PrismaClient } from '@prisma/client';

/** Shared client. Connects lazily on first query; server.ts disconnects it on shutdown. */
export const prisma = new PrismaClient();
