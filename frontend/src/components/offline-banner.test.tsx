import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createQueryClient } from '@/app/query-client';
import { ApiError, apiPost } from '@/lib/api-client';
import { CACHED_AT_HEADER } from '@/lib/pwa/cache-rules';
import { recordApiNetworkFailure, recordApiResponse } from '@/lib/pwa/connectivity';

import { stubRoutes } from '../../test/helpers/stub-routes';
import { OfflineBanner } from './offline-banner';
import { SyncStatus } from './sync-status';

function renderBanner(queryClient: QueryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
    </QueryClientProvider>,
  );
}

function goOffline() {
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

function goOnline() {
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

describe('OfflineBanner', () => {
  it('should_show_nothing_when_there_is_network_and_the_data_is_fresh', () => {
    // Arrange
    // Act
    renderBanner();
    // Assert
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should_show_the_date_and_time_of_the_data_when_a_read_came_from_the_cache', () => {
    // Arrange
    renderBanner();
    // Act
    act(() => {
      recordApiResponse(
        'GET',
        new Headers({ [CACHED_AT_HEADER]: 'Wed, 05 Nov 2026 11:12:00 GMT' }),
      );
    });
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sem conexão. Mostrando os dados de 05/11 às 08:12.',
    );
  });

  it('should_warn_that_the_data_may_be_old_when_offline_without_a_cached_date', () => {
    // Arrange
    renderBanner();
    // Act
    goOffline();
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sem conexão. Os dados na tela podem estar desatualizados.',
    );
  });

  it('should_explain_that_actions_need_internet_when_offline', () => {
    // Arrange
    renderBanner();
    // Act
    goOffline();
    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sem conexão: esta ação precisa de internet.',
    );
  });

  it('should_show_the_banner_when_the_server_is_unreachable_even_if_the_browser_says_online', () => {
    // Arrange
    renderBanner();
    // Act
    act(() => recordApiNetworkFailure('GET'));
    // Assert
    expect(screen.getByRole('status')).toBeVisible();
  });

  it('should_disappear_when_the_network_comes_back_and_a_read_succeeds', () => {
    // Arrange
    renderBanner();
    goOffline();
    // Act
    goOnline();
    act(() => recordApiResponse('GET', new Headers()));
    // Assert
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('should_refetch_the_queries_when_the_network_comes_back', () => {
    // Arrange
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderBanner(queryClient);
    goOffline();
    // Act
    goOnline();
    // Assert
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

describe('escritas sem rede', () => {
  it('should_fail_right_away_and_leave_nothing_queued_when_a_write_has_no_network', async () => {
    // Arrange
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = createQueryClient();
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: () => apiPost('/budgets', {}, z.object({})),
    });
    // Act
    const outcome = await mutation.execute(undefined).catch((error: unknown) => error);
    // Assert
    expect({
      isApiError: outcome instanceof ApiError,
      status: mutation.state.status,
      calls: fetchMock.mock.calls.length,
    }).toEqual({ isApiError: true, status: 'error', calls: 1 });
  });

  it('should_tell_the_user_that_the_action_needs_internet_after_a_failed_write', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderBanner();
    // Act
    await apiPost('/budgets', {}, z.object({})).catch(() => undefined);
    // Assert
    expect(await screen.findByText('Sem conexão: esta ação precisa de internet.')).toBeVisible();
  });
});

describe('botão de sincronizar sem rede', () => {
  function renderSyncStatus() {
    stubRoutes({
      'GET /api/v1/sync-runs/latest': () =>
        Response.json({
          id: '99999999-9999-4999-8999-999999999999',
          trigger: 'schedule',
          status: 'success',
          startedAt: '2026-11-05T10:00:00.000Z',
          finishedAt: '2026-11-05T10:02:00.000Z',
          stats: {},
        }),
    });
    return render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always' } } })
        }
      >
        <SyncStatus />
      </QueryClientProvider>,
    );
  }

  it('should_disable_sync_now_with_the_explanation_when_offline', async () => {
    // Arrange
    renderSyncStatus();
    const button = await screen.findByRole('button');
    // Act
    goOffline();
    // Assert
    expect({
      isDisabled: button.hasAttribute('disabled'),
      hint: button.getAttribute('title'),
    }).toEqual({
      isDisabled: true,
      hint: 'Sem conexão: esta ação precisa de internet.',
    });
  });

  it('should_enable_sync_now_when_the_network_is_back', async () => {
    // Arrange
    renderSyncStatus();
    const button = await screen.findByRole('button');
    goOffline();
    // Act
    goOnline();
    await userEvent.hover(button);
    // Assert
    expect(button).toBeEnabled();
  });
});
