import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
          exclude: ['test/integration/**'],
        },
      },
      {
        // Precisa do Docker: sobe um PostgreSQL de verdade com o Testcontainers.
        test: {
          name: 'api:integration',
          environment: 'node',
          include: ['test/integration/**/*.test.ts'],
          globalSetup: ['test/integration/global-setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
