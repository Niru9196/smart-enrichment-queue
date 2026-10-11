import { execSync } from 'node:child_process';

export default function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? 'postgresql://seq:seq@localhost:5433/seq_test';
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  const opts = { cwd: 'apps/api', env, stdio: 'inherit' as const };

  execSync('npx prisma migrate deploy', opts);
  execSync(
    `npx prisma db execute --url "${url}" --stdin <<'SQL'
TRUNCATE queue_items, user_preferences, companies, users RESTART IDENTITY CASCADE;
SQL`,
    { ...opts, shell: '/bin/bash' },
  );
  execSync('npx tsx prisma/seed.ts', opts);
}
