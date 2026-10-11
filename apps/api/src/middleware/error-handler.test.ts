import { Prisma } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '../errors.js';
import { errorHandler } from './error-handler.js';

vi.mock('../lib/logger.js', () => ({ log: vi.fn() }));

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`prisma ${code} at "companies"`, {
    code,
    clientVersion: 'test',
  });

function appThrowing(error: unknown) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

async function errorFor(error: unknown) {
  const res = await request(appThrowing(error)).get('/boom');
  return { status: res.status, body: res.body as { error: Record<string, unknown> } };
}

describe('errorHandler', () => {
  it('maps expected errors to their status and code', async () => {
    expect(await errorFor(new AppError(404, 'NOT_FOUND', 'Queue item not found'))).toMatchObject({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Queue item not found' } },
    });
    const zod = z.object({ page: z.number() }).safeParse({ page: 'x' }).error;
    expect(await errorFor(zod)).toMatchObject({
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR', details: [{ path: 'page' }] } },
    });
    expect(await errorFor(known('P2002'))).toMatchObject({ status: 409 });
    expect(await errorFor(known('P2003'))).toMatchObject({ status: 409 });
  });

  it('reports an unreachable database as 503 rather than a generic 500', async () => {
    for (const error of [
      new Prisma.PrismaClientInitializationError("Can't reach database server", 'test'),
      known('P1001'),
      known('P2024'),
    ]) {
      expect(await errorFor(error)).toMatchObject({
        status: 503,
        body: { error: { code: 'SERVICE_UNAVAILABLE' } },
      });
    }
  });

  it('hides internal details of unexpected errors', async () => {
    const { status, body } = await errorFor(new Error('relation "secret_table" does not exist'));
    expect(status).toBe(500);
    expect(body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
  });
});
