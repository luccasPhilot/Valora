import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      alias: {
        'virtual:pwa-register/react': fileURLToPath(
          new URL('./test/helpers/pwa-register-stub.ts', import.meta.url),
        ),
      },
    },
    test: {
      environment: 'jsdom',
      testTimeout: 15_000,
      setupFiles: ['./test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    },
  }),
);
