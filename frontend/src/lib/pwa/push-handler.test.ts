import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

import handlerSource from '../../../public/push-handler.js?raw';

// O arquivo roda dentro do service worker, sem bundler: aqui ele roda num contexto isolado com um
// `self` falso, que guarda os ouvintes para o teste disparar os eventos.

const ORIGIN = 'https://valora.exemplo.ts.net';

type Listener = (event: unknown) => void;

interface FakeWindowClient {
  navigate: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
}

function windowClient(): FakeWindowClient {
  return { navigate: vi.fn(async () => undefined), focus: vi.fn(async () => undefined) };
}

function loadHandler(openWindows: FakeWindowClient[] = []) {
  const listeners = new Map<string, Listener>();
  const showNotification = vi.fn(async () => undefined);
  const openWindow = vi.fn(async () => undefined);
  const fakeSelf = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    registration: { showNotification },
    clients: { matchAll: vi.fn(async () => openWindows), openWindow },
  };
  runInNewContext(handlerSource, { self: fakeSelf, URL });
  return { listeners, showNotification, openWindow };
}

function pushEvent(payload: unknown) {
  const waited: Promise<unknown>[] = [];
  const event = {
    data: { json: () => payload },
    waitUntil: (promise: Promise<unknown>) => waited.push(promise),
  };
  return { event, settled: () => Promise.all(waited) };
}

function clickEvent(url: string | undefined) {
  const waited: Promise<unknown>[] = [];
  const event = {
    notification: { close: vi.fn(), data: url === undefined ? undefined : { url } },
    waitUntil: (promise: Promise<unknown>) => waited.push(promise),
  };
  return { event, settled: () => Promise.all(waited) };
}

describe('push', () => {
  it('should_show_the_notification_with_title_text_and_destination_when_a_push_arrives', async () => {
    // Arrange
    const { listeners, showNotification } = loadHandler();
    const { event, settled } = pushEvent({
      title: 'Valora',
      body: 'Um orçamento passou do limite',
      url: '/?alertas=1',
    });
    // Act
    listeners.get('push')?.(event);
    await settled();
    // Assert
    expect(showNotification).toHaveBeenCalledWith(
      'Valora',
      expect.objectContaining({
        body: 'Um orçamento passou do limite',
        icon: '/pwa-192x192.png',
        data: { url: '/?alertas=1' },
      }),
    );
  });

  it('should_show_a_generic_notification_when_the_payload_is_not_valid', async () => {
    // Arrange
    const { listeners, showNotification } = loadHandler();
    const { event, settled } = pushEvent(null);
    // Act
    listeners.get('push')?.(event);
    await settled();
    // Assert
    expect(showNotification).toHaveBeenCalledWith(
      'Valora',
      expect.objectContaining({ body: 'Alerta novo no Valora', data: { url: '/' } }),
    );
  });
});

describe('notificationclick', () => {
  it('should_open_a_new_window_at_the_destination_when_the_app_is_closed', async () => {
    // Arrange
    const { listeners, openWindow } = loadHandler([]);
    const { event, settled } = clickEvent('/transacoes/revisar');
    // Act
    listeners.get('notificationclick')?.(event);
    await settled();
    // Assert
    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/transacoes/revisar`);
  });

  it('should_navigate_the_open_window_when_the_app_is_already_open', async () => {
    // Arrange
    const appWindow = windowClient();
    const { listeners, openWindow } = loadHandler([appWindow]);
    const { event, settled } = clickEvent('/transacoes/revisar');
    // Act
    listeners.get('notificationclick')?.(event);
    await settled();
    // Assert
    expect(appWindow.navigate).toHaveBeenCalledWith(`${ORIGIN}/transacoes/revisar`);
    expect(appWindow.focus).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('should_close_the_notification_when_it_is_tapped', async () => {
    // Arrange
    const { listeners } = loadHandler([]);
    const { event, settled } = clickEvent('/');
    // Act
    listeners.get('notificationclick')?.(event);
    await settled();
    // Assert
    expect(event.notification.close).toHaveBeenCalled();
  });

  it('should_open_the_home_screen_when_the_destination_is_from_another_origin', async () => {
    // Arrange
    const { listeners, openWindow } = loadHandler([]);
    const { event, settled } = clickEvent('https://outro-site.exemplo/phishing');
    // Act
    listeners.get('notificationclick')?.(event);
    await settled();
    // Assert
    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
  });

  it('should_open_the_home_screen_when_the_notification_has_no_destination', async () => {
    // Arrange
    const { listeners, openWindow } = loadHandler([]);
    const { event, settled } = clickEvent(undefined);
    // Act
    listeners.get('notificationclick')?.(event);
    await settled();
    // Assert
    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
  });
});
