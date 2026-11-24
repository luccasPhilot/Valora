import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectionsRepository } from '../../src/modules/connections/connections.repository.js';
import { insertConnection } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TODAY = '2026-11-24';

let database: ReturnType<typeof connectTestDatabase>;
let repository: ConnectionsRepository;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  repository = new ConnectionsRepository(database.db);
});

describe('ConnectionsRepository.findUpToDateItemIds', () => {
  it('should_return_the_bank_synced_today_in_sao_paulo', async () => {
    // Arrange: 10:00 UTC = 07:00 em São Paulo.
    await insertConnection(database.db, {
      pluggyItemId: 'item-1',
      lastSyncedAt: new Date('2026-11-24T10:00:00Z'),
    });
    // Act
    const upToDate = await repository.findUpToDateItemIds(['item-1'], TODAY);
    // Assert
    expect(upToDate).toEqual(['item-1']);
  });

  it('should_not_return_the_bank_synced_at_23_30_of_yesterday_in_sao_paulo', async () => {
    // Arrange: 02:30 UTC de 24/11 = 23:30 de 23/11 em São Paulo.
    await insertConnection(database.db, {
      pluggyItemId: 'item-1',
      lastSyncedAt: new Date('2026-11-24T02:30:00Z'),
    });
    // Act
    const upToDate = await repository.findUpToDateItemIds(['item-1'], TODAY);
    // Assert
    expect(upToDate).toEqual([]);
  });

  it('should_not_return_the_bank_never_synced', async () => {
    // Arrange
    await insertConnection(database.db, { pluggyItemId: 'item-1', lastSyncedAt: null });
    // Act
    const upToDate = await repository.findUpToDateItemIds(['item-1'], TODAY);
    // Assert
    expect(upToDate).toEqual([]);
  });

  it('should_return_the_archived_bank_so_it_is_left_out_of_the_catch_up', async () => {
    // Arrange
    await insertConnection(database.db, {
      pluggyItemId: 'item-1',
      lastSyncedAt: new Date('2026-06-01T10:00:00Z'),
      archivedAt: new Date('2026-06-02T10:00:00Z'),
    });
    // Act
    const upToDate = await repository.findUpToDateItemIds(['item-1'], TODAY);
    // Assert
    expect(upToDate).toEqual(['item-1']);
  });

  it('should_ignore_banks_outside_the_requested_ids', async () => {
    // Arrange
    await insertConnection(database.db, {
      pluggyItemId: 'item-9',
      lastSyncedAt: new Date('2026-11-24T10:00:00Z'),
    });
    // Act
    const upToDate = await repository.findUpToDateItemIds(['item-1'], TODAY);
    // Assert
    expect(upToDate).toEqual([]);
  });
});
