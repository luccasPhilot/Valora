import type { ManifestOptions } from 'vite-plugin-pwa';

// As cores do manifesto são as do tema claro (`--background` do globals.css). Um teste confere,
// para não existir um segundo lugar com cor. O tema escuro entra pelas meta tags do index.html.
const MANIFEST_BACKGROUND_COLOR = '#f7f8f7';

export const APP_MANIFEST: Partial<ManifestOptions> = {
  name: 'Valora',
  short_name: 'Valora',
  description: 'Finanças pessoais com os dados do Open Finance.',
  lang: 'pt-BR',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  theme_color: MANIFEST_BACKGROUND_COLOR,
  background_color: MANIFEST_BACKGROUND_COLOR,
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    {
      src: 'maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
