import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { stubViewport } from '../../../test/helpers/match-media';
import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { AlertsBell } from './alerts-bell';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const BUDGET_ALERT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONNECTION_ALERT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GENERIC_ALERT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function alert(overrides: Record<string, unknown> = {}) {
  return {
    id: BUDGET_ALERT_ID,
    type: 'budget_warning',
    message: 'Mercado chegou a 80% do orçamento de novembro',
    createdAt: new Date().toISOString(),
    readAt: null,
    target: { screen: 'budgets', month: '2026-11', categoryId: CATEGORY_ID },
    ...overrides,
  };
}

const CONNECTION_ALERT = alert({
  id: CONNECTION_ALERT_ID,
  type: 'connection_error',
  message: 'Banco Azul: O acesso a este banco precisa ser refeito no Meu Pluggy.',
  target: { screen: 'accounts' },
});

const GENERIC_ALERT = alert({
  id: GENERIC_ALERT_ID,
  type: 'some_future_type',
  message: 'Algo novo aconteceu',
  target: null,
});

const DUPLICATE_ALERT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SUBSCRIPTION_ALERT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const DUPLICATE_ALERT = alert({
  id: DUPLICATE_ALERT_ID,
  type: 'duplicate_charge',
  message: 'Possível cobrança duplicada: Loja Exemplo',
  target: {
    screen: 'transactions',
    from: '2026-11-09',
    to: '2026-11-09',
    search: 'LOJA EXEMPLO',
  },
});

const SUBSCRIPTION_ALERT = alert({
  id: SUBSCRIPTION_ALERT_ID,
  type: 'subscription_detected',
  message: 'Assinatura detectada: Streaming Exemplo',
  target: {
    screen: 'transactions',
    from: '2026-10-05',
    to: '2026-10-05',
    search: 'STREAMING EXEMPLO',
  },
});

function alertList(items: ReturnType<typeof alert>[], unreadCount?: number) {
  return () =>
    Response.json({
      items,
      unreadCount: unreadCount ?? items.filter((item) => item.readAt === null).length,
      pagination: { page: 1, limit: 50, total: items.length },
    });
}

const NO_CONTENT = () => new Response(null, { status: 204 });

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <AlertsBell />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openPanel() {
  await userEvent.click(await screen.findByRole('button', { name: /^Alertas/ }));
}

function postedPaths(fetchMock: ReturnType<typeof stubRoutes>): string[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([input]) => new URL(String(input), 'http://localhost').pathname);
}

describe('contador do sino', () => {
  it('should_show_9_plus_and_the_real_count_in_the_label_when_there_are_12_unread_alerts', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([alert()], 12) });
    // Act
    renderBell();
    // Assert
    const bell = await screen.findByRole('button', { name: 'Alertas, 12 não lidos' });
    expect(bell).toHaveTextContent('9+');
  });

  it('should_show_the_exact_number_when_there_are_3_unread_alerts', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([alert()], 3) });
    // Act
    renderBell();
    // Assert
    expect(await screen.findByRole('button', { name: 'Alertas, 3 não lidos' })).toHaveTextContent(
      '3',
    );
  });

  it('should_show_no_counter_when_there_are_no_alerts', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([]) });
    // Act
    renderBell();
    // Assert
    const bell = await screen.findByRole('button', { name: 'Alertas' });
    expect(bell).toHaveTextContent('');
  });
});

describe('painel de alertas', () => {
  it('should_show_icon_label_and_message_per_type_when_the_panel_is_opened', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([alert(), CONNECTION_ALERT]) });
    renderBell();
    // Act
    await openPanel();
    // Assert
    const panel = await screen.findByRole('dialog', { name: 'Alertas' });
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('Orçamento em 80%'),
      expect.stringContaining('Banco sem sincronizar'),
    ]);
  });

  it('should_show_the_message_of_each_alert_when_the_panel_is_opened', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([alert()]) });
    renderBell();
    // Act
    await openPanel();
    // Assert
    expect(await screen.findByText('Mercado chegou a 80% do orçamento de novembro')).toBeVisible();
  });

  it('should_show_a_generic_item_without_action_when_the_type_is_unknown', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([GENERIC_ALERT]) });
    renderBell();
    // Act
    await openPanel();
    // Assert
    const item = await screen.findByRole('listitem');
    expect({
      label: within(item).getByText('Alerta'),
      message: within(item).getByText('Algo novo aconteceu'),
      hasLink: within(item).queryByRole('link'),
    }).toEqual({
      label: expect.anything(),
      message: expect.anything(),
      hasLink: null,
    });
  });

  it('should_show_label_and_message_of_the_pattern_alerts_when_the_panel_is_opened', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([DUPLICATE_ALERT, SUBSCRIPTION_ALERT]) });
    renderBell();
    // Act
    await openPanel();
    // Assert
    const panel = await screen.findByRole('dialog', { name: 'Alertas' });
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringMatching(/Cobrança duplicada.*Possível cobrança duplicada: Loja Exemplo/),
      expect.stringMatching(/Assinatura.*Assinatura detectada: Streaming Exemplo/),
    ]);
  });

  it('should_show_the_empty_state_when_there_are_no_alerts', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': alertList([]) });
    renderBell();
    // Act
    await openPanel();
    // Assert
    expect(await screen.findByText('Nenhum alerta')).toBeVisible();
  });

  it('should_show_the_error_state_with_retry_when_the_alerts_fail_to_load', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': () => errorResponse(500, 'INTERNAL_ERROR') });
    renderBell();
    // Act
    await openPanel();
    // Assert
    const alertRegion = await screen.findByRole('alert');
    expect(within(alertRegion).getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
  });

  it('should_not_show_technical_details_when_the_alerts_fail_to_load', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/alerts': () => errorResponse(500, 'INTERNAL_ERROR') });
    renderBell();
    // Act
    await openPanel();
    // Assert
    expect(await screen.findByRole('alert')).not.toHaveTextContent('INTERNAL_ERROR');
  });
});

describe('abrir, dispensar e ler todos', () => {
  it('should_mark_the_alert_as_read_and_go_to_the_budget_month_when_see_budget_is_pressed', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/alerts': alertList([alert()]),
      [`POST /api/v1/alerts/${BUDGET_ALERT_ID}/read`]: NO_CONTENT,
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('link', { name: 'Ver orçamento' }));
    // Assert
    await waitFor(() =>
      expect(postedPaths(fetchMock)).toEqual([`/api/v1/alerts/${BUDGET_ALERT_ID}/read`]),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/orcamentos?month=2026-11');
  });

  it('should_mark_as_read_and_open_the_transactions_of_the_day_when_see_transactions_is_pressed', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/alerts': alertList([DUPLICATE_ALERT]),
      [`POST /api/v1/alerts/${DUPLICATE_ALERT_ID}/read`]: NO_CONTENT,
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('link', { name: 'Ver transações' }));
    // Assert
    await waitFor(() =>
      expect(postedPaths(fetchMock)).toEqual([`/api/v1/alerts/${DUPLICATE_ALERT_ID}/read`]),
    );
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/transacoes?period=custom&from=2026-11-09&to=2026-11-09&search=LOJA+EXEMPLO',
    );
  });

  it('should_go_to_accounts_when_see_accounts_is_pressed_on_a_connection_alert', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/alerts': alertList([CONNECTION_ALERT]),
      [`POST /api/v1/alerts/${CONNECTION_ALERT_ID}/read`]: NO_CONTENT,
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('link', { name: 'Ver contas' }));
    // Assert
    expect(screen.getByTestId('location')).toHaveTextContent('/contas');
  });

  it('should_close_the_panel_when_an_alert_is_opened', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/alerts': alertList([alert()]),
      [`POST /api/v1/alerts/${BUDGET_ALERT_ID}/read`]: NO_CONTENT,
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('link', { name: 'Ver orçamento' }));
    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('should_not_call_read_when_opening_an_alert_that_was_already_read', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/alerts': alertList([alert({ readAt: new Date().toISOString() })]),
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('link', { name: 'Ver orçamento' }));
    // Assert
    expect(postedPaths(fetchMock)).toEqual([]);
  });

  it('should_mark_as_read_when_mark_as_read_is_pressed_on_an_alert_without_target', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/alerts': alertList([GENERIC_ALERT]),
      [`POST /api/v1/alerts/${GENERIC_ALERT_ID}/read`]: NO_CONTENT,
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como lido' }));
    // Assert
    await waitFor(() =>
      expect(postedPaths(fetchMock)).toEqual([`/api/v1/alerts/${GENERIC_ALERT_ID}/read`]),
    );
  });

  it('should_dismiss_the_alert_when_dismiss_is_pressed', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/alerts': alertList([alert()]),
      [`POST /api/v1/alerts/${BUDGET_ALERT_ID}/dismiss`]: NO_CONTENT,
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Dispensar' }));
    // Assert
    await waitFor(() =>
      expect(postedPaths(fetchMock)).toEqual([`/api/v1/alerts/${BUDGET_ALERT_ID}/dismiss`]),
    );
  });

  it('should_mark_all_as_read_when_mark_all_is_pressed', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/alerts': alertList([alert(), CONNECTION_ALERT]),
      'POST /api/v1/alerts/read-all': NO_CONTENT,
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar todos como lidos' }));
    // Assert
    await waitFor(() => expect(postedPaths(fetchMock)).toEqual(['/api/v1/alerts/read-all']));
  });

  it('should_disable_mark_all_when_there_are_no_unread_alerts', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/alerts': alertList([alert({ readAt: new Date().toISOString() })]),
    });
    renderBell();
    // Act
    await openPanel();
    // Assert
    expect(await screen.findByRole('button', { name: 'Marcar todos como lidos' })).toBeDisabled();
  });

  it('should_tell_the_user_when_dismissing_fails', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/alerts': alertList([alert()]),
      [`POST /api/v1/alerts/${BUDGET_ALERT_ID}/dismiss`]: () =>
        errorResponse(500, 'INTERNAL_ERROR'),
    });
    renderBell();
    await openPanel();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Dispensar' }));
    // Assert
    expect(
      await screen.findByText('Não foi possível atualizar o alerta. Tente de novo.'),
    ).toBeVisible();
  });
});

describe('no celular', () => {
  it('should_open_the_alerts_as_a_bottom_sheet_when_the_viewport_is_390px', async () => {
    // Arrange
    stubViewport({ viewportWidth: 390 });
    stubRoutes({ 'GET /api/v1/alerts': alertList([alert()]) });
    renderBell();
    // Act
    await openPanel();
    // Assert
    const sheet = await screen.findByRole('dialog', { name: 'Alertas' });
    expect(sheet).toHaveAttribute('data-slot', 'sheet-content');
  });
});
