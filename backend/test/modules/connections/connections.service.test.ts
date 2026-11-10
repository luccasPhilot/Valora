import { describe, expect, it, vi } from 'vitest';

import type {
  ConnectionRecord,
  ConnectionsRepository,
  ConnectionWithAccounts,
} from '../../../src/modules/connections/connections.repository.js';
import { ConnectionsService } from '../../../src/modules/connections/connections.service.js';
import { NotFoundError } from '../../../src/shared/errors.js';

function connection(overrides: Partial<ConnectionWithAccounts> = {}): ConnectionWithAccounts {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pluggyItemId: 'item-1',
    institutionName: 'Banco Azul',
    institutionLogoUrl: null,
    status: 'ok',
    statusDetail: null,
    lastSyncedAt: null,
    archivedAt: null,
    accounts: [],
    ...overrides,
  };
}

function serviceWith(
  repository: Partial<Pick<ConnectionsRepository, 'findWithAccounts' | 'setArchived'>>,
  configuredItemIds: readonly string[],
): ConnectionsService {
  return new ConnectionsService(repository as ConnectionsRepository, configuredItemIds, {
    refresh: vi.fn().mockResolvedValue(undefined),
  });
}

describe('ConnectionsService.list', () => {
  it('should_mark_the_bank_as_configured_when_its_item_id_is_in_the_list', async () => {
    // Arrange
    const service = serviceWith(
      { findWithAccounts: vi.fn().mockResolvedValue([connection({ pluggyItemId: 'item-1' })]) },
      ['item-1', 'item-2'],
    );
    // Act
    const [view] = await service.list({ isArchived: false });
    // Assert
    expect(view?.isConfigured).toBe(true);
  });

  it('should_mark_the_bank_as_not_configured_when_its_item_id_left_the_list', async () => {
    // Arrange
    const service = serviceWith(
      { findWithAccounts: vi.fn().mockResolvedValue([connection({ pluggyItemId: 'item-9' })]) },
      ['item-1'],
    );
    // Act
    const [view] = await service.list({ isArchived: false });
    // Assert
    expect(view?.isConfigured).toBe(false);
  });

  it('should_ask_the_repository_for_archived_banks_when_archived_is_requested', async () => {
    // Arrange
    const findWithAccounts = vi.fn().mockResolvedValue([]);
    const service = serviceWith({ findWithAccounts }, []);
    // Act
    await service.list({ isArchived: true });
    // Assert
    expect(findWithAccounts).toHaveBeenCalledWith({ isArchived: true });
  });
});

describe('ConnectionsService.setArchived', () => {
  it('should_throw_a_not_found_error_naming_the_connection_when_it_does_not_exist', async () => {
    // Arrange
    const service = serviceWith({ setArchived: vi.fn().mockResolvedValue(null) }, []);
    // Act
    const archive = service.setArchived('22222222-2222-4222-8222-222222222222', true);
    // Assert
    await expect(archive).rejects.toThrow(
      new NotFoundError('Conexão 22222222-2222-4222-8222-222222222222 não encontrada'),
    );
  });

  it('should_return_the_updated_connection_when_it_exists', async () => {
    // Arrange
    const updated: ConnectionRecord = {
      ...connection(),
      archivedAt: new Date('2026-11-10T12:00:00Z'),
    };
    const service = serviceWith({ setArchived: vi.fn().mockResolvedValue(updated) }, []);
    // Act
    const result = await service.setArchived(updated.id, true);
    // Assert
    expect(result.archivedAt).toEqual(new Date('2026-11-10T12:00:00Z'));
  });
});
