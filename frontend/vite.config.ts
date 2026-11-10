import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import {
  API_CACHE_MAX_AGE_SECONDS,
  API_CACHE_MAX_ENTRIES,
  API_CACHE_NAME,
  API_NETWORK_TIMEOUT_SECONDS,
  CACHEABLE_API_PATTERN,
} from './src/lib/pwa/cache-rules.ts';
import { APP_MANIFEST } from './src/lib/pwa/manifest.ts';

const BACKEND_DEV_URL = 'http://localhost:3000';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A versão nova espera o aviso "Atualizar": nada recarrega no meio de um formulário.
      registerType: 'prompt',
      // Um service worker no `npm run dev` atrapalha o hot reload: teste com build + preview.
      devOptions: { enabled: false },
      manifest: APP_MANIFEST,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // As imagens de abertura são só do iOS, que as busca sozinho; não precisam do pré-cache.
        globIgnores: ['splash-*.png'],
        // Qualquer rota do app abre o shell; a API nunca recebe o HTML como resposta.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: CACHEABLE_API_PATTERN,
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: API_CACHE_NAME,
              networkTimeoutSeconds: API_NETWORK_TIMEOUT_SECONDS,
              expiration: {
                maxEntries: API_CACHE_MAX_ENTRIES,
                maxAgeSeconds: API_CACHE_MAX_AGE_SECONDS,
              },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  // Este código é copiado como texto para dentro do sw.js: não pode usar nada de fora,
                  // nem a constante CACHED_AT_HEADER (o nome do cabeçalho é o mesmo de cache-rules.ts).
                  cachedResponseWillBeUsed: async ({ cachedResponse }) => {
                    if (!cachedResponse) return cachedResponse;
                    const headers = new Headers(cachedResponse.headers);
                    headers.set(
                      'X-Valora-Cached-At',
                      cachedResponse.headers.get('date') ?? new Date().toUTCString(),
                    );
                    return new Response(cachedResponse.body, {
                      status: cachedResponse.status,
                      statusText: cachedResponse.statusText,
                      headers,
                    });
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: { '/api': BACKEND_DEV_URL },
  },
});
