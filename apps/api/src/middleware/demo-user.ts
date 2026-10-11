import type { RequestHandler, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../errors.js';
import { prisma } from '../lib/prisma.js';

let cachedUserId: string | null = null;

/**
 * Demo-only identity: every request acts as the seeded demo user. There is no authentication,
 * so this must be replaced before storing real customer data.
 */
export const attachDemoUser: RequestHandler = async (_req, res, next) => {
  if (!cachedUserId) {
    const user = await prisma.user.findUnique({
      where: { email: env.DEMO_USER_EMAIL },
      select: { id: true },
    });
    if (!user) {
      throw new AppError(503, 'DEMO_USER_MISSING', 'Demo user not found. Run the seed script.');
    }
    cachedUserId = user.id;
  }

  res.locals.userId = cachedUserId;
  next();
};

/** The current user's id; every user-scoped service call is filtered by it. */
export function currentUserId(res: Response): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== 'string') {
    throw new AppError(500, 'USER_CONTEXT_MISSING', 'User context was not initialised');
  }
  return userId;
}

export function resetDemoUserCache(): void {
  cachedUserId = null;
}
