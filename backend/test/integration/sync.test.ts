import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accounts, balanceSnapshots, transactions } from '../../src/db/schema.js';
import { subtractDays, todayInSaoPaulo } from '../../src/shared/dates.js';
import { TEST_CONFIG } from '../helpers/test-app.js';
import { insertCategory, transactionValues } from './fixtures.js';
import {
  buildSyncHarness,
  connectionOf,
  countRows,
  findTransaction,
  fixtureOf,
  newestTransaction,
  runSync,
  type SyncHarness,
  totalFixtureCounts,
  withoutTransaction,
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

describe('primeira sincronização', () => {
  it('should_save_accounts_snapshots_transactions_and_investments_when_syncing_for_the_first_time', async () => {
    // Arrange
    const expected = totalFixtureCounts(harness.fixtures);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await countRows(harness.database)).toEqual({
      connections: 3,
      accounts: expected.accounts,
      balanceSnapshots: expected.accounts,
      transactions: expected.transactions,
      investments: expected.investments,
      investmentSnapshots: expected.investments,
    });
  });

  it('should_finish_as_success_with_counts_when_every_bank_syncs', async () => {
    // Arrange
    const expected = totalFixtureCounts(harness.fixtures);
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect(run).toMatchObject({
      status: 'success',
      trigger: 'manual',
      errorMessage: null,
      stats: {
        accounts: expected.accounts,
        transactionsInserted: expected.transactions,
        transactionsUpdated: 0,
        transactionsRemoved: 0,
        investments: expected.investments,
      },
    });
  });

  it('should_fetch_365_days_of_transactions_when_the_bank_was_never_synced', async () => {
    // Arrange
    const today = todayInSaoPaulo(harness.clock.now);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(new Set(harness.sdk.requestedWindows.map((window) => window.from))).toEqual(
      new Set([subtractDays(today, 365)]),
    );
  });

  it('should_name_each_connection_after_its_bank_account_when_connector_is_meu_pluggy', async () => {
    // Arrange & Act
    await runSync(harness.syncService);
    // Assert
    const connection = await connectionOf(harness.database, 'item-2');
    expect(connection).toMatchObject({
      institutionName: 'Banco B',
      institutionLogoUrl: null,
      status: 'ok',
    });
  });

  it('should_save_open_finance_transactions_without_effective_category_when_inserted', async () => {
    // Arrange
    const pending = newestTransaction(fixtureOf(harness.fixtures, 'item-2'), 'PENDING');
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await findTransaction(harness.database, pending.id)).toMatchObject({
      source: 'open_finance',
      status: 'pending',
      categoryId: null,
      categorySource: 'none',
      pluggyCategory: pending.category,
    });
  });
});

describe('sincronização seguinte', () => {
  it('should_not_create_rows_when_sync_runs_twice_without_changes', async () => {
    // Arrange
    await runSync(harness.syncService);
    const countsAfterFirstRun = await countRows(harness.database);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await countRows(harness.database)).toEqual(countsAfterFirstRun);
  });

  it('should_report_nothing_inserted_or_updated_when_sync_runs_twice_without_changes', async () => {
    // Arrange
    await runSync(harness.syncService);
    // Act
    const secondRun = await runSync(harness.syncService);
    // Assert
    expect(secondRun.stats).toMatchObject({
      transactionsInserted: 0,
      transactionsUpdated: 0,
      transactionsRemoved: 0,
    });
  });

  it('should_fetch_30_days_of_transactions_when_the_bank_was_synced_before', async () => {
    // Arrange
    await runSync(harness.syncService);
    harness.sdk.requestedWindows.length = 0;
    const today = todayInSaoPaulo(harness.clock.now);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(new Set(harness.sdk.requestedWindows.map((window) => window.from))).toEqual(
      new Set([subtractDays(today, 30)]),
    );
  });
});

describe('transações pendentes', () => {
  it('should_turn_pending_into_posted_without_duplicating_when_same_id_comes_back_posted', async () => {
    // Arrange
    const fixture = fixtureOf(harness.fixtures, 'item-2');
    const pending = newestTransaction(fixture, 'PENDING');
    await runSync(harness.syncService);
    const transactionCount = (await countRows(harness.database)).transactions;
    pending.status = 'POSTED';
    // Act
    await runSync(harness.syncService);
    // Assert
    expect({
      status: (await findTransaction(harness.database, pending.id))?.status,
      transactions: (await countRows(harness.database)).transactions,
    }).toEqual({ status: 'posted', transactions: transactionCount });
  });

  it('should_delete_pending_transaction_when_it_disappears_from_pluggy', async () => {
    // Arrange
    const fixture = fixtureOf(harness.fixtures, 'item-3');
    const pending = newestTransaction(fixture, 'PENDING');
    await runSync(harness.syncService);
    withoutTransaction(fixture, pending.id);
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect({
      row: await findTransaction(harness.database, pending.id),
      removed: run.stats?.transactionsRemoved,
    }).toEqual({ row: undefined, removed: 1 });
  });

  it('should_keep_posted_transaction_when_it_disappears_from_pluggy', async () => {
    // Arrange
    const fixture = fixtureOf(harness.fixtures, 'item-3');
    const posted = newestTransaction(fixture, 'POSTED');
    await runSync(harness.syncService);
    withoutTransaction(fixture, posted.id);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await findTransaction(harness.database, posted.id)).toBeDefined();
  });
});

describe('categoria escolhida pelo usuário', () => {
  it('should_keep_user_category_and_update_only_pluggy_category_when_pluggy_suggests_another', async () => {
    // Arrange
    const posted = newestTransaction(fixtureOf(harness.fixtures, 'item-1'), 'POSTED');
    await runSync(harness.syncService);
    const categoryId = await insertCategory(harness.database.db);
    await harness.database.db
      .update(transactions)
      .set({ categoryId, categorySource: 'user' })
      .where(eq(transactions.pluggyTransactionId, posted.id));
    posted.category = 'Outra categoria do Pluggy';
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await findTransaction(harness.database, posted.id)).toMatchObject({
      categoryId,
      categorySource: 'user',
      pluggyCategory: 'Outra categoria do Pluggy',
    });
  });
});

describe('transações manuais', () => {
  it('should_leave_manual_transactions_untouched_when_they_are_inside_the_window', async () => {
    // Arrange
    await runSync(harness.syncService);
    const [account] = await harness.database.db.select({ id: accounts.id }).from(accounts);
    if (!account) throw new Error('Teste: nenhuma conta sincronizada');
    const today = todayInSaoPaulo(harness.clock.now);
    // A manual pendente não existe na regra de produto; aqui ela prova que o filtro de origem protege.
    const manualRows = await harness.database.db
      .insert(transactions)
      .values([
        transactionValues(account.id, { source: 'manual', categorySource: 'user', date: today }),
        transactionValues(account.id, { source: 'manual', status: 'pending', date: today }),
      ])
      .returning();
    // Act
    await runSync(harness.syncService);
    // Assert
    const rowsAfterSync = await harness.database.db
      .select()
      .from(transactions)
      .where(eq(transactions.source, 'manual'));
    expect(rowsAfterSync).toEqual(expect.arrayContaining(manualRows));
  });
});

describe('falhas isoladas por banco', () => {
  it('should_sync_other_banks_and_finish_partial_when_one_consent_expired', async () => {
    // Arrange
    fixtureOf(harness.fixtures, 'item-3').item.consentExpiresAt = '2026-01-01T00:00:00.000Z';
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    const expired = await connectionOf(harness.database, 'item-3');
    expect({
      run: run.status,
      expired: expired.status,
      hasMessage: (expired.statusDetail ?? '').length > 0,
      syncedAccounts: (await countRows(harness.database)).accounts,
    }).toEqual({
      run: 'partial',
      expired: 'consent_expired',
      hasMessage: true,
      syncedAccounts: totalFixtureCounts(harness.fixtures.slice(0, 2)).accounts,
    });
  });

  it('should_save_nothing_from_a_bank_when_writing_fails_in_the_middle', async () => {
    // Arrange: parcela acima do `integer` do PostgreSQL passa no Zod e quebra na gravação das transações.
    const fixture = fixtureOf(harness.fixtures, 'item-2');
    const target = newestTransaction(fixture, 'POSTED');
    target.creditCardMetadata = { installmentNumber: 1, totalInstallments: 3_000_000_000 };
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    const connection = await connectionOf(harness.database, 'item-2');
    const savedAccounts = await harness.database.db
      .select()
      .from(accounts)
      .where(eq(accounts.connectionId, connection.id));
    expect({ run: run.status, connection: connection.status, savedAccounts }).toEqual({
      run: 'partial',
      connection: 'error',
      savedAccounts: [],
    });
  });

  it('should_save_nothing_from_a_bank_when_a_transaction_comes_without_amount', async () => {
    // Arrange
    const fixture = fixtureOf(harness.fixtures, 'item-1');
    const target = newestTransaction(fixture, 'POSTED');
    delete target.amount;
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    const connection = await connectionOf(harness.database, 'item-1');
    expect({
      run: run.status,
      connection: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      accounts: (await countRows(harness.database)).accounts,
    }).toEqual({
      run: 'partial',
      connection: 'error',
      lastSyncedAt: null,
      accounts: totalFixtureCounts(harness.fixtures.slice(1)).accounts,
    });
  });

  it('should_create_a_connection_when_a_new_item_id_is_added_to_the_list', async () => {
    // Arrange: primeiro a API conhece dois bancos; depois o terceiro entra no PLUGGY_ITEM_IDS.
    await harness.app.close();
    const twoBanks = buildSyncHarness({
      config: { ...TEST_CONFIG, pluggyItemIds: ['item-1', 'item-2'] },
    });
    await runSync(twoBanks.syncService);
    await twoBanks.app.close();
    harness = buildSyncHarness();
    // Act
    await runSync(harness.syncService);
    // Assert
    expect((await connectionOf(harness.database, 'item-3')).status).toBe('ok');
  });
});

describe('foto diária do saldo', () => {
  it('should_keep_one_snapshot_per_account_with_the_latest_balance_when_syncing_twice_a_day', async () => {
    // Arrange: 07:00 e 15:00 em São Paulo do mesmo dia.
    const fixture = fixtureOf(harness.fixtures, 'item-1');
    const [checking] = fixture.accounts;
    if (!checking) throw new Error('Teste: item sem conta');
    harness.clock.now = new Date('2026-11-04T10:00:00Z');
    await runSync(harness.syncService);
    checking.balance = 1234.56;
    harness.clock.now = new Date('2026-11-04T18:00:00Z');
    // Act
    await runSync(harness.syncService);
    // Assert
    const snapshots = await harness.database.db
      .select({ date: balanceSnapshots.date, balanceCents: balanceSnapshots.balanceCents })
      .from(balanceSnapshots)
      .innerJoin(accounts, eq(accounts.id, balanceSnapshots.accountId))
      .where(eq(accounts.pluggyAccountId, checking.id));
    expect({
      snapshots,
      total: (await countRows(harness.database)).balanceSnapshots,
    }).toEqual({
      snapshots: [{ date: '2026-11-04', balanceCents: 123456 }],
      total: totalFixtureCounts(harness.fixtures).accounts,
    });
  });
});
