import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { log } from '../lib/logger.js';

const VALID_REQUEST_ID = /^[\w-]{1,64}$/;

/** Propagates or assigns a request id and writes one structured log line per request. */
export const attachRequestContext: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-request-id');
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();
  // Captured now: inside routers, req.path is relative to the mount point.
  const path = req.path;
  res.on('finish', () => {
    log('info', 'request', {
      requestId,
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Number((process.hrtime.bigint() - start) / 1_000_000n),
    });
  });
  next();
};
