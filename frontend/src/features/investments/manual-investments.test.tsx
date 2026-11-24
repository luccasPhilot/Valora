import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { netWorthRoute } from '../../../test/helpers/net-worth';
import { errorResponse, type RouteHandler, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as InvestmentsPage } from './investments-page';

const TODAY = new Date('2026-11-15T13:00:00Z');
const CDB_ID = '00000000-0000-4000-8000-000000000001';
const FUND_ID = '00000000-0000-4000-8000-000000000002';

function item(overrides: Record<string, unknown>) {
  return {
    id: CDB_ID,
    name: 'CDB Liquidez',
    subtype: 'CDB',
    balanceCents: 100_000,
    percent: 20,
    institutionName: 'Nubank',
    source: 'open_finance',
    balanceUpdatedOn: null,
    ...overrides,
  };
}

const MANUAL_FUND = item({
  id: FUND_ID,
  name: 'Fundo INCO',
  subtype: null,
  balanceCents: 2_500_000,
  percent: 80,
  institutionName: 'INCO',
  source: 'manual',
  balanceUpdatedOn: '2026-11-10',
});

const FIXED_INCOME = {
  type: 'FIXED_INCOME',
  totalCents: 100_000,
  percent: 20,
  items: [item({})],
};
const FUNDS = { type: 'MUTUAL_FUND', totalCents: 2_500_000, percent: 80, items: [MANUAL_FUND] };

function overview(groups: unknown[], closedCount = 0) {
  return () =>
    Response.json({
      totals: { totalCents: 2_600_000, positionsCount: groups.length, closedCount },
      groups,
    });
}

const SAVED_FUND = {
  id: FUND_ID,
  name: 'Fundo INCO',
  institutionName: 'INCO',
  type: 'MUTUAL_FUND',
  balanceCents: 2_500_000,
  source: 'manual',
  balanceUpdatedOn: '2026-11-15',
};

function stubInvestmentRoutes(routes: Record<string, RouteHandler>) {
  return stubRoutes({ ...netWorthRoute(), ...routes });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter>
          <HideValuesButton />
          <InvestmentsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

function bodyOf(fetchMock: ReturnType<typeof stubRoutes>, method: string): unknown {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === method);
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}

async function openEditPanel() {
  await userEvent.click(await screen.findByRole('button', { name: 'Editar Fundo INCO' }));
  return screen.findByRole('dialog');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('lista com posições manuais', () => {
  it('should_show_the_manual_badge_and_the_update_date_when_the_position_is_manual', async () => {
    // Arrange
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FIXED_INCOME, FUNDS]) });
    // Act
    renderPage();
    // Assert
    const funds = await screen.findByRole('region', { name: 'Fundos' });
    expect(within(funds).getByText('Manual')).toBeVisible();
    expect(within(funds).getByText('Atualizado em 10/11/2026')).toBeVisible();
  });

  it('should_say_desatualizado_in_text_when_the_last_update_was_more_than_30_days_ago', async () => {
    // Arrange
    const stale = { ...FUNDS, items: [{ ...MANUAL_FUND, balanceUpdatedOn: '2026-10-01' }] };
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([stale]) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Atualizado em 01/10/2026 · Desatualizado')).toBeVisible();
  });

  it('should_not_say_desatualizado_when_the_update_is_recent', async () => {
    // Arrange
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FUNDS]) });
    // Act
    renderPage();
    // Assert
    await screen.findByText('Atualizado em 10/11/2026');
    expect(screen.queryByText(/Desatualizado/)).toBeNull();
  });

  it('should_not_open_any_panel_when_the_position_comes_from_open_finance', async () => {
    // Arrange
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FIXED_INCOME, FUNDS]) });
    // Act
    renderPage();
    // Assert
    await screen.findByRole('region', { name: 'Renda fixa' });
    expect(screen.queryByRole('button', { name: 'Editar CDB Liquidez' })).toBeNull();
  });

  it('should_show_the_add_button_when_there_are_investments', async () => {
    // Arrange
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FIXED_INCOME]) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Adicionar investimento' })).toBeVisible();
  });

  it('should_offer_adding_and_seeing_accounts_when_there_are_no_investments', async () => {
    // Arrange
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([]) });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Adicionar investimento' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver contas' })).toBeVisible();
  });
});

describe('adicionar investimento', () => {
  it('should_send_the_typed_values_in_cents_when_the_form_is_valid', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FIXED_INCOME]),
      'POST /api/v1/investments': () => Response.json(SAVED_FUND, { status: 201 }),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar investimento' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.type(within(dialog).getByLabelText('Valor atual'), '2500000');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Fundo INCO');
    await userEvent.type(within(dialog).getByLabelText('Instituição'), 'INCO');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Fundos' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar investimento' }));
    // Assert
    await waitFor(() =>
      expect(bodyOf(fetchMock, 'POST')).toEqual({
        name: 'Fundo INCO',
        institutionName: 'INCO',
        type: 'MUTUAL_FUND',
        balanceCents: 2_500_000,
      }),
    );
  });

  it('should_close_the_panel_and_confirm_when_the_investment_is_saved', async () => {
    // Arrange
    stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FIXED_INCOME]),
      'POST /api/v1/investments': () => Response.json(SAVED_FUND, { status: 201 }),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar investimento' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Valor atual'), '100');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Fundo INCO');
    await userEvent.type(within(dialog).getByLabelText('Instituição'), 'INCO');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar investimento' }));
    // Assert
    expect(await screen.findByText('Fundo INCO adicionado')).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('should_show_the_field_errors_and_send_nothing_when_the_form_is_empty', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FIXED_INCOME]),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar investimento' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar investimento' }));
    // Assert
    expect(await within(dialog).findByText('Informe o nome do investimento')).toBeVisible();
    expect(within(dialog).getByText('Informe a instituição')).toBeVisible();
    expect(within(dialog).getByText('Informe um valor maior que zero')).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('should_describe_the_field_with_its_error_when_the_name_is_blank', async () => {
    // Arrange
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FIXED_INCOME]) });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar investimento' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar investimento' }));
    // Assert
    expect(await within(dialog).findByLabelText('Nome')).toHaveAccessibleDescription(
      'Informe o nome do investimento',
    );
  });

  it('should_keep_the_panel_open_with_what_was_typed_when_the_api_fails', async () => {
    // Arrange
    stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FIXED_INCOME]),
      'POST /api/v1/investments': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Adicionar investimento' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Valor atual'), '100');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Fundo INCO');
    await userEvent.type(within(dialog).getByLabelText('Instituição'), 'INCO');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar investimento' }));
    // Assert
    expect(await within(dialog).findByText(/Não foi possível salvar/)).toBeVisible();
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Fundo INCO');
  });
});

describe('editar investimento manual', () => {
  it('should_send_only_the_name_when_only_the_name_changed', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FUNDS]),
      [`PATCH /api/v1/investments/${FUND_ID}`]: () => Response.json(SAVED_FUND),
    });
    renderPage();
    const dialog = await (async () => {
      return openEditPanel();
    })();
    // Act
    await userEvent.type(within(dialog).getByLabelText('Nome'), ' Renda');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    // Assert
    await waitFor(() => expect(bodyOf(fetchMock, 'PATCH')).toEqual({ name: 'Fundo INCO Renda' }));
  });

  it('should_send_the_new_value_in_cents_when_the_value_is_updated', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FUNDS]),
      [`PATCH /api/v1/investments/${FUND_ID}`]: () => Response.json(SAVED_FUND),
    });
    renderPage();
    const dialog = await openEditPanel();
    const field = within(dialog).getByLabelText('Atualizar valor');
    // Act
    await userEvent.clear(field);
    await userEvent.type(field, '2600000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    // Assert
    await waitFor(() => expect(bodyOf(fetchMock, 'PATCH')).toEqual({ balanceCents: 2_600_000 }));
  });

  it('should_close_without_calling_the_api_when_nothing_changed', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FUNDS]) });
    renderPage();
    const dialog = await openEditPanel();
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('should_ask_for_confirmation_before_closing_the_position', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FUNDS]) });
    renderPage();
    const dialog = await openEditPanel();
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Encerrar posição' }));
    // Assert
    expect(await screen.findByRole('dialog', { name: /Encerrar Fundo INCO\?/ })).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('should_send_a_zero_value_when_the_closing_is_confirmed', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FUNDS]),
      [`PATCH /api/v1/investments/${FUND_ID}`]: () =>
        Response.json({ ...SAVED_FUND, balanceCents: 0 }),
    });
    renderPage();
    const dialog = await openEditPanel();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Encerrar posição' }));
    const confirmation = await screen.findByRole('dialog', { name: /Encerrar Fundo INCO\?/ });
    // Act
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Encerrar posição' }));
    // Assert
    await waitFor(() => expect(bodyOf(fetchMock, 'PATCH')).toEqual({ balanceCents: 0 }));
  });

  it('should_ask_to_keep_the_value_in_blank_when_values_are_hidden', async () => {
    // Arrange
    stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FUNDS]) });
    renderPage();
    await screen.findByRole('region', { name: 'Fundos' });
    await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }));
    // Act
    const dialog = await openEditPanel();
    // Assert
    expect(within(dialog).getByText(/Deixe em branco para manter/)).toBeVisible();
    expect(within(dialog).getByLabelText('Atualizar valor')).toHaveValue('');
  });
});

describe('excluir investimento manual', () => {
  it('should_ask_for_confirmation_and_warn_about_the_history_before_deleting', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({ 'GET /api/v1/investments': overview([FUNDS]) });
    renderPage();
    const dialog = await openEditPanel();
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    // Assert
    expect(await screen.findByText(/histórico desta posição também sai da evolução/)).toBeVisible();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('should_delete_the_position_when_the_user_confirms', async () => {
    // Arrange
    const fetchMock = stubInvestmentRoutes({
      'GET /api/v1/investments': overview([FUNDS]),
      [`DELETE /api/v1/investments/${FUND_ID}`]: () => new Response(null, { status: 204 }),
    });
    renderPage();
    const dialog = await openEditPanel();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    const confirmation = await screen.findByRole('dialog', { name: /Excluir Fundo INCO\?/ });
    // Act
    await userEvent.click(within(confirmation).getByRole('button', { name: 'Excluir' }));
    // Assert
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true),
    );
  });
});
