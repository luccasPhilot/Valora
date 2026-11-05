import type { Database } from '../../db/database.js';
import type { Config } from '../../shared/config.js';
import { ConnectionsRepository } from '../connections/connections.repository.js';
import { PluggyClient } from './pluggy-client.js';
import type { PluggySdk } from './pluggy-sdk.js';
import { type SyncLogger, SyncService } from './sync.service.js';
import { SyncUnitOfWork } from './sync.unit-of-work.js';
import { SyncLock } from './sync-lock.repository.js';
import { SyncRunsRepository } from './sync-runs.repository.js';

export interface SyncModuleDependencies {
  readonly config: Config;
  readonly database: Database;
  readonly pluggySdk: PluggySdk;
  readonly logger: SyncLogger;
  readonly now: () => Date;
}

export function createSyncService(deps: SyncModuleDependencies): SyncService {
  return new SyncService({
    pluggy: new PluggyClient(deps.pluggySdk, deps.now),
    itemIds: deps.config.pluggyItemIds,
    lock: new SyncLock(deps.database.pool),
    syncRuns: new SyncRunsRepository(deps.database.db),
    connections: new ConnectionsRepository(deps.database.db),
    unitOfWork: new SyncUnitOfWork(deps.database.db),
    logger: deps.logger,
    now: deps.now,
  });
}
