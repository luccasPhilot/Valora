import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { stubRoutes } from '../../test/helpers/stub-routes';
import { ConnectionAlert } from './connection-alert';

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    institutionName: 'Nubank',
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

const EXPIRED_ITAU = connection({
  id: '33333333-3333-4333-8333-333333333333',
  institutionName: 'Itaú',
  status: 'consent_expired',
  lastSyncedAt: '2026-11-01T13:00:00.000Z',
});

function renderAlert() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConnectionAlert />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('ConnectionAlert', () => {
  it('should_name_the_bank_and_the_last_good_sync_when_consent_expired', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/connections': () => Response.json({ items: [connection(), EXPIRED_ITAU] }),
    });
    // Act
    renderAlert();
    // Assert
    expect(
      await screen.findByRole('link', { name: 'Itaú não sincroniza desde 01/11' }),
    ).toBeVisible();
  });

  it('should_open_the_accounts_screen_when_the_alert_is_pressed', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/connections': () => Response.json({ items: [EXPIRED_ITAU] }) });
    // Act
    renderAlert();
    // Assert
    expect(await screen.findByRole('link')).toHaveAttribute('href', '/contas');
  });

  it('should_alert_for_a_connection_in_error_when_it_never_synced', async () => {
    // Arrange
    const neverSynced = connection({ status: 'error', lastSyncedAt: null });
    stubRoutes({ 'GET /api/v1/connections': () => Response.json({ items: [neverSynced] }) });
    // Act
    renderAlert();
    // Assert
    expect(await screen.findByRole('link', { name: 'Nubank ainda não sincronizou' })).toBeVisible();
  });

  it('should_show_one_alert_per_bank_when_two_connections_have_problems', async () => {
    // Arrange
    const brokenNubank = connection({ status: 'error' });
    stubRoutes({
      'GET /api/v1/connections': () => Response.json({ items: [brokenNubank, EXPIRED_ITAU] }),
    });
    // Act
    renderAlert();
    // Assert
    expect(await screen.findAllByRole('link')).toHaveLength(2);
  });

  it('should_show_nothing_when_every_connection_is_ok', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/connections': () => Response.json({ items: [connection()] }),
    });
    // Act
    renderAlert();
    // Assert
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should_remove_the_alert_when_the_connection_is_back_to_ok', async () => {
    // Arrange
    let isFixed = false;
    stubRoutes({
      'GET /api/v1/connections': () =>
        Response.json({ items: [isFixed ? connection({ id: EXPIRED_ITAU.id }) : EXPIRED_ITAU] }),
    });
    const queryClient = renderAlert();
    await screen.findByRole('link');
    // Act
    isFixed = true;
    await queryClient.invalidateQueries();
    // Assert
    await waitFor(() => expect(screen.queryByRole('link')).not.toBeInTheDocument());
  });
});

const NOT_IN_LIST_NUBANK = connection({ isConfigured: false });
const REMOVED_NUBANK = connection({
  status: 'item_not_found',
  statusDetail: 'Este banco foi removido do Meu Pluggy. Remova-o do Valora.',
});

describe('ConnectionAlert — banco removido ou fora da lista', () => {
  it('should_say_the_bank_left_the_sync_list_and_offer_to_remove_it', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/connections': () => Response.json({ items: [NOT_IN_LIST_NUBANK] }) });
    // Act
    renderAlert();
    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nubank saiu da lista de sincronização. Não sincroniza desde 05/11.Remover do Valora',
    );
  });

  it('should_say_the_bank_was_removed_from_meu_pluggy_and_offer_to_remove_it', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/connections': () => Response.json({ items: [REMOVED_NUBANK] }) });
    // Act
    renderAlert();
    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nubank foi removido do Meu Pluggy. Não sincroniza desde 05/11.Remover do Valora',
    );
  });

  it('should_prefer_the_removed_from_meu_pluggy_cause_when_both_apply', async () => {
    // Arrange
    const both = connection({ status: 'item_not_found', isConfigured: false });
    stubRoutes({ 'GET /api/v1/connections': () => Response.json({ items: [both] }) });
    // Act
    renderAlert();
    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent('foi removido do Meu Pluggy');
  });

  it('should_keep_the_remove_button_outside_any_link', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/connections': () => Response.json({ items: [REMOVED_NUBANK] }) });
    renderAlert();
    // Act
    const button = await screen.findByRole('button', { name: 'Remover do Valora' });
    // Assert
    expect({ insideLink: button.closest('a'), links: screen.queryAllByRole('link') }).toEqual({
      insideLink: null,
      links: [],
    });
  });

  it('should_not_change_anything_when_the_confirmation_is_cancelled', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/connections': () => Response.json({ items: [REMOVED_NUBANK] }),
    });
    renderAlert();
    await userEvent.click(await screen.findByRole('button', { name: 'Remover do Valora' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    // Assert
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toEqual([]);
  });

  it('should_explain_what_happens_in_the_confirmation', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/connections': () => Response.json({ items: [REMOVED_NUBANK] }) });
    renderAlert();
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Remover do Valora' }));
    // Assert
    const dialog = await screen.findByRole('dialog', { name: 'Remover Nubank do Valora?' });
    expect(dialog).toHaveTextContent(
      'O histórico fica guardado e você pode reativá-lo em Arquivados.',
    );
  });

  it('should_archive_the_bank_and_drop_the_banner_when_the_removal_is_confirmed', async () => {
    // Arrange
    let isArchived = false;
    const fetchMock = stubRoutes({
      'GET /api/v1/connections': () => Response.json({ items: isArchived ? [] : [REMOVED_NUBANK] }),
      [`PATCH /api/v1/connections/${REMOVED_NUBANK.id}`]: () => {
        isArchived = true;
        return Response.json({ ...REMOVED_NUBANK, archivedAt: '2026-11-10T12:00:00.000Z' });
      },
    });
    renderAlert();
    await userEvent.click(await screen.findByRole('button', { name: 'Remover do Valora' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remover do Valora' }));
    // Assert
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ isArchived: true });
  });

  it('should_show_an_error_and_keep_the_banner_when_the_removal_fails', async () => {
    // Arrange
    stubRoutes({
      'GET /api/v1/connections': () => Response.json({ items: [REMOVED_NUBANK] }),
      [`PATCH /api/v1/connections/${REMOVED_NUBANK.id}`]: () =>
        Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'x', details: [] } },
          { status: 500 },
        ),
    });
    renderAlert();
    await userEvent.click(await screen.findByRole('button', { name: 'Remover do Valora' }));
    const dialog = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remover do Valora' }));
    // Assert
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível remover o banco. Tente de novo.',
    );
  });

  it('should_show_nothing_when_the_bank_is_ok_and_in_the_sync_list', async () => {
    // Arrange
    const fetchMock = stubRoutes({
      'GET /api/v1/connections': () =>
        Response.json({ items: [connection({ isConfigured: true })] }),
    });
    // Act
    renderAlert();
    // Assert
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
