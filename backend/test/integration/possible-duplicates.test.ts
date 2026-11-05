import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { categories, transactions } from '../../src/db/schema.js';
import { DuplicateDetector } from '../../src/modules/transactions/duplicate-detector.js';
import { PossibleDuplicatesRepository } from '../../src/modules/transactions/possible-duplicates.repository.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, transactionValues } from './fixtures.js';
import {
  buildSyncHarness,
  fixtureOf,
  newestTransaction,
  runSync,
  type SyncHarness,
} from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TRANSACTIONS_URL = '/api/v1/transactions';
const NOW = new Date('2026-11-04T15:00:00Z');
const AMOUNT_CENTS = -4500;

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  await testApp.categorySeedService.run();
  accountId = await insertAccount(database.db);
});

afterEach(async () => {
  await testApp.app.close();
});

async function categoryIdOf(seedKey: string): Promise<string> {
  const [row] = await database.db.select().from(categories).where(eq(categories.seedKey, seedKey));
  if (!row) throw new Error(`Teste: categoria ${seedKey} não existe`);
  return row.id;
}

async function insertTransaction(
  overrides: Partial<typeof transactions.$inferInsert> = {},
): Promise<string> {
  const [row] = await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { amountCents: AMOUNT_CENTS, ...overrides }))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: transação não foi criada');
  return row.id;
}

function insertManual(overrides: Partial<typeof transactions.$inferInsert> = {}): Promise<string> {
  return insertTransaction({ source: 'manual', categorySource: 'user', ...overrides });
}

async function markedAs(transactionId: string): Promise<string | null | undefined> {
  const [row] = await database.db
    .select({ possibleDuplicateOfId: transactions.possibleDuplicateOfId })
    .from(transactions)
    .where(eq(transactions.id, transactionId));
  return row?.possibleDuplicateOfId;
}

function detect(insertedIds: string[]): Promise<number> {
  const detector = new DuplicateDetector(new PossibleDuplicatesRepository(database.db));
  return detector.markPossibleDuplicates(insertedIds);
}

describe('detecção de possível duplicata', () => {
  it('should_mark_the_bank_transaction_when_a_manual_one_has_the_same_amount_one_day_earlier', async () => {
    // Arrange
    const manualId = await insertManual({ date: '2026-11-02' });
    const bankId = await insertTransaction({ date: '2026-11-03' });
    // Act
    await detect([bankId]);
    // Assert
    expect({
      marked: await markedAs(bankId),
      total: await database.db.$count(transactions),
    }).toEqual({ marked: manualId, total: 2 });
  });

  it('should_mark_the_bank_transaction_when_the_manual_one_is_exactly_three_days_apart', async () => {
    // Arrange
    const manualId = await insertManual({ date: '2026-11-06' });
    const bankId = await insertTransaction({ date: '2026-11-03' });
    // Act
    await detect([bankId]);
    // Assert
    expect(await markedAs(bankId)).toBe(manualId);
  });

  it('should_not_mark_when_the_amount_differs_by_one_cent', async () => {
    // Arrange
    await insertManual({ date: '2026-11-03', amountCents: -4510 });
    const bankId = await insertTransaction({ date: '2026-11-03' });
    // Act
    await detect([bankId]);
    // Assert
    expect(await markedAs(bankId)).toBeNull();
  });

  it('should_not_mark_when_the_manual_one_is_four_days_apart', async () => {
    // Arrange
    await insertManual({ date: '2026-11-02' });
    const bankId = await insertTransaction({ date: '2026-11-06' });
    // Act
    await detect([bankId]);
    // Assert
    expect(await markedAs(bankId)).toBeNull();
  });

  it('should_not_mark_when_the_manual_one_is_in_another_account', async () => {
    // Arrange
    const otherAccountId = await insertAccount(database.db);
    await insertManual({ date: '2026-11-03', accountId: otherAccountId });
    const bankId = await insertTransaction({ date: '2026-11-03' });
    // Act
    await detect([bankId]);
    // Assert
    expect(await markedAs(bankId)).toBeNull();
  });

  it('should_not_mark_when_the_only_match_is_another_bank_transaction', async () => {
    // Arrange
    await insertTransaction({ date: '2026-11-03' });
    const bankId = await insertTransaction({ date: '2026-11-03', description: 'Outra' });
    // Act
    await detect([bankId]);
    // Assert
    expect(await markedAs(bankId)).toBeNull();
  });

  it('should_choose_the_closest_date_when_two_manual_transactions_match', async () => {
    // Arrange
    await insertManual({ date: '2026-11-01' });
    const closestId = await insertManual({ date: '2026-11-02' });
    const bankId = await insertTransaction({ date: '2026-11-03' });
    // Act
    await detect([bankId]);
    // Assert
    expect(await markedAs(bankId)).toBe(closestId);
  });

  it('should_choose_the_first_one_created_when_two_manual_transactions_tie_on_date', async () => {
    // Arrange
    const firstId = await insertManual({ date: '2026-11-03' });
    await insertManual({ date: '2026-11-03' });
    const bankId = await insertTransaction({ date: '2026-11-03' });
    // Act
    await detect([bankId]);
    // Assert
    expect(await markedAs(bankId)).toBe(firstId);
  });

  it('should_point_only_one_bank_transaction_at_each_manual_one_when_two_arrive_together', async () => {
    // Arrange
    const manualId = await insertManual({ date: '2026-11-03' });
    const firstBankId = await insertTransaction({ date: '2026-11-03' });
    const secondBankId = await insertTransaction({ date: '2026-11-03', description: 'Outra' });
    // Act
    const markedCount = await detect([firstBankId, secondBankId]);
    // Assert
    expect({
      markedCount,
      pointers: [await markedAs(firstBankId), await markedAs(secondBankId)],
    }).toEqual({ markedCount: 1, pointers: [manualId, null] });
  });

  it('should_not_touch_anything_when_there_are_no_inserted_ids', async () => {
    // Arrange
    await insertManual({ date: '2026-11-03' });
    // Act
    const markedCount = await detect([]);
    // Assert
    expect(markedCount).toBe(0);
  });
});

describe('detecção na sincronização', () => {
  let harness: SyncHarness;

  beforeEach(() => {
    harness = buildSyncHarness({ database });
  });

  /** Sincroniza, tira do banco a transação mais nova de um banco e lança uma manual parecida. */
  async function syncThenLeaveOnlyAManualTwin(dayOffset: number) {
    const fixture = fixtureOf(harness.fixtures, 'item-1');
    const target = newestTransaction(fixture, 'POSTED');
    await runSync(harness.syncService);
    const [bankRow] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.pluggyTransactionId, target.id));
    if (!bankRow) throw new Error('Teste: a transação não foi sincronizada');
    await database.db.delete(transactions).where(eq(transactions.id, bankRow.id));
    const twinDate = new Date(`${bankRow.date}T00:00:00Z`);
    twinDate.setUTCDate(twinDate.getUTCDate() + dayOffset);
    const [manual] = await database.db
      .insert(transactions)
      .values(
        transactionValues(bankRow.accountId, {
          source: 'manual',
          categorySource: 'user',
          amountCents: bankRow.amountCents,
          date: twinDate.toISOString().slice(0, 10),
        }),
      )
      .returning({ id: transactions.id });
    return { targetPluggyId: target.id, manualId: manual?.id };
  }

  it('should_mark_the_inserted_bank_transaction_when_a_manual_twin_exists_and_keep_both', async () => {
    // Arrange
    const { targetPluggyId, manualId } = await syncThenLeaveOnlyAManualTwin(-1);
    // Act
    await runSync(harness.syncService);
    // Assert
    const [bankRow] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.pluggyTransactionId, targetPluggyId));
    expect({
      marked: bankRow?.possibleDuplicateOfId,
      manualStillThere: await database.db.$count(transactions, eq(transactions.id, manualId ?? '')),
    }).toEqual({ marked: manualId, manualStillThere: 1 });
  });

  it('should_not_run_the_detection_when_the_sync_only_updates_an_existing_transaction', async () => {
    // Arrange
    const fixture = fixtureOf(harness.fixtures, 'item-1');
    const target = newestTransaction(fixture, 'POSTED');
    await runSync(harness.syncService);
    const [bankRow] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.pluggyTransactionId, target.id));
    await database.db.insert(transactions).values(
      transactionValues(bankRow?.accountId ?? '', {
        source: 'manual',
        categorySource: 'user',
        amountCents: bankRow?.amountCents ?? 0,
        date: bankRow?.date ?? '',
      }),
    );
    target.description = 'Descrição que o banco corrigiu';
    // Act
    await runSync(harness.syncService);
    // Assert
    const [after] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.pluggyTransactionId, target.id));
    expect({
      description: after?.description,
      marked: after?.possibleDuplicateOfId,
    }).toEqual({ description: 'Descrição que o banco corrigiu', marked: null });
  });
});

describe('POST /api/v1/transactions/:id/duplicate-resolution', () => {
  function resolve(transactionId: string, action: string) {
    return testApp.app.inject({
      method: 'POST',
      url: `${TRANSACTIONS_URL}/${transactionId}/duplicate-resolution`,
      payload: { action },
    });
  }

  async function insertPair(manualCategorySeedKey = 'groceries') {
    const manualId = await insertManual({
      date: '2026-11-02',
      categoryId: await categoryIdOf(manualCategorySeedKey),
    });
    const bankId = await insertTransaction({
      date: '2026-11-03',
      possibleDuplicateOfId: manualId,
      categoryId: await categoryIdOf('leisure'),
      categorySource: 'pluggy',
    });
    return { manualId, bankId };
  }

  it('should_keep_only_the_bank_transaction_with_the_manual_category_when_merging', async () => {
    // Arrange
    const { manualId, bankId } = await insertPair('groceries');
    // Act
    const response = await resolve(bankId, 'merge');
    // Assert
    const groceries = await categoryIdOf('groceries');
    expect({
      statusCode: response.statusCode,
      body: response.json(),
      manualCount: await database.db.$count(transactions, eq(transactions.id, manualId)),
      total: await database.db.$count(transactions),
    }).toMatchObject({
      statusCode: 200,
      body: { id: bankId, categorySource: 'user', possibleDuplicateOfId: null },
      manualCount: 0,
      total: 1,
    });
    expect(response.json().category.id).toBe(groceries);
  });

  it('should_keep_both_transactions_without_the_mark_when_they_are_different', async () => {
    // Arrange
    const { bankId } = await insertPair();
    // Act
    const response = await resolve(bankId, 'keep_both');
    // Assert
    expect({
      statusCode: response.statusCode,
      marked: await markedAs(bankId),
      total: await database.db.$count(transactions),
    }).toEqual({ statusCode: 200, marked: null, total: 2 });
  });

  it('should_answer_409_no_duplicate_pending_when_the_transaction_has_no_mark', async () => {
    // Arrange
    const bankId = await insertTransaction({ date: '2026-11-03' });
    // Act
    const response = await resolve(bankId, 'merge');
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 409,
      code: 'NO_DUPLICATE_PENDING',
    });
  });

  it('should_answer_404_when_the_transaction_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await resolve('00000000-0000-4000-8000-000000000000', 'merge');
    // Assert
    expect(response.statusCode).toBe(404);
  });

  it('should_answer_400_when_the_action_is_unknown', async () => {
    // Arrange
    const { bankId } = await insertPair();
    // Act
    const response = await resolve(bankId, 'delete_everything');
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_clear_the_mark_by_itself_when_the_manual_transaction_is_deleted', async () => {
    // Arrange
    const { manualId, bankId } = await insertPair();
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `${TRANSACTIONS_URL}/${manualId}`,
    });
    // Assert
    expect({ statusCode: response.statusCode, marked: await markedAs(bankId) }).toEqual({
      statusCode: 204,
      marked: null,
    });
  });
});

describe('GET /api/v1/transactions (origem e duplicatas)', () => {
  async function listDescriptions(query: string): Promise<string[]> {
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?from=2026-11-01&to=2026-11-30&${query}`,
    });
    return response.json().items.map((item: { description: string }) => item.description);
  }

  beforeEach(async () => {
    const manualId = await insertManual({ description: 'manual' });
    await insertTransaction({ description: 'banco duplicado', possibleDuplicateOfId: manualId });
    await insertTransaction({ description: 'banco normal' });
  });

  it('should_return_only_manual_transactions_when_source_is_manual', async () => {
    // Arrange
    // Act
    const descriptions = await listDescriptions('source=manual');
    // Assert
    expect(descriptions).toEqual(['manual']);
  });

  it('should_return_only_bank_transactions_when_source_is_open_finance', async () => {
    // Arrange
    // Act
    const descriptions = await listDescriptions('source=open_finance');
    // Assert
    expect(descriptions.sort()).toEqual(['banco duplicado', 'banco normal']);
  });

  it('should_return_only_pending_duplicates_with_the_total_when_possible_duplicate_is_true', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?possibleDuplicate=true&limit=1`,
    });
    // Assert
    expect({
      descriptions: response.json().items.map((item: { description: string }) => item.description),
      total: response.json().pagination.total,
    }).toEqual({ descriptions: ['banco duplicado'], total: 1 });
  });

  it('should_return_the_manual_id_in_each_item_when_a_transaction_is_a_possible_duplicate', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?possibleDuplicate=true`,
    });
    // Assert
    const [manualRow] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.source, 'manual'));
    expect(response.json().items[0].possibleDuplicateOfId).toBe(manualRow?.id);
  });

  it('should_answer_400_when_the_source_is_unknown', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?source=whatever`,
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});
