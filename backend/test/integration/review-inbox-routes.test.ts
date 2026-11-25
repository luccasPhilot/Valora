import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accounts, categories, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { archiveConnection, insertConnection, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TRANSACTIONS_URL = '/api/v1/transactions';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
// 4 de novembro de 2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-04T15:00:00Z');
const BEFORE_NOW = new Date('2026-11-04T14:00:00Z');
const AFTER_NOW = new Date('2026-11-04T15:05:00Z');

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let connectionId: string;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  await testApp.categorySeedService.run();
  connectionId = await insertConnection(database.db);
  const [account] = await database.db
    .insert(accounts)
    .values({ connectionId, type: 'checking', name: 'Conta corrente' })
    .returning({ id: accounts.id });
  if (!account) throw new Error('Teste: conta não foi criada');
  accountId = account.id;
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
    .values(transactionValues(accountId, { createdAt: BEFORE_NOW, ...overrides }))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: transação não foi criada');
  return row.id;
}

async function isReviewed(transactionId: string): Promise<boolean> {
  const [row] = await database.db
    .select({ reviewedAt: transactions.reviewedAt })
    .from(transactions)
    .where(eq(transactions.id, transactionId));
  return row?.reviewedAt != null;
}

async function inboxDescriptions(): Promise<string[]> {
  const response = await testApp.app.inject({
    method: 'GET',
    url: `${TRANSACTIONS_URL}?reviewed=false`,
  });
  return response.json().items.map((item: { description: string }) => item.description);
}

async function reviewCount(): Promise<number> {
  const response = await testApp.app.inject({
    method: 'GET',
    url: `${TRANSACTIONS_URL}/review-count`,
  });
  return response.json().count;
}

describe('quem grava a revisão', () => {
  it('should_create_the_manual_transaction_already_reviewed', async () => {
    // Arrange
    await testApp.accountsService.ensureCashAccount();
    const [cash] = await database.db.select().from(accounts).where(eq(accounts.type, 'cash'));
    if (!cash) throw new Error('Teste: conta "Dinheiro" não existe');
    // Act
    const created = await testApp.app.inject({
      method: 'POST',
      url: TRANSACTIONS_URL,
      payload: {
        type: 'expense',
        amountCents: 1500,
        description: 'Pão',
        date: '2026-11-04',
        categoryId: await categoryIdOf('groceries'),
        accountId: cash.id,
      },
    });
    // Assert
    expect(await isReviewed(created.json().id)).toBe(true);
  });

  it('should_mark_as_reviewed_when_the_category_of_a_bank_transaction_changes', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    await testApp.app.inject({
      method: 'PATCH',
      url: `${TRANSACTIONS_URL}/${transactionId}`,
      payload: { categoryId: await categoryIdOf('groceries') },
    });
    // Assert
    expect(await isReviewed(transactionId)).toBe(true);
  });
});

describe('GET /api/v1/transactions?reviewed=false', () => {
  it('should_list_only_unreviewed_transactions_oldest_first_from_any_month', async () => {
    // Arrange
    await insertTransaction({ date: '2026-11-03', description: 'novembro' });
    await insertTransaction({ date: '2026-08-10', description: 'agosto' });
    await insertTransaction({ date: '2026-10-01', description: 'revisada', reviewedAt: NOW });
    // Act
    const descriptions = await inboxDescriptions();
    // Assert
    expect(descriptions).toEqual(['agosto', 'novembro']);
  });

  it('should_leave_out_transactions_of_an_archived_bank', async () => {
    // Arrange
    await insertTransaction({ description: 'do banco arquivado' });
    await archiveConnection(database.db, connectionId, '2026-11-02T12:00:00Z');
    // Act
    const descriptions = await inboxDescriptions();
    // Assert
    expect(descriptions).toEqual([]);
  });

  it('should_return_the_server_instant_as_loaded_at', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?reviewed=false`,
    });
    // Assert
    expect(response.json().loadedAt).toBe(NOW.toISOString());
  });
});

describe('GET /api/v1/transactions/review-count', () => {
  it('should_count_unreviewed_transactions_of_active_banks', async () => {
    // Arrange
    await insertTransaction();
    await insertTransaction({ date: '2026-07-01' });
    await insertTransaction({ reviewedAt: NOW });
    // Act
    const count = await reviewCount();
    // Assert
    expect(count).toBe(2);
  });

  it('should_drop_the_count_when_the_bank_is_archived', async () => {
    // Arrange
    await insertTransaction();
    await archiveConnection(database.db, connectionId, '2026-11-02T12:00:00Z');
    // Act
    const count = await reviewCount();
    // Assert
    expect(count).toBe(0);
  });
});

describe('POST /api/v1/transactions/review', () => {
  async function review(transactionIds: string[]) {
    return testApp.app.inject({
      method: 'POST',
      url: `${TRANSACTIONS_URL}/review`,
      payload: { transactionIds },
    });
  }

  it('should_mark_the_transactions_and_return_how_many_changed', async () => {
    // Arrange
    const first = await insertTransaction();
    const second = await insertTransaction();
    // Act
    const response = await review([first, second]);
    // Assert
    expect({ body: response.json(), count: await reviewCount() }).toEqual({
      body: { reviewedCount: 2 },
      count: 0,
    });
  });

  it('should_return_zero_when_the_same_request_is_sent_twice', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    await review([transactionId]);
    // Act
    const response = await review([transactionId]);
    // Assert
    expect(response.json()).toEqual({ reviewedCount: 0 });
  });

  it('should_ignore_ids_that_do_not_exist', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    const response = await review([transactionId, UNKNOWN_ID]);
    // Assert
    expect(response.json()).toEqual({ reviewedCount: 1 });
  });

  it('should_keep_the_possible_duplicate_mark_when_reviewing', async () => {
    // Arrange
    const manualId = await insertTransaction({ source: 'manual', reviewedAt: NOW });
    const bankId = await insertTransaction({ possibleDuplicateOfId: manualId });
    // Act
    await review([bankId]);
    // Assert
    const [row] = await database.db.select().from(transactions).where(eq(transactions.id, bankId));
    expect(row?.possibleDuplicateOfId).toBe(manualId);
  });

  it('should_answer_400_with_transaction_ids_in_details_when_there_are_101_ids', async () => {
    // Arrange
    const transactionIds = Array.from({ length: 101 }, () => crypto.randomUUID());
    // Act
    const response = await review(transactionIds);
    // Assert
    expect({
      statusCode: response.statusCode,
      code: response.json().error.code,
      fields: response.json().error.details.map((detail: { field: string }) => detail.field),
    }).toEqual({ statusCode: 400, code: 'VALIDATION_ERROR', fields: ['transactionIds'] });
  });

  it('should_answer_400_when_the_list_is_empty', async () => {
    // Arrange
    // Act
    const response = await review([]);
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /api/v1/transactions/review-all', () => {
  async function reviewAll(until: string) {
    return testApp.app.inject({
      method: 'POST',
      url: `${TRANSACTIONS_URL}/review-all`,
      payload: { until },
    });
  }

  it('should_mark_only_what_existed_when_the_list_was_loaded', async () => {
    // Arrange
    const loaded = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?reviewed=false`,
    });
    await insertTransaction({ description: 'na tela' });
    await insertTransaction({ description: 'chegou depois', createdAt: AFTER_NOW });
    // Act
    const response = await reviewAll(loaded.json().loadedAt);
    // Assert
    expect({ body: response.json(), inbox: await inboxDescriptions() }).toEqual({
      body: { reviewedCount: 1 },
      inbox: ['chegou depois'],
    });
  });

  it('should_not_mark_transactions_of_an_archived_bank', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    await archiveConnection(database.db, connectionId, '2026-11-02T12:00:00Z');
    // Act
    await reviewAll(NOW.toISOString());
    // Assert
    expect(await isReviewed(transactionId)).toBe(false);
  });

  it('should_answer_400_validation_error_when_until_is_in_the_future', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    const response = await reviewAll(AFTER_NOW.toISOString());
    // Assert
    expect({
      statusCode: response.statusCode,
      code: response.json().error.code,
      isReviewed: await isReviewed(transactionId),
    }).toEqual({ statusCode: 400, code: 'VALIDATION_ERROR', isReviewed: false });
  });

  it('should_return_zero_when_repeated', async () => {
    // Arrange
    await insertTransaction();
    await reviewAll(NOW.toISOString());
    // Act
    const response = await reviewAll(NOW.toISOString());
    // Assert
    expect(response.json()).toEqual({ reviewedCount: 0 });
  });
});
