import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { HideValuesProvider } from '@/components/hide-values-provider';

import { errorResponse, stubRoutes } from '../../../test/helpers/stub-routes';
import { Component as AccountsPage } from './accounts-page';

const NUBANK_ID = '11111111-1111-4111-8111-111111111111';
const ITAU_ID = '22222222-2222-4222-8222-222222222222';

function connectionOf(id: string, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    institutionName: name,
    institutionLogoUrl: null,
    status: 'ok',
    statusDetail: null,
    lastSyncedAt: '2026-11-05T10:02:00.000Z',
    isConfigured: true,
    archivedAt: null,
    accounts: [],
    ...overrides,
  };
}

const NUBANK = connectionOf(NUBANK_ID, 'Nubank');

const CHECKING = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Conta corrente',
  type: 'checking',
  lastDigits: '1234',
  balanceCents: 300000,
  creditLimitCents: null,
  availableLimitCents: null,
  isHidden: false,
  connection: {
    id: NUBANK_ID,
    institutionName: 'Nubank',
    status: 'ok',
    statusDetail: null,
    lastSyncedAt: '2026-11-05T10:02:00.000Z',
  },
};

const TOTALS = { totalBalanceCents: 300000, openCreditCardBillsCents: 0, availableCreditCents: 0 };

const ARCHIVED_ITAU = connectionOf(ITAU_ID, 'Itaú', {
  archivedAt: '2026-11-08T12:00:00.000Z',
  lastSyncedAt: '2026-11-01T13:00:00.000Z',
  accounts: [
    {
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'Conta corrente',
      type: 'checking',
      lastDigits: '9999',
    },
    {
      id: '00000000-0000-4000-8000-0000000000a2',
      name: 'Cartão Ultravioleta',
      type: 'credit_card',
      lastDigits: '1111',
    },
  ],
});

interface PageStubs {
  accounts?: unknown[];
  active?: unknown[];
  archived?: unknown[];
}

function stubPage({ accounts = [CHECKING], active = [NUBANK], archived = [] }: PageStubs = {}) {
  return stubRoutes({
    'GET /api/v1/accounts': () => Response.json({ items: accounts, totals: TOTALS }),
    'GET /api/v1/connections': (url) =>
      Response.json({ items: url.searchParams.get('archived') === 'true' ? archived : active }),
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HideValuesProvider>
        <MemoryRouter>
          <AccountsPage />
        </MemoryRouter>
      </HideValuesProvider>
    </QueryClientProvider>,
  );
}

describe('Contas — remover o banco do Valora', () => {
  it('should_offer_remove_from_valora_on_a_healthy_bank', async () => {
    // Arrange
    stubPage();
    renderPage();
    // Act
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    // Assert
    expect(within(nubank).getByRole('button', { name: 'Remover do Valora' })).toBeVisible();
  });

  it('should_explain_that_the_bank_left_the_sync_list_when_it_is_not_configured', async () => {
    // Arrange
    stubPage({ active: [connectionOf(NUBANK_ID, 'Nubank', { isConfigured: false })] });
    renderPage();
    // Act
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    // Assert
    await waitFor(() => expect(nubank).toHaveTextContent('PLUGGY_ITEM_IDS'));
  });

  it('should_explain_that_the_bank_was_removed_from_meu_pluggy', async () => {
    // Arrange
    const removedAccount = {
      ...CHECKING,
      connection: { ...CHECKING.connection, status: 'item_not_found' },
    };
    stubPage({
      accounts: [removedAccount],
      active: [connectionOf(NUBANK_ID, 'Nubank', { status: 'item_not_found' })],
    });
    renderPage();
    // Act
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    // Assert
    expect(nubank).toHaveTextContent('Este banco foi removido do Meu Pluggy');
  });

  it('should_show_the_removed_status_badge_when_the_item_does_not_exist_anymore', async () => {
    // Arrange
    const removedAccount = {
      ...CHECKING,
      connection: { ...CHECKING.connection, status: 'item_not_found' },
    };
    stubPage({ accounts: [removedAccount] });
    renderPage();
    // Act
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    // Assert
    expect(within(nubank).getByText('Removido do Meu Pluggy')).toBeVisible();
  });

  it('should_archive_the_bank_when_the_removal_is_confirmed', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/accounts': () => Response.json({ items: [CHECKING], totals: TOTALS }),
      'GET /api/v1/connections': () => Response.json({ items: [NUBANK] }),
      [`PATCH /api/v1/connections/${NUBANK_ID}`]: () =>
        Response.json({ ...NUBANK, archivedAt: '2026-11-10T12:00:00.000Z' }),
    });
    renderPage();
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    await userEvent.click(within(nubank).getByRole('button', { name: 'Remover do Valora' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remover Nubank do Valora?' });
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remover do Valora' }));
    // Assert
    await waitFor(() =>
      expect(
        JSON.parse(
          String(fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')?.[1]?.body),
        ),
      ).toEqual({ isArchived: true }),
    );
  });

  it('should_not_change_anything_when_the_removal_is_cancelled', async () => {
    // Arrange
    const fetchMock = stubPage();
    renderPage();
    const nubank = await screen.findByRole('region', { name: 'Nubank' });
    await userEvent.click(within(nubank).getByRole('button', { name: 'Remover do Valora' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    // Assert
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toEqual([]);
  });
});

describe('Contas — seção Arquivados', () => {
  it('should_not_show_the_section_when_no_bank_is_archived', async () => {
    // Arrange
    stubPage({ archived: [] });
    renderPage();
    // Act
    await screen.findByRole('region', { name: 'Nubank' });
    // Assert
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Arquivados' })).not.toBeInTheDocument(),
    );
  });

  it('should_show_the_section_collapsed_with_the_number_of_archived_banks', async () => {
    // Arrange
    stubPage({ archived: [ARCHIVED_ITAU] });
    renderPage();
    // Act
    const toggle = await screen.findByRole('button', { name: /Arquivados \(1\)/ });
    // Assert
    expect({
      isExpanded: toggle.getAttribute('aria-expanded'),
      reactivate: screen.queryByRole('button', { name: 'Reativar' }),
    }).toEqual({ isExpanded: 'false', reactivate: null });
  });

  it('should_list_the_bank_with_its_accounts_and_last_sync_when_the_section_is_opened', async () => {
    // Arrange
    stubPage({ archived: [ARCHIVED_ITAU] });
    renderPage();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: /Arquivados \(1\)/ }));
    // Assert
    const section = screen.getByRole('region', { name: 'Arquivados' });
    expect(section).toHaveTextContent(
      /Itaú.*Reativar.*Conta corrente \(Conta corrente\), Cartão Ultravioleta \(Cartão de crédito\).*Última sincronização 01\/11/,
    );
  });

  it('should_reactivate_the_bank_when_reactivate_is_pressed', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/accounts': () => Response.json({ items: [CHECKING], totals: TOTALS }),
      'GET /api/v1/connections': (url) =>
        Response.json({
          items: url.searchParams.get('archived') === 'true' ? [ARCHIVED_ITAU] : [NUBANK],
        }),
      [`PATCH /api/v1/connections/${ITAU_ID}`]: () =>
        Response.json({ ...ARCHIVED_ITAU, archivedAt: null }),
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Arquivados \(1\)/ }));
    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Reativar' }));
    // Assert
    await waitFor(() =>
      expect(
        JSON.parse(
          String(fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')?.[1]?.body),
        ),
      ).toEqual({ isArchived: false }),
    );
  });

  it('should_show_the_archived_banks_even_when_no_bank_is_active', async () => {
    // Arrange
    stubPage({ accounts: [], active: [], archived: [ARCHIVED_ITAU] });
    renderPage();
    // Act
    const toggle = await screen.findByRole('button', { name: /Arquivados \(1\)/ });
    // Assert
    expect({
      toggle: toggle.getAttribute('aria-expanded'),
      emptyState: screen.getByText('Nenhum banco conectado'),
    }).toEqual({ toggle: 'false', emptyState: expect.anything() });
  });

  it('should_show_a_retry_when_the_archived_list_fails_without_breaking_the_screen', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/accounts': () => Response.json({ items: [CHECKING], totals: TOTALS }),
      'GET /api/v1/connections': (url) =>
        url.searchParams.get('archived') === 'true'
          ? errorResponse(500, 'INTERNAL_ERROR')
          : Response.json({ items: [NUBANK] }),
    });
    renderPage();
    // Act
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' });
    // Assert
    expect({ retry, bank: screen.getByRole('region', { name: 'Nubank' }) }).toEqual({
      retry: expect.anything(),
      bank: expect.anything(),
    });
  });

  it('should_show_a_loading_state_while_the_archived_banks_load', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/accounts': () => Response.json({ items: [CHECKING], totals: TOTALS }),
      'GET /api/v1/connections': (url) =>
        url.searchParams.get('archived') === 'true'
          ? new Promise<Response>(() => undefined)
          : Response.json({ items: [NUBANK] }),
    });
    // Act
    renderPage();
    // Assert
    expect(await screen.findByRole('status', { name: 'Carregando arquivados' })).toBeVisible();
  });
});
