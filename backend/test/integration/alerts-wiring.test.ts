import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accounts, budgets, categories, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { buildSyncHarness, fixtureOf, runSync, type SyncHarness } from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const ALERTS_URL = '/api/v1/alerts';
const NOVEMBER_FIRST_DAY = '2026-11-01';
// 4 de novembro de 2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-04T15:00:00Z');
const TODAY = '2026-11-04';

let database: ReturnType<typeof connectTestDatabase>;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
});

async function listAlertTypes(app: TestApp['app']): Promise<string[]> {
  const response = await app.inject({ method: 'GET', url: ALERTS_URL });
  return response.json().items.map((alert: { type: string }) => alert.type);
}

describe('gravações do usuário', () => {
  let testApp: TestApp;
  let foodCategoryId: string;
  let cashAccountId: string;

  beforeEach(async () => {
    testApp = buildTestApp(database, { now: () => NOW });
    await testApp.categorySeedService.run();
    await testApp.accountsService.ensureCashAccount();
    const [food] = await database.db
      .select()
      .from(categories)
      .where(eq(categories.seedKey, 'food'));
    const [cash] = await database.db.select().from(accounts).where(eq(accounts.type, 'cash'));
    if (!food || !cash) throw new Error('Teste: seed incompleto');
    foodCategoryId = food.id;
    cashAccountId = cash.id;
  });

  afterEach(async () => {
    await testApp.app.close();
  });

  it('should_create_the_budget_alert_right_away_when_a_manual_expense_passes_eighty_percent', async () => {
    // Arrange
    await database.db
      .insert(budgets)
      .values({ categoryId: foodCategoryId, month: NOVEMBER_FIRST_DAY, limitCents: 100_000 });
    // Act
    const created = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      payload: {
        type: 'expense',
        amountCents: 85_000,
        description: 'Churrasco',
        date: TODAY,
        categoryId: foodCategoryId,
        accountId: cashAccountId,
      },
    });
    // Assert
    expect({ status: created.statusCode, types: await listAlertTypes(testApp.app) }).toEqual({
      status: 201,
      types: ['budget_warning'],
    });
  });

  it('should_resolve_the_alert_when_the_manual_expense_is_deleted', async () => {
    // Arrange
    await database.db
      .insert(budgets)
      .values({ categoryId: foodCategoryId, month: NOVEMBER_FIRST_DAY, limitCents: 100_000 });
    const created = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      payload: {
        type: 'expense',
        amountCents: 85_000,
        description: 'Churrasco',
        date: TODAY,
        categoryId: foodCategoryId,
        accountId: cashAccountId,
      },
    });
    // Act
    await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/transactions/${created.json().id}`,
    });
    // Assert
    expect(await listAlertTypes(testApp.app)).toEqual([]);
  });

  it('should_create_the_alert_when_a_bank_transaction_is_moved_into_a_budgeted_category', async () => {
    // Arrange
    const bankAccountId = await insertAccount(database.db);
    await database.db
      .insert(budgets)
      .values({ categoryId: foodCategoryId, month: NOVEMBER_FIRST_DAY, limitCents: 100_000 });
    const [bankTransaction] = await database.db
      .insert(transactions)
      .values(transactionValues(bankAccountId, { date: TODAY, amountCents: -90_000 }))
      .returning({ id: transactions.id });
    // Act
    await testApp.app.inject({
      method: 'PATCH',
      url: `/api/v1/transactions/${bankTransaction?.id}`,
      payload: { categoryId: foodCategoryId },
    });
    // Assert
    expect(await listAlertTypes(testApp.app)).toEqual(['budget_warning']);
  });

  it('should_create_the_alert_when_the_limit_is_lowered_below_the_current_spending', async () => {
    // Arrange
    const bankAccountId = await insertAccount(database.db);
    await database.db.insert(transactions).values(
      transactionValues(bankAccountId, {
        categoryId: foodCategoryId,
        date: TODAY,
        amountCents: -50_000,
      }),
    );
    // Act
    await testApp.app.inject({
      method: 'PUT',
      url: '/api/v1/budgets/' + foodCategoryId + '?month=2026-11',
      payload: { limitCents: 55_000 },
    });
    // Assert
    expect(await listAlertTypes(testApp.app)).toEqual(['budget_warning']);
  });

  it('should_resolve_the_alert_when_the_limit_is_removed', async () => {
    // Arrange
    const bankAccountId = await insertAccount(database.db);
    await database.db.insert(transactions).values(
      transactionValues(bankAccountId, {
        categoryId: foodCategoryId,
        date: TODAY,
        amountCents: -50_000,
      }),
    );
    await testApp.app.inject({
      method: 'PUT',
      url: '/api/v1/budgets/' + foodCategoryId + '?month=2026-11',
      payload: { limitCents: 55_000 },
    });
    // Act
    await testApp.app.inject({
      method: 'DELETE',
      url: '/api/v1/budgets/' + foodCategoryId + '?month=2026-11',
    });
    // Assert
    expect(await listAlertTypes(testApp.app)).toEqual([]);
  });
});

describe('sincronização', () => {
  let harness: SyncHarness;

  beforeEach(() => {
    harness = buildSyncHarness({ database });
  });

  afterEach(async () => {
    await harness.app.close();
  });

  it('should_create_the_connection_alert_when_a_bank_fails_and_the_run_is_partial', async () => {
    // Arrange
    fixtureOf(harness.fixtures, 'item-3').item.consentExpiresAt = '2026-01-01T00:00:00.000Z';
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect({ run: run.status, types: await listAlertTypes(harness.app) }).toEqual({
      run: 'partial',
      types: ['connection_error'],
    });
  });

  it('should_keep_a_single_connection_alert_when_the_bank_keeps_failing_in_the_next_sync', async () => {
    // Arrange
    fixtureOf(harness.fixtures, 'item-3').item.consentExpiresAt = '2026-01-01T00:00:00.000Z';
    await runSync(harness.syncService);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await listAlertTypes(harness.app)).toEqual(['connection_error']);
  });

  it('should_finish_the_sync_with_its_own_result_when_the_alerts_evaluation_fails', async () => {
    // Arrange: sem a tabela, a avaliação lança; o resto da sincronização não depende dela.
    await database.db.execute(sql`alter table alerts rename to alerts_unavailable`);
    try {
      // Act
      const run = await runSync(harness.syncService);
      // Assert
      const failureLog = harness.logLines.find((line) => line.msg === 'alerts evaluation failed');
      expect({
        status: run.status,
        alertsFailed: run.stats?.alertsFailed,
        hasErrorType: typeof failureLog?.errorType === 'string',
        hasErrorDetails: failureLog !== undefined && 'err' in failureLog,
      }).toEqual({
        status: 'success',
        alertsFailed: 1,
        hasErrorType: true,
        hasErrorDetails: false,
      });
    } finally {
      await database.db.execute(sql`alter table alerts_unavailable rename to alerts`);
    }
  });

  it('should_record_zero_failures_in_the_stats_when_the_evaluation_succeeds', async () => {
    // Arrange
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect(run.stats?.alertsFailed).toBe(0);
  });
});
