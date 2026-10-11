import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../errors.js';
import { log } from '../lib/logger.js';

interface ErrorBody {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/** body-parser errors carry a `type` string; nothing else about them is relied on. */
function bodyParserType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string') {
    return err.type;
  }
  return undefined;
}

// Prisma codes for unreachable server, auth/handshake timeout, closed connection, pool timeout.
const DB_UNAVAILABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

function isDatabaseUnavailable(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && DB_UNAVAILABLE_CODES.has(err.code))
  );
}

function toErrorBody(err: unknown): ErrorBody {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof z.ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid fields.',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return { status: 409, code: 'CONFLICT', message: 'Resource already exists' };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
    return { status: 409, code: 'CONFLICT', message: 'A referenced record no longer exists' };
  }

  if (isDatabaseUnavailable(err)) {
    return {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The database is temporarily unavailable; try again shortly',
    };
  }

  const parserType = bodyParserType(err);
  if (parserType === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
  }
  if (parserType === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
  }

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong' };
}

export const notFoundRoute: RequestHandler = (req) => {
  throw new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  // A response already in flight can't get a new status; Express's default handler closes it.
  if (res.headersSent) {
    next(err);
    return;
  }
  const requestId: unknown = res.locals.requestId;
  const body = toErrorBody(err);

  if (body.status >= 500) {
    log('error', 'unhandled_error', {
      requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      code: body.code,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  res.status(body.status).json({
    error: {
      code: body.code,
      message: body.message,
      requestId,
      ...(body.details ? { details: body.details } : {}),
    },
  });
};
