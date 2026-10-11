import { defineConfig } from 'vitest/config';

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://seq:seq@localhost:5433/seq_test';

// Shared so modules that read config/env.ts load in both projects. Unit tests never connect.
const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  DIRECT_URL: testDatabaseUrl,
  DEMO_USER_EMAIL: 'api-test@seq.local',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  CREDITS_PER_ENRICHMENT: '1',
};

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['src/**/*.test.ts'], env: testEnv } },
      {
        test: {
          name: 'api',
          include: ['tests/**/*.test.ts'],
          globalSetup: ['tests/global-setup.ts'],
          fileParallelism: false,
          env: testEnv,
        },
      },
    ],
  },
});
