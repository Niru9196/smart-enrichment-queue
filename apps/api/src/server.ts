import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { log } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { healthService } from './services/health.js';

let server: Server | undefined;

async function start(): Promise<void> {
  await healthService.assertDatabaseReachable();
  server = createApp().listen(env.PORT, () => {
    log('info', 'api_listening', { port: env.PORT, env: env.NODE_ENV });
  });
}

function shutdown(signal: string): void {
  log('info', 'shutdown', { signal });
  const exitAfterDisconnect = (): void => {
    prisma
      .$disconnect()
      .catch((error: unknown) => log('error', 'prisma_disconnect_failed', { error: String(error) }))
      .finally(() => process.exit(0));
  };

  if (!server) {
    exitAfterDisconnect();
    return;
  }

  server.close(exitAfterDisconnect);
  setTimeout(() => process.exit(1), 10_000).unref();
}

// Process state is unknown after these; log them and exit so the host restarts a clean process.
function crash(kind: string, error: unknown): void {
  log('error', kind, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
}

process.on('unhandledRejection', (reason) => crash('unhandled_rejection', reason));
process.on('uncaughtException', (error) => crash('uncaught_exception', error));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error: unknown) => crash('startup_failed', error));
