import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist', '**/coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/api/**/*.ts', 'tests/**/*.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['apps/api/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'error' },
  },
  {
    // Controllers and views never talk to Prisma.
    files: ['apps/api/src/{controllers,views}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../lib/prisma.js',
              message: 'Prisma belongs in services. Controllers call services.',
            },
            {
              name: '../../lib/prisma.js',
              message: 'Prisma belongs in services. Controllers call services.',
            },
            {
              name: '@prisma/client',
              message: 'Prisma belongs in services. Controllers call services.',
            },
          ],
        },
      ],
    },
  },
  {
    // Routes declare endpoints only.
    files: ['apps/api/src/routes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../lib/prisma.js',
              message: 'Routes declare endpoints only. Call a controller, not a service.',
            },
            {
              name: '@prisma/client',
              message: 'Routes declare endpoints only. Call a controller, not a service.',
            },
          ],
          patterns: [
            {
              group: ['../services/*', '../domain/*'],
              message: 'Routes declare endpoints only. Call a controller, not a service.',
            },
          ],
        },
      ],
    },
  },
  {
    // MVP layering: views render and call presenter hooks (features/*/use-*.ts); only presenters
    // talk to services and TanStack Query.
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['**/*.test.tsx', 'apps/web/src/main.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/*.service', '@/services/query-keys'],
              message: 'Views call presenter hooks (features/*/use-*.ts), not services.',
            },
          ],
          paths: [
            {
              name: '@tanstack/react-query',
              message: 'Server state belongs in presenter hooks (features/*/use-*.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
);
