import { describe, expect, it } from 'vitest';

import type { SyncRun } from './api/sync';
import { describeSyncOutcome, describeSyncStatus } from './sync-labels';

const NOW = new Date('2026-11-05T15:00:00Z'); // 12:00 em São Paulo

function syncRun(overrides: Partial<SyncRun> = {}): SyncRun {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    trigger: 'schedule',
    status: 'success',
    startedAt: '2026-11-05T10:01:00.000Z',
    finishedAt: '2026-11-05T10:02:00.000Z',
    stats: { transactionsInserted: 3 },
    ...overrides,
  };
}

describe('describeSyncStatus', () => {
  it('should_say_updated_today_with_the_time_when_the_last_run_finished_today', () => {
    // Arrange
    const run = syncRun();
    // Act
    const text = describeSyncStatus(run, false, NOW);
    // Assert
    expect(text).toBe('Atualizado hoje, 07:02');
  });

  it('should_say_updated_yesterday_when_the_last_run_finished_the_day_before', () => {
    // Arrange
    const run = syncRun({ finishedAt: '2026-11-04T10:01:00.000Z' });
    // Act
    const text = describeSyncStatus(run, false, NOW);
    // Assert
    expect(text).toBe('Atualizado ontem, 07:01');
  });

  it('should_say_updated_with_the_date_when_the_last_run_is_older', () => {
    // Arrange
    const run = syncRun({ finishedAt: '2026-11-01T10:01:00.000Z' });
    // Act
    const text = describeSyncStatus(run, false, NOW);
    // Assert
    expect(text).toBe('Atualizado 01/11, 07:01');
  });

  it('should_say_never_synced_when_there_is_no_run', () => {
    // Arrange
    const run = null;
    // Act
    const text = describeSyncStatus(run, false, NOW);
    // Assert
    expect(text).toBe('Nunca sincronizado');
  });

  it('should_say_syncing_when_a_run_is_in_progress', () => {
    // Arrange
    const run = syncRun({ status: 'running', finishedAt: null });
    // Act
    const text = describeSyncStatus(run, true, NOW);
    // Assert
    expect(text).toBe('Sincronizando…');
  });

  it('should_say_failed_when_the_last_run_failed', () => {
    // Arrange
    const run = syncRun({ status: 'failed' });
    // Act
    const text = describeSyncStatus(run, false, NOW);
    // Assert
    expect(text).toBe('Falha na atualização');
  });
});

describe('describeSyncOutcome', () => {
  it('should_count_the_new_transactions_when_the_run_succeeded', () => {
    // Arrange
    const run = syncRun({ stats: { transactionsInserted: 12 } });
    // Act
    const notice = describeSyncOutcome(run);
    // Assert
    expect(notice).toEqual({
      tone: 'success',
      message: 'Sincronização concluída: 12 transações novas',
    });
  });

  it('should_use_the_singular_when_one_transaction_arrived', () => {
    // Arrange
    const run = syncRun({ stats: { transactionsInserted: 1 } });
    // Act
    const notice = describeSyncOutcome(run);
    // Assert
    expect(notice?.message).toBe('Sincronização concluída: 1 transação nova');
  });

  it('should_say_none_when_no_transaction_arrived', () => {
    // Arrange
    const run = syncRun({ stats: { transactionsInserted: 0 } });
    // Act
    const notice = describeSyncOutcome(run);
    // Assert
    expect(notice?.message).toBe('Sincronização concluída: nenhuma transação nova');
  });

  it('should_warn_with_an_error_tone_when_only_some_banks_synced', () => {
    // Arrange
    const run = syncRun({ status: 'partial' });
    // Act
    const notice = describeSyncOutcome(run);
    // Assert
    expect(notice?.tone).toBe('error');
  });

  it('should_report_an_error_when_the_run_failed', () => {
    // Arrange
    const run = syncRun({ status: 'failed', stats: null });
    // Act
    const notice = describeSyncOutcome(run);
    // Assert
    expect(notice).toEqual({
      tone: 'error',
      message: 'A sincronização falhou. Tente de novo mais tarde',
    });
  });

  it('should_return_nothing_when_the_run_is_still_running', () => {
    // Arrange
    const run = syncRun({ status: 'running', finishedAt: null });
    // Act
    const notice = describeSyncOutcome(run);
    // Assert
    expect(notice).toBeNull();
  });
});
