import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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
