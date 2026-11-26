import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { NotificationsSection } from './notifications-section';

const ENDPOINT = 'https://push.exemplo.test/send/aparelho';
const PUBLIC_KEY = 'AQAB';
const IPHONE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1';
const NO_CONTENT = () => new Response(null, { status: 204 });
const KEY_ROUTE = { 'GET /api/v1/push/public-key': () => Response.json({ publicKey: PUBLIC_KEY }) };

interface BrowserOptions {
  readonly permission?: NotificationPermission;
  readonly requestedPermission?: NotificationPermission;
  readonly isSubscribed?: boolean;
}

function stubBrowserPush({
  permission = 'default',
  requestedPermission = 'granted',
  isSubscribed = false,
}: BrowserOptions = {}) {
  const subscription = {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'chave-p256dh', auth: 'chave-auth' } }),
    unsubscribe: vi.fn(async () => true),
  };
  let current: typeof subscription | null = isSubscribed ? subscription : null;
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => {
      current = subscription;
      return subscription;
    }),
  };
  // Como no navegador: depois de responder, a permissão guardada passa a ser a escolhida.
  const notification = { permission, requestPermission: vi.fn() };
  notification.requestPermission.mockImplementation(async () => {
    notification.permission = requestedPermission;
    return requestedPermission;
  });
  const { requestPermission } = notification;
  vi.stubGlobal('PushManager', {});
  vi.stubGlobal('Notification', notification);
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager }) },
  });
  return { subscription, pushManager, requestPermission };
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationsSection />
    </QueryClientProvider>,
  );
}

function calls(fetchMock: ReturnType<typeof stubRoutes>, method: string, path: string) {
  return fetchMock.mock.calls.filter(
    ([input, init]) =>
      new URL(String(input), 'http://localhost').pathname === path &&
      (init?.method ?? 'GET') === method,
  );
}

/** O corpo JSON do primeiro pedido com esse método e caminho. */
function sentBody(fetchMock: ReturnType<typeof stubRoutes>, method: string, path: string): unknown {
  const [request] = calls(fetchMock, method, path);
  return JSON.parse(String(request?.[1]?.body));
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.restoreAllMocks();
});

describe('seção Notificações', () => {
  it('should_hide_the_section_when_the_server_has_push_off', async () => {
    // Arrange
    stubBrowserPush();
    const fetchMock = stubRoutes({
      'GET /api/v1/push/public-key': () => errorResponse(404, 'PUSH_DISABLED'),
    });
    // Act
    renderSection();
    // Assert
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Notificações' })).toBeNull());
    expect(calls(fetchMock, 'GET', '/api/v1/push/public-key')).toHaveLength(1);
  });

  it('should_hide_the_section_when_the_browser_does_not_support_push', async () => {
    // Arrange
    const fetchMock = stubRoutes(KEY_ROUTE);
    // Act
    renderSection();
    // Assert
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Notificações' })).toBeNull());
    expect(calls(fetchMock, 'GET', '/api/v1/push/public-key')).toHaveLength(1);
  });

  it('should_explain_how_to_install_when_opened_on_an_iphone_outside_the_home_screen', async () => {
    // Arrange
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_USER_AGENT);
    stubRoutes(KEY_ROUTE);
    // Act
    renderSection();
    // Assert
    expect(
      await screen.findByText(/Instale o Valora na tela de início para receber notificações/),
    ).toBeInTheDocument();
  });

  it('should_offer_to_activate_when_this_device_is_not_subscribed', async () => {
    // Arrange
    stubBrowserPush();
    stubRoutes(KEY_ROUTE);
    // Act
    renderSection();
    // Assert
    expect(await screen.findByRole('button', { name: 'Ativar neste aparelho' })).toBeEnabled();
  });

  it('should_explain_how_to_unblock_when_the_permission_was_denied', async () => {
    // Arrange
    stubBrowserPush({ permission: 'denied' });
    stubRoutes(KEY_ROUTE);
    // Act
    renderSection();
    // Assert
    expect(await screen.findByText(/estão bloqueadas neste aparelho/)).toBeInTheDocument();
  });

  it('should_subscribe_and_register_in_the_api_when_activate_is_pressed', async () => {
    // Arrange
    const browser = stubBrowserPush();
    const fetchMock = stubRoutes({ ...KEY_ROUTE, 'POST /api/v1/push/subscriptions': NO_CONTENT });
    renderSection();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Ativar neste aparelho' }));
    // Assert
    expect(await screen.findByText('Ativado neste aparelho')).toBeInTheDocument();
    expect(browser.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(sentBody(fetchMock, 'POST', '/api/v1/push/subscriptions')).toEqual({
      endpoint: ENDPOINT,
      keys: { p256dh: 'chave-p256dh', auth: 'chave-auth' },
    });
  });

  it('should_ask_for_permission_in_the_press_and_stay_inactive_when_it_is_refused', async () => {
    // Arrange
    const browser = stubBrowserPush({ requestedPermission: 'denied' });
    stubRoutes(KEY_ROUTE);
    renderSection();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Ativar neste aparelho' }));
    // Assert
    expect(await screen.findByText(/estão bloqueadas neste aparelho/)).toBeInTheDocument();
    expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('should_show_an_error_and_undo_the_subscription_when_the_api_refuses_it', async () => {
    // Arrange
    const browser = stubBrowserPush();
    stubRoutes({
      ...KEY_ROUTE,
      'POST /api/v1/push/subscriptions': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    renderSection();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Ativar neste aparelho' }));
    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não deu para ativar as notificações',
    );
    expect(browser.subscription.unsubscribe).toHaveBeenCalled();
  });

  it('should_ask_the_api_to_send_a_test_when_send_test_is_pressed', async () => {
    // Arrange
    stubBrowserPush({ isSubscribed: true });
    const fetchMock = stubRoutes({ ...KEY_ROUTE, 'POST /api/v1/push/test': NO_CONTENT });
    renderSection();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar teste' }));
    // Assert
    expect(await screen.findByText(/Teste enviado/)).toBeInTheDocument();
    expect(calls(fetchMock, 'POST', '/api/v1/push/test')).toHaveLength(1);
  });

  it('should_remove_the_subscription_and_offer_activation_when_deactivate_is_pressed', async () => {
    // Arrange
    const browser = stubBrowserPush({ isSubscribed: true });
    const fetchMock = stubRoutes({ ...KEY_ROUTE, 'DELETE /api/v1/push/subscriptions': NO_CONTENT });
    renderSection();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }));
    // Assert
    expect(await screen.findByRole('button', { name: 'Ativar neste aparelho' })).toBeEnabled();
    expect(sentBody(fetchMock, 'DELETE', '/api/v1/push/subscriptions')).toEqual({
      endpoint: ENDPOINT,
    });
    expect(browser.subscription.unsubscribe).toHaveBeenCalled();
  });
});
