import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncRuns } from '../../src/db/schema.js';
import {
  buildSyncHarness,
  connectionOf,
  fixtureOf,
  latestRunOf,
  runSync,
  startRun,
  type SyncHarness,
} from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

let harness: SyncHarness;

beforeEach(async () => {
  const database = connectTestDatabase();
  await truncateAllTables(database);
  harness = buildSyncHarness({ database });
});

afterEach(async () => {
  await harness.app.close();
});

/** O banco fica com o consentimento vencido na próxima sincronização. */
function expireConsent(itemId: string): void {
  fixtureOf(harness.fixtures, itemId).item.consentExpiresAt = '2026-01-01T00:00:00.000Z';
}

function renewConsent(itemId: string): void {
  fixtureOf(harness.fixtures, itemId).item.consentExpiresAt = '2028-01-01T00:00:00.000Z';
}

describe('SyncService.catchUpToday', () => {
  it('should_sync_every_active_bank_when_api_starts_without_sync_today', async () => {
    // Arrange
    const fetchItem = vi.spyOn(harness.sdk, 'fetchItem');
    // Act
    await harness.syncService.catchUpToday();
    // Assert
    expect(fetchItem.mock.calls.map(([itemId]) => itemId)).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('should_sync_only_banks_without_success_today_when_last_run_was_partial', async () => {
    // Arrange
    expireConsent('item-3');
    await runSync(harness.syncService, 'schedule');
    renewConsent('item-3');
    const fetchItem = vi.spyOn(harness.sdk, 'fetchItem');
    // Act
    await harness.syncService.catchUpToday();
    // Assert
    expect(fetchItem.mock.calls.map(([itemId]) => itemId)).toEqual(['item-3']);
  });

  it('should_leave_the_bank_synced_when_catching_up_after_a_partial_run', async () => {
    // Arrange
    expireConsent('item-3');
    await runSync(harness.syncService, 'schedule');
    renewConsent('item-3');
    // Act
    await harness.syncService.catchUpToday();
    // Assert
    expect((await connectionOf(harness.database, 'item-3')).status).toBe('ok');
  });

  it('should_not_create_a_run_when_every_bank_synced_today', async () => {
    // Arrange
    await runSync(harness.syncService);
    const runsBefore = await harness.database.db.$count(syncRuns);
    // Act
    const report = await harness.syncService.catchUpToday();
    // Assert
    expect({ report, runs: await harness.database.db.$count(syncRuns) }).toEqual({
      report: { result: 'nothing_due', pendingItemCount: 0 },
      runs: runsBefore,
    });
  });

  it('should_skip_without_a_new_run_when_another_sync_is_running', async () => {
    // Arrange
    const release = harness.sdk.holdFetchItem();
    const { finished } = await startRun(harness.syncService);
    // Act
    const report = await harness.syncService.catchUpToday();
    release();
    await finished;
    // Assert
    expect({ report, runs: await harness.database.db.$count(syncRuns) }).toEqual({
      report: { result: 'skipped', pendingItemCount: 0 },
      runs: 1,
    });
  });

  it('should_record_schedule_as_trigger_when_catching_up', async () => {
    // Arrange & Act
    await harness.syncService.catchUpToday();
    // Assert
    expect((await latestRunOf(harness.syncService)).trigger).toBe('schedule');
  });
});

describe('SyncService.runScheduled', () => {
  it('should_report_the_banks_still_pending_when_a_bank_fails', async () => {
    // Arrange
    expireConsent('item-3');
    // Act
    const report = await harness.syncService.runScheduled();
    // Assert
    expect(report).toEqual({ result: 'partial', pendingItemCount: 1 });
  });

  it('should_report_no_pending_bank_when_every_bank_syncs', async () => {
    // Arrange & Act
    const report = await harness.syncService.runScheduled();
    // Assert
    expect(report).toEqual({ result: 'success', pendingItemCount: 0 });
  });
});
