import type { FastifyInstance } from 'fastify';
import type { DestinationStream } from 'pino';

import { buildApp } from '../../src/app.js';
import { createDatabase, type Database } from '../../src/db/database.js';
import type { CategorySeedService } from '../../src/modules/categories/category-seed.service.js';
import type { PluggySdk } from '../../src/modules/sync/pluggy-sdk.js';
import type { SyncService } from '../../src/modules/sync/sync.service.js';
import type { Config } from '../../src/shared/config.js';
import { FakePluggySdk, loadPluggyFixtures } from './fake-pluggy-sdk.js';

// Porta 1 nunca tem PostgreSQL. O Pool só conecta numa consulta, então estes testes não precisam do Docker.
const UNREACHABLE_DATABASE_URL = 'postgres://valora:valora@127.0.0.1:1/valora';

export const TEST_CONFIG: Config = {
  databaseUrl: UNREACHABLE_DATABASE_URL,
  host: '127.0.0.1',
  port: 3000,
  logLevel: 'info',
  pluggyClientId: 'test-client-id',
  pluggyClientSecret: 'test-client-secret',
  // Os mesmos itens das fixtures em test/fixtures/pluggy/.
  pluggyItemIds: ['item-1', 'item-2', 'item-3'],
  syncCron: '0 7 * * *',
};

export type LogLine = Record<string, unknown>;

export interface TestApp {
  readonly app: FastifyInstance;
  readonly logLines: LogLine[];
  readonly syncService: SyncService;
  readonly categorySeedService: CategorySeedService;
}

export interface TestAppOptions {
  readonly pluggySdk?: PluggySdk;
  readonly now?: () => Date;
  readonly config?: Config;
}

export function buildTestApp(
  database: Database = createDatabase(UNREACHABLE_DATABASE_URL),
  options: TestAppOptions = {},
): TestApp {
  const logLines: LogLine[] = [];
  const logStream: DestinationStream = {
    write(message: string) {
      logLines.push(JSON.parse(message));
    },
  };
  const { app, syncService, categorySeedService } = buildApp({
    config: options.config ?? TEST_CONFIG,
    database,
    logStream,
    pluggySdk: options.pluggySdk ?? new FakePluggySdk(loadPluggyFixtures()),
    now: options.now,
  });
  return { app, logLines, syncService, categorySeedService };
}
