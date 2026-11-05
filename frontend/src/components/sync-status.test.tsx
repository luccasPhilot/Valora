import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { errorResponse, stubRoutes } from '../../test/helpers/stub-routes';
import { SyncStatus } from './sync-status';

const POLL_INTERVAL_MS = 3000;

function syncRun(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: '11111111-1111-4111-8111-111111111111',
    trigger: 'manual',
    status: 'success',
    startedAt: now,
    finishedAt: now,
    stats: { transactionsInserted: 0 },
    ...overrides,
  };
}

const RUNNING = syncRun({ status: 'running', finishedAt: null, stats: null });
const neverSynced = () => errorResponse(404, 'NOT_FOUND');

function renderStatus() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SyncStatus />
    </QueryClientProvider>,
  );
  return queryClient;
}

/** O jsdom não deixa o relógio falso e o `userEvent` esperarem um pelo outro sem este vínculo. */
function setupUser() {
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SyncStatus text', () => {
  it('should_say_updated_today_with_the_time_when_the_last_run_finished_today', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/sync-runs/latest': () => Response.json(syncRun()) });
    // Act
    renderStatus();
    // Assert
    expect(
      await screen.findByRole('button', { name: /^Atualizado hoje, \d{2}:\d{2}$/ }),
    ).toBeVisible();
  });

  it('should_say_never_synced_when_the_api_has_no_run_yet', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/sync-runs/latest': neverSynced });
    // Act
    renderStatus();
    // Assert
    expect(await screen.findByRole('button', { name: 'Nunca sincronizado' })).toBeVisible();
  });

  it('should_say_syncing_when_a_scheduled_run_is_already_in_progress', async () => {
    // Arrange
    stubRoutes({ 'GET /api/v1/sync-runs/latest': () => Response.json(RUNNING) });
    // Act
    renderStatus();
    // Assert
    expect(await screen.findByRole('button', { name: 'Sincronizando…' })).toBeDisabled();
  });
});

describe('SyncStatus sync now', () => {
  it('should_show_syncing_then_the_result_notice_when_the_status_is_pressed', async () => {
    // Arrange
    const user = setupUser();
    let latestCalls = 0;
    const finished = syncRun({ stats: { transactionsInserted: 12 } });
    stubRoutes({
      'GET /api/v1/sync-runs/latest': () => {
        latestCalls += 1;
        return latestCalls === 1 ? neverSynced() : Response.json(finished);
      },
      'POST /api/v1/sync-runs': () => Response.json(RUNNING, { status: 202 }),
    });
    renderStatus();
    // Act
    await user.click(await screen.findByRole('button', { name: 'Nunca sincronizado' }));
    await screen.findByRole('button', { name: 'Sincronizando…' });
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sincronização concluída: 12 transações novas',
    );
    expect(screen.getByRole('button', { name: /^Atualizado hoje/ })).toBeEnabled();
  });

  it('should_follow_the_run_in_progress_without_error_when_the_api_answers_sync_in_progress', async () => {
    // Arrange
    const user = setupUser();
    let latestCalls = 0;
    stubRoutes({
      'GET /api/v1/sync-runs/latest': () => {
        latestCalls += 1;
        return latestCalls === 1 ? Response.json(syncRun()) : Response.json(RUNNING);
      },
      'POST /api/v1/sync-runs': () => errorResponse(409, 'SYNC_IN_PROGRESS'),
    });
    renderStatus();
    // Act
    await user.click(await screen.findByRole('button', { name: /^Atualizado hoje/ }));
    // Assert
    expect(await screen.findByRole('button', { name: 'Sincronizando…' })).toBeVisible();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('should_warn_when_the_run_in_progress_ends_with_failure', async () => {
    // Arrange
    const user = setupUser();
    let latestCalls = 0;
    stubRoutes({
      'GET /api/v1/sync-runs/latest': () => {
        latestCalls += 1;
        return latestCalls === 1
          ? Response.json(syncRun())
          : Response.json(syncRun({ status: 'failed', stats: null }));
      },
      'POST /api/v1/sync-runs': () => Response.json(RUNNING, { status: 202 }),
    });
    renderStatus();
    // Act
    await user.click(await screen.findByRole('button', { name: /^Atualizado hoje/ }));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent('A sincronização falhou');
  });

  it('should_warn_that_it_could_not_start_when_the_api_fails', async () => {
    // Arrange
    const user = setupUser();
    stubRoutes({
      'GET /api/v1/sync-runs/latest': () => Response.json(syncRun()),
      'POST /api/v1/sync-runs': () => errorResponse(500, 'INTERNAL_ERROR'),
    });
    renderStatus();
    // Act
    await user.click(await screen.findByRole('button', { name: /^Atualizado hoje/ }));
    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Não foi possível iniciar a sincronização',
    );
  });

  it('should_reload_the_screens_data_when_the_run_finishes', async () => {
    // Arrange
    const user = setupUser();
    let latestCalls = 0;
    stubRoutes({
      'GET /api/v1/sync-runs/latest': () => {
        latestCalls += 1;
        return Response.json(latestCalls === 1 ? syncRun() : syncRun({ stats: null }));
      },
      'POST /api/v1/sync-runs': () => Response.json(RUNNING, { status: 202 }),
    });
    const queryClient = renderStatus();
    await queryClient.fetchQuery({ queryKey: ['other-screen'], queryFn: async () => 'dados' });
    // Act
    await user.click(await screen.findByRole('button', { name: /^Atualizado hoje/ }));
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await screen.findByRole('status');
    // Assert
    expect(queryClient.getQueryState(['other-screen'])?.isInvalidated).toBe(true);
  });
});
