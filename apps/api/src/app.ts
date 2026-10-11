import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundRoute } from './middleware/error-handler.js';
import { globalRateLimit } from './middleware/rate-limit.js';
import { attachRequestContext } from './middleware/request-context.js';
import { securityHeaders } from './middleware/security-headers.js';
import { router } from './routes/index.js';

/** Builds the Express app without listening, so tests can drive it directly. */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  // Render (and most PaaS hosts) sit behind one proxy hop; needed for per-client rate limiting.
  app.set('trust proxy', 1);

  app.use(attachRequestContext);
  app.use(securityHeaders);
  app.use(
    cors({ origin: env.FRONTEND_ORIGIN, exposedHeaders: ['x-request-id', 'content-disposition'] }),
  );
  app.use(globalRateLimit);
  app.use(express.json({ limit: '32kb' }));

  app.use('/api/v1', router);
  app.use(notFoundRoute);
  app.use(errorHandler);
  return app;
}
