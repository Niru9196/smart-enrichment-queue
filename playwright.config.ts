import { defineConfig, devices } from '@playwright/test';

// E2E runs its own API and web servers on separate ports against a reseeded test database,
// so it never touches the development database or running dev servers.
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://seq:seq@localhost:5433/seq_test';
const API_PORT = 4100;
const WEB_PORT = 5180;

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: 'apps/api',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        DATABASE_URL,
        DIRECT_URL: DATABASE_URL,
        FRONTEND_ORIGIN: `http://localhost:${WEB_PORT}`,
        DEMO_USER_EMAIL: 'demo@saasquatch.local',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: 'apps/web',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: `http://localhost:${API_PORT}/api/v1` },
    },
  ],
});
