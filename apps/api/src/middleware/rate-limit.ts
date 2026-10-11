import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../errors.js';

const rateLimitHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(429, 'RATE_LIMITED', 'Too many requests; slow down'));
};

const perMinute = (limit: number): RequestHandler =>
  rateLimit({
    windowMs: 60_000,
    limit: env.NODE_ENV === 'test' ? 10_000 : limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler,
  });

export const globalRateLimit = perMinute(300);

/** Exports score the full filtered set, so they get a tighter budget than normal reads. */
export const exportRateLimit = perMinute(20);
