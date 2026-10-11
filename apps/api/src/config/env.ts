import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().optional(),
  DEMO_USER_EMAIL: z.email().default('demo@saasquatch.local'),
  CREDITS_PER_ENRICHMENT: z.coerce.number().int().min(0).max(100).default(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

type RawEnv = z.infer<typeof envSchema>;
export type Env = Omit<RawEnv, 'FRONTEND_ORIGIN'> & { FRONTEND_ORIGIN: string[] };

function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = Object.keys(z.flattenError(parsed.error).fieldErrors).join(', ');
    // Names only: values may be secrets such as DATABASE_URL.
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  // Production must set CORS origins explicitly; localhost is not a safe fallback there.
  if (parsed.data.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGIN?.trim()) {
    throw new Error('Invalid environment configuration: FRONTEND_ORIGIN');
  }
  const allowedOrigins = parseAllowedOrigins(parsed.data.FRONTEND_ORIGIN);
  if (allowedOrigins.length === 0) {
    throw new Error('Invalid environment configuration: FRONTEND_ORIGIN');
  }
  return { ...parsed.data, FRONTEND_ORIGIN: allowedOrigins };
}

/** The only module that reads process.env; fails fast at startup on invalid config. */
export const env: Env = loadEnv();
