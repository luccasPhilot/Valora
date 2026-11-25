import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { HideValuesButton } from '@/components/hide-values-button';
import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as DataHealthPage } from './data-health-page';

const ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const FAR_CONSENT = {
  connectionId: '11111111-1111-4111-8111-111111111111',
  institutionName: 'Itaú',
  expiresAt: '2027-11-04T19:35:15.132Z',
  daysLeft: 345,
};
const DIVERGENCE = {
  accountId: ACCOUNT_ID,
  accountName: 'Conta corrente',
  from: '2026-11-03',
  to: '2026-11-04',
  differenceCents: -12000,
};
const STALE_CARD = {
  accountId: '33333333-3333-4333-8333-333333333333',
  accountName: 'Cartão Azul',
  lastTransactionDate: '2026-11-10',
  daysWithoutTransactions: 14,
};

function syncRun(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    trigger: 'schedule',
    status: 'success',
    startedAt: '2026-11-04T10:00:00.000Z',
    finishedAt: '2026-11-04T10:02:00.000Z',
    stats: {
      accounts: 4,
      transactionsInserted: 12,
      transactionsUpdated: 3,
      transactionsRemoved: 0,
      investments: 2,
    },
    errorMessage: null,
    ...overrides,
  };
}

function dataHealth(overrides: Record<string, unknown> = {}) {
  return () =>
    Response.json({ consents: [FAR_CONSENT], divergences: [], staleAccounts: [], ...overrides });
}

function history(runs: unknown[] = [syncRun(1)]) {
  return () =>
    Response.json({ items: runs, pagination: { page: 1, limit: 30, total: runs.length } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter>
          <HideValuesButton />
          <DataHealthPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe('DataHealthPage', () => {
  it('should_show_tudo_certo_in_the_first_three_sections_when_nothing_needs_checking', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/data-health': dataHealth(), 'GET /api/v1/sync-runs': history() });
    // Act
    renderPage();
    // Assert
    await screen.findByText('Tudo certo com os dados');
    const sections = ['Consentimentos', 'Conciliação', 'Contas paradas'].map((name) =>
      within(screen.getByRole('region', { name })).queryByText('Tudo certo'),
    );
    expect(sections.every((section) => section !== null)).toBe(true);
  });

  it('should_link_the_divergence_to_transactions_of_the_account_and_period', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': dataHealth({ divergences: [DIVERGENCE] }),
      'GET /api/v1/sync-runs': history(),
    });
    // Act
    renderPage();
    // Assert
    const link = await screen.findByRole('link', { name: /Possível transação faltando/ });
    expect(link).toHaveAttribute(
      'href',
      `/transacoes?period=custom&from=2026-11-03&to=2026-11-04&account=${ACCOUNT_ID}`,
    );
  });

  it('should_show_the_difference_of_the_divergence', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': dataHealth({ divergences: [DIVERGENCE] }),
      'GET /api/v1/sync-runs': history(),
    });
    // Act
    renderPage();
    // Assert
    const link = await screen.findByRole('link', { name: /Possível transação faltando/ });
    expect(link).toHaveTextContent('− R$ 120,00');
  });

  it('should_hide_the_difference_when_values_are_hidden', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': dataHealth({ divergences: [DIVERGENCE] }),
      'GET /api/v1/sync-runs': history(),
    });
    renderPage();
    const link = await screen.findByRole('link', { name: /Possível transação faltando/ });
    // Act
    await userEvent.click(screen.getByRole('button', { name: /ocultar valores/i }));
    // Assert
    expect(link).toHaveTextContent('R$ ••••');
  });

  it('should_show_the_stale_card_with_its_days_without_transactions', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': dataHealth({ staleAccounts: [STALE_CARD] }),
      'GET /api/v1/sync-runs': history(),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Sem transações há 14 dias')).toBeInTheDocument();
  });

  it('should_mark_the_consent_that_expires_within_30_days', async () => {
    // Arrange
    const expiring = { ...FAR_CONSENT, daysLeft: 7 };
    stubRoutes({
      'GET /api/v1/data-health': dataHealth({ consents: [expiring] }),
      'GET /api/v1/sync-runs': history(),
    });
    // Act
    renderPage();
    // Assert
    const consents = await screen.findByRole('region', { name: 'Consentimentos' });
    expect(within(consents).getByText('Renovar')).toBeInTheDocument();
  });

  it('should_describe_the_sync_result_with_text_and_not_only_color', async () => {
    // Arrange
    const partial = syncRun(1, {
      status: 'partial',
      errorMessage: 'Um banco não sincronizou.',
    });
    stubRoutes({
      'GET /api/v1/data-health': dataHealth(),
      'GET /api/v1/sync-runs': history([partial]),
    });
    // Act
    renderPage();
    // Assert
    const syncs = await screen.findByRole('region', { name: 'Sincronizações' });
    expect(await within(syncs).findByText('Parcial')).toBeInTheDocument();
  });

  it('should_show_how_the_run_started_and_its_counts', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/data-health': dataHealth(), 'GET /api/v1/sync-runs': history() });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Agendada · 12 novas, 3 atualizadas')).toBeInTheDocument();
  });

  it('should_show_the_first_five_runs_and_a_button_for_the_rest', async () => {
    // Arrange
    const runs = Array.from({ length: 8 }, (_, index) => syncRun(index + 1));
    stubRoutes({
      'GET /api/v1/data-health': dataHealth(),
      'GET /api/v1/sync-runs': history(runs),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: /Mostrar mais 3/ })).toBeInTheDocument();
  });

  it('should_keep_the_other_sections_when_the_history_fails', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': dataHealth(),
      'GET /api/v1/sync-runs': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Não foi possível carregar o histórico.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Consentimentos' })).toBeInTheDocument();
  });

  it('should_show_the_loading_skeleton_while_the_data_arrives', () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': () => new Promise<Response>(() => undefined),
      'GET /api/v1/sync-runs': history(),
    });
    // Act
    renderPage();
    // Assert
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('should_offer_to_try_again_when_the_data_fails_to_load', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': () => errorResponse(500, 'INTERNAL_ERROR'),
      'GET /api/v1/sync-runs': history(),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('should_show_the_empty_state_when_there_is_no_bank', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/data-health': dataHealth({ consents: [] }),
      'GET /api/v1/sync-runs': history(),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByText('Nenhum banco conectado')).toBeInTheDocument();
  });
});
