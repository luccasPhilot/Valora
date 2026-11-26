/* global self, URL */
// Recebe e mostra o push no service worker (importado pelo Workbox, ver vite.config.ts).
// Arquivo estático e sem dependências: roda dentro do service worker, não passa pelo bundler.
// O texto vem pronto do servidor e nunca leva valor nem dado (docs/03-arquitetura.md, "Segurança").

const DEFAULT_TITLE = 'Valora';
const DEFAULT_BODY = 'Alerta novo no Valora';
const DEFAULT_URL = '/';
const NOTIFICATION_ICON = '/pwa-192x192.png';

function readPayload(event) {
  try {
    const payload = event.data ? event.data.json() : {};
    return {
      title: typeof payload.title === 'string' ? payload.title : DEFAULT_TITLE,
      body: typeof payload.body === 'string' ? payload.body : DEFAULT_BODY,
      url: typeof payload.url === 'string' ? payload.url : DEFAULT_URL,
    };
  } catch {
    return { title: DEFAULT_TITLE, body: DEFAULT_BODY, url: DEFAULT_URL };
  }
}

// Só abre um destino do próprio app: qualquer outro endereço vira a tela inicial.
function sameOriginUrl(url) {
  const target = new URL(url, self.location.origin);
  return target.origin === self.location.origin ? target.href : self.location.origin + DEFAULT_URL;
}

async function openApp(url) {
  const target = sameOriginUrl(url);
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const [openWindow] = windows;
  if (!openWindow) {
    await self.clients.openWindow(target);
    return;
  }
  await openWindow.navigate(target);
  await openWindow.focus();
}

self.addEventListener('push', (event) => {
  const { title, body, url } = readPayload(event);
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? DEFAULT_URL;
  event.waitUntil(openApp(url));
});
