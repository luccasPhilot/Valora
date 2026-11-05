import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as AccountsPage } from './accounts-page';

const NUBANK = {
  id: '11111111-1111-4111-8111-111111111111',
  institutionName: 'Nubank',
  status: 'ok',
  statusDetail: null,
  lastSyncedAt: '2026-11-05T10:02:00.000Z',
};
const ITAU_EXPIRED = {
  id: '22222222-2222-4222-8222-222222222222',
  institutionName: 'Itaú',
  status: 'consent_expired',
  statusDetail: null,
  lastSyncedAt: '2026-11-01T13:00:00.000Z',
};

function account(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    name: 'Conta corrente',
    type: 'checking',
    lastDigits: '1234',
    balanceCents: 300000,
    creditLimitCents: null,
    availableLimitCents: null,
    isHidden: false,
    connection: NUBANK,
    ...overrides,
  };
}

const CHECKING = account(1);
const SAVINGS = account(2, {
  name: 'Poupança',
  type: 'savings',
  lastDigits: '5678',
  balanceCents: 185032,
});
const CREDIT_CARD = account(3, {
  name: 'Cartão Ultravioleta',
  type: 'credit_card',
  lastDigits: '9012',
  balanceCents: 90000,
  creditLimitCents: 500000,
  availableLimitCents: 410000,
});
const CASH = account(4, {
  name: 'Dinheiro',
  type: 'cash',
  lastDigits: null,
  balanceCents: null,
  connection: null,
});

const TOTALS = {
  totalBalanceCents: 485032,
  openCreditCardBillsCents: 90000,
  availableCreditCents: 410000,
};

function overview(items: unknown[], totals: Record<string, number> = TOTALS) {
  return () => Response.json({ items, totals });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter>
          <HideValuesButton />
          <AccountsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe('AccountsPage summary', () => {
  it('should_show_the_total_balance_and_the_open_bills_when_there_are_accounts', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CHECKING, SAVINGS, CREDIT_CARD, CASH]) });
    // Act
    renderPage();
    // Assert
    const totalBalance = await screen.findByRole('region', { name: 'Saldo total' });
    expect(totalBalance).toHaveTextContent('R$ 4.850,32');
    expect(screen.getByRole('region', { name: 'Faturas em aberto' })).toHaveTextContent(
      'R$ 900,00',
    );
  });

  it('should_show_the_total_in_destructive_color_when_it_is_negative', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/accounts': overview([CHECKING], {
        ...TOTALS,
        totalBalanceCents: -20000,
      }),
    });
    // Act
    renderPage();
    // Assert
    const balance = await screen.findByText('−R$ 200,00');
    expect(balance.closest('p')).toHaveClass('text-destructive');
  });
});

describe('AccountsPage institutions', () => {
  it('should_group_accounts_under_their_bank_with_name_digits_and_balance', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CHECKING, SAVINGS]) });
    // Act
    renderPage();
    // Assert
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    expect(within(nubank).getByText('Conta corrente · final 1234')).toBeVisible();
    expect(within(nubank).getByText('R$ 1.850,32')).toBeVisible();
  });

  it('should_show_the_current_bill_and_the_available_limit_when_the_account_is_a_card', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CREDIT_CARD]) });
    // Act
    renderPage();
    // Assert
    const card = await screen.findByRole('button', { name: /Cartão Ultravioleta/ });
    expect(card).toHaveTextContent('Fatura atual');
    expect(card).toHaveTextContent('R$ 900,00');
    expect(card).toHaveTextContent('Limite disponível R$ 4.100,00');
  });

  it('should_show_a_negative_balance_in_destructive_color_when_the_account_is_overdrawn', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([account(1, { balanceCents: -20000 })]) });
    // Act
    renderPage();
    // Assert
    const balance = await screen.findByText('−R$ 200,00', { selector: 'span' });
    expect(balance.closest('span.font-display')).toHaveClass('text-destructive');
  });

  it('should_leave_the_cash_account_out_of_the_screen_when_it_exists', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CHECKING, CASH]) });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Nubank' });
    expect(screen.queryByText('Dinheiro')).not.toBeInTheDocument();
  });

  it('should_mark_the_account_as_out_of_the_totals_when_it_is_hidden', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/accounts': overview([account(2, { name: 'Poupança', isHidden: true })]),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Fora dos totais')).toBeVisible();
  });

  it('should_show_the_status_badge_and_the_last_sync_of_the_bank', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CHECKING]) });
    // Act
    renderPage();
    // Assert
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    expect(nubank).toHaveTextContent('Conectado');
    expect(nubank).toHaveTextContent(/Sincronizado .+, \d{2}:\d{2}/);
  });
});

describe('AccountsPage connection problems', () => {
  it('should_explain_how_to_reconnect_when_the_consent_expired', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/accounts': overview([account(1, { connection: ITAU_EXPIRED })]),
    });
    // Act
    renderPage();
    // Assert
    const itau = await screen.findByRole('region', { name: 'Itaú' });
    expect(itau).toHaveTextContent('Consentimento expirado');
    expect(within(itau).getByRole('link', { name: /Meu Pluggy/ })).toHaveAttribute(
      'href',
      'https://meu.pluggy.ai',
    );
  });

  it('should_not_explain_reconnection_when_the_connection_is_ok', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CHECKING]) });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Nubank' });
    expect(screen.queryByText('Como reconectar')).not.toBeInTheDocument();
  });
});

describe('AccountsPage hide from totals', () => {
  it('should_hide_the_account_and_confirm_when_the_hide_option_is_pressed', async () => {
    // Arrange
    let isHidden = false;
    const fetchMock = stubRoutes({
      'GET /api/v1/accounts': () =>
        Response.json({ items: [{ ...SAVINGS, isHidden }], totals: TOTALS }),
      [`PATCH /api/v1/accounts/${SAVINGS.id}`]: () => {
        isHidden = true;
        return Response.json({ ...SAVINGS, isHidden });
      },
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Poupança/ }));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Ocultar dos totais' }));
    // Assert
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch?.[1]?.body).toBe(JSON.stringify({ isHidden: true }));
    expect(await screen.findByRole('status')).toHaveTextContent('Poupança saiu dos totais');
  });

  it('should_keep_the_hidden_account_in_the_list_with_the_marker_after_hiding_it', async () => {
    // Arrange
    let isHidden = false;
    stubRoutes({
      'GET /api/v1/accounts': () =>
        Response.json({ items: [{ ...SAVINGS, isHidden }], totals: TOTALS }),
      [`PATCH /api/v1/accounts/${SAVINGS.id}`]: () => {
        isHidden = true;
        return Response.json({ ...SAVINGS, isHidden });
      },
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Poupança/ }));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Ocultar dos totais' }));
    // Assert
    expect(await screen.findByText('Fora dos totais')).toBeVisible();
  });

  it('should_offer_to_show_the_account_again_when_it_is_already_hidden', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([{ ...SAVINGS, isHidden: true }]) });
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: /Poupança/ }));
    // Assert
    expect(await screen.findByRole('button', { name: 'Mostrar nos totais' })).toBeVisible();
  });

  it('should_warn_when_the_api_refuses_the_change', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/accounts': overview([SAVINGS]),
      [`PATCH /api/v1/accounts/${SAVINGS.id}`]: () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Poupança/ }));
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Ocultar dos totais' }));
    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível atualizar a conta',
    );
  });
});

describe('AccountsPage hidden values', () => {
  it('should_mask_balances_bills_and_limits_when_hide_values_is_on', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CHECKING, CREDIT_CARD]) });
    renderPage();
    await screen.findByRole('region', { name: 'Nubank' });
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    // Assert
    expect(document.body.textContent).not.toMatch(/\d\.\d{3},\d{2}|\d,\d{2}/);
    expect(screen.getByRole('region', { name: 'Saldo total' })).toHaveTextContent('R$ ••••');
  });
});

describe('AccountsPage states', () => {
  it('should_show_a_skeleton_while_the_accounts_load', () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': () => new Promise<Response>(() => undefined) as never });
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeVisible();
  });

  it('should_explain_how_to_connect_a_bank_when_there_is_no_connection', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/accounts': overview([CASH], { ...TOTALS, totalBalanceCents: 0 }) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Nenhum banco conectado')).toBeVisible();
    expect(screen.getByText(/PLUGGY_ITEM_IDS/)).toBeVisible();
  });

  it('should_show_an_error_and_retry_when_the_api_fails', async () => {
    // Arrange
    let shouldFail = true;
    stubRoutes({
      'GET /api/v1/accounts': () =>
        shouldFail ? errorResponse(500, 'INTERNAL_ERROR') : overview([CHECKING])(),
    });
    renderPage();
    await screen.findByRole('alert');
    // Act
    shouldFail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    // Assert
    await waitFor(() => expect(screen.getByRole('region', { name: 'Nubank' })).toBeVisible());
  });
});
