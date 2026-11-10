import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { connections } from '../../src/db/schema.js';
import {
  buildSyncHarness,
  connectionOf,
  countRows,
  runSync,
  type SyncHarness,
} from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const REMOVED_MESSAGE = 'Este banco foi removido do Meu Pluggy. Remova-o do Valora.';

let harness: SyncHarness;

beforeEach(async () => {
  const database = connectTestDatabase();
  await truncateAllTables(database);
  harness = buildSyncHarness({ database });
});

afterEach(async () => {
  await harness.app.close();
});

async function archive(itemId: string): Promise<void> {
  await harness.database.db
    .update(connections)
    .set({ archivedAt: new Date('2026-11-01T12:00:00Z') })
    .where(eq(connections.pluggyItemId, itemId));
}

describe('banco arquivado', () => {
  it('should_not_call_pluggy_for_an_archived_bank_even_if_its_id_is_still_configured', async () => {
    // Arrange
    await runSync(harness.syncService);
    await archive('item-3');
    const fetchItem = vi.spyOn(harness.sdk, 'fetchItem');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(fetchItem.mock.calls.map(([itemId]) => itemId)).toEqual(['item-1', 'item-2']);
  });

  it('should_finish_with_success_when_one_bank_is_archived_and_the_others_work', async () => {
    // Arrange
    await runSync(harness.syncService);
    await archive('item-3');
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect(run).toMatchObject({ status: 'success', errorMessage: null });
  });

  it('should_not_change_the_status_of_an_archived_bank', async () => {
    // Arrange
    await runSync(harness.syncService);
    await harness.database.db
      .update(connections)
      .set({ status: 'error', statusDetail: 'Falha antiga', archivedAt: new Date() })
      .where(eq(connections.pluggyItemId, 'item-3'));
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await connectionOf(harness.database, 'item-3')).toMatchObject({
      status: 'error',
      statusDetail: 'Falha antiga',
    });
  });

  it('should_not_create_another_connection_for_an_archived_bank', async () => {
    // Arrange
    await runSync(harness.syncService);
    await archive('item-3');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect((await countRows(harness.database)).connections).toBe(3);
  });

  it('should_sync_the_bank_again_when_it_is_reactivated', async () => {
    // Arrange
    await runSync(harness.syncService);
    await archive('item-3');
    await runSync(harness.syncService);
    await harness.database.db
      .update(connections)
      .set({ archivedAt: null })
      .where(eq(connections.pluggyItemId, 'item-3'));
    const fetchItem = vi.spyOn(harness.sdk, 'fetchItem');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(fetchItem.mock.calls.map(([itemId]) => itemId)).toContain('item-3');
  });

  it('should_keep_the_history_of_an_archived_bank', async () => {
    // Arrange
    await runSync(harness.syncService);
    const rowsBefore = await countRows(harness.database);
    await archive('item-3');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await countRows(harness.database)).toEqual(rowsBefore);
  });
});

describe('banco removido do Meu Pluggy', () => {
  it('should_save_item_not_found_with_the_fixed_message_when_the_item_does_not_exist', async () => {
    // Arrange
    harness.sdk.removeItem('item-3');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await connectionOf(harness.database, 'item-3')).toMatchObject({
      status: 'item_not_found',
      statusDetail: REMOVED_MESSAGE,
    });
  });

  it('should_keep_syncing_the_other_banks_when_one_item_does_not_exist', async () => {
    // Arrange
    harness.sdk.removeItem('item-3');
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect({
      status: run.status,
      item1: (await connectionOf(harness.database, 'item-1')).status,
      item2: (await connectionOf(harness.database, 'item-2')).status,
    }).toEqual({ status: 'partial', item1: 'ok', item2: 'ok' });
  });

  it('should_keep_a_generic_error_when_the_failure_is_not_a_missing_item', async () => {
    // Arrange
    vi.spyOn(harness.sdk, 'fetchItem').mockRejectedValue(new TypeError('fetch failed'));
    // Act
    await runSync(harness.syncService);
    // Assert
    expect((await connectionOf(harness.database, 'item-1')).status).toBe('error');
  });

  it('should_go_back_to_ok_when_the_bank_answers_again', async () => {
    // Arrange
    harness.sdk.removeItem('item-3');
    await runSync(harness.syncService);
    harness.sdk.restoreItem('item-3');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect((await connectionOf(harness.database, 'item-3')).status).toBe('ok');
  });
});
