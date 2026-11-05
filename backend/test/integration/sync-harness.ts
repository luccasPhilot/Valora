import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type { Database } from '../../src/db/database.js';
import {
  accounts,
  balanceSnapshots,
  connections,
  investments,
  investmentSnapshots,
  transactions,
} from '../../src/db/schema.js';
import type { SyncService } from '../../src/modules/sync/sync.service.js';
import type { SyncRunRecord, SyncTrigger } from '../../src/modules/sync/sync-runs.repository.js';
import type { Config } from '../../src/shared/config.js';
import {
  FakePluggySdk,
  fixturesRecordedAt,
  loadPluggyFixtures,
  type PluggyItemFixture,
  type PluggyTransactionFixture,
} from '../helpers/fake-pluggy-sdk.js';
import { buildTestApp, type LogLine, TEST_CONFIG } from '../helpers/test-app.js';
import { connectTestDatabase } from './test-database.js';

const POLL_INTERVAL_MS = 50;
const MAX_POLLS = 200;

export interface SyncHarness {
  readonly app: FastifyInstance;
  readonly syncService: SyncService;
  readonly sdk: FakePluggySdk;
  readonly fixtures: PluggyItemFixture[];
  readonly database: Database;
  readonly logLines: LogLine[];
  /** Relógio da sincronização; mude `now` para simular outro horário. */
  readonly clock: { now: Date };
}

export interface HarnessOptions {
  readonly database?: Database;
  readonly fixtures?: PluggyItemFixture[];
  readonly config?: Config;
}

/** App com banco real (Testcontainers) e Pluggy falso servido pelas fixtures. */
export function buildSyncHarness(options: HarnessOptions = {}): SyncHarness {
  const database = options.database ?? connectTestDatabase();
  const fixtures = options.fixtures ?? loadPluggyFixtures();
  const sdk = new FakePluggySdk(fixtures);
  const clock = { now: fixturesRecordedAt(fixtures) };
  const config = options.config ?? TEST_CONFIG;
  const testApp = buildTestApp(database, { pluggySdk: sdk, now: () => clock.now, config });
  return { ...testApp, sdk, fixtures, database, clock };
}

/** Começa uma execução sem esperar o fim. O objeto evita que o `await` espere o `finished` junto. */
export async function startRun(
  syncService: SyncService,
  trigger: SyncTrigger = 'manual',
): Promise<{ readonly finished: Promise<void> }> {
  const started = await syncService.start(trigger);
  if (started.status !== 'started') throw new Error('Teste: já havia uma sincronização rodando');
  return { finished: started.finished };
}

export async function runSync(
  syncService: SyncService,
  trigger: SyncTrigger = 'manual',
): Promise<SyncRunRecord> {
  const { finished } = await startRun(syncService, trigger);
  await finished;
  return latestRunOf(syncService);
}

export async function latestRunOf(syncService: SyncService): Promise<SyncRunRecord> {
  const latestRun = await syncService.findLatestRun();
  if (!latestRun) throw new Error('Teste: nenhuma execução registrada');
  return latestRun;
}

/** Espera a execução disparada pela rota terminar, para o teste não fechar o banco no meio dela. */
export async function waitForRunToFinish(syncService: SyncService): Promise<SyncRunRecord> {
  for (let poll = 0; poll < MAX_POLLS; poll += 1) {
    const latestRun = await syncService.findLatestRun();
    if (latestRun && latestRun.status !== 'running') return latestRun;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('Teste: a sincronização não terminou a tempo');
}

export async function countRows(database: Database) {
  const { db } = database;
  return {
    connections: await db.$count(connections),
    accounts: await db.$count(accounts),
    balanceSnapshots: await db.$count(balanceSnapshots),
    transactions: await db.$count(transactions),
    investments: await db.$count(investments),
    investmentSnapshots: await db.$count(investmentSnapshots),
  };
}

export async function findTransaction(database: Database, pluggyTransactionId: string) {
  const [row] = await database.db
    .select()
    .from(transactions)
    .where(eq(transactions.pluggyTransactionId, pluggyTransactionId));
  return row;
}

export async function connectionOf(database: Database, pluggyItemId: string) {
  const [row] = await database.db
    .select()
    .from(connections)
    .where(eq(connections.pluggyItemId, pluggyItemId));
  if (!row) throw new Error(`Teste: conexão do item ${pluggyItemId} não existe`);
  return row;
}

export function fixtureOf(
  fixtures: readonly PluggyItemFixture[],
  itemId: string,
): PluggyItemFixture {
  const fixture = fixtures.find((candidate) => candidate.item.id === itemId);
  if (!fixture) throw new Error(`Teste: item ${itemId} não existe nas fixtures`);
  return fixture;
}

/** A transação mais recente com o status pedido (fica dentro da janela de 30 dias). */
export function newestTransaction(
  fixture: PluggyItemFixture,
  status: 'PENDING' | 'POSTED',
): PluggyTransactionFixture {
  const [newest] = fixture.transactions
    .filter((transaction) => transaction.status === status)
    .sort((left, right) => right.date.localeCompare(left.date));
  if (!newest) throw new Error(`Teste: item ${fixture.item.id} sem transação ${status}`);
  return newest;
}

export function withoutTransaction(fixture: PluggyItemFixture, transactionId: string): void {
  fixture.transactions = fixture.transactions.filter(
    (transaction) => transaction.id !== transactionId,
  );
}

export function totalFixtureCounts(fixtures: readonly PluggyItemFixture[]) {
  const sum = (count: (fixture: PluggyItemFixture) => number) =>
    fixtures.reduce((total, fixture) => total + count(fixture), 0);
  return {
    accounts: sum((fixture) => fixture.accounts.length),
    transactions: sum((fixture) => fixture.transactions.length),
    investments: sum((fixture) => fixture.investments.length),
  };
}
