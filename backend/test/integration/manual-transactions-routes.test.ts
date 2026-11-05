import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accounts, categories, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { buildSyncHarness, runSync } from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TRANSACTIONS_URL = '/api/v1/transactions';
// 4 de novembro de 2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-04T15:00:00Z');
const TODAY = '2026-11-04';
const TOMORROW = '2026-11-05';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let bankAccountId: string;
let cashAccountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  await testApp.categorySeedService.run();
  await testApp.accountsService.ensureCashAccount();
  bankAccountId = await insertAccount(database.db);
  const [cashAccount] = await database.db.select().from(accounts).where(eq(accounts.type, 'cash'));
  if (!cashAccount) throw new Error('Teste: a conta Dinheiro não foi criada');
  cashAccountId = cashAccount.id;
});

afterEach(async () => {
  await testApp.app.close();
});

async function categoryIdOf(seedKey: string): Promise<string> {
  const [row] = await database.db.select().from(categories).where(eq(categories.seedKey, seedKey));
  if (!row) throw new Error(`Teste: categoria ${seedKey} não existe`);
  return row.id;
}

async function expenseBody(overrides: Record<string, unknown> = {}) {
  return {
    type: 'expense',
    amountCents: 1250,
    description: 'Pastel',
    date: TODAY,
    categoryId: await categoryIdOf('food'),
    accountId: cashAccountId,
    ...overrides,
  };
}

function post(body: Record<string, unknown>) {
  return testApp.app.inject({ method: 'POST', url: TRANSACTIONS_URL, payload: body });
}

function patch(transactionId: string, body: Record<string, unknown>) {
  return testApp.app.inject({
    method: 'PATCH',
    url: `${TRANSACTIONS_URL}/${transactionId}`,
    payload: body,
  });
}

function remove(transactionId: string) {
  return testApp.app.inject({ method: 'DELETE', url: `${TRANSACTIONS_URL}/${transactionId}` });
}

async function createManualExpense(overrides: Record<string, unknown> = {}): Promise<string> {
  const response = await post(await expenseBody(overrides));
  return response.json().id;
}

async function insertOpenFinanceTransaction(): Promise<string> {
  const [row] = await database.db
    .insert(transactions)
    .values(transactionValues(bankAccountId, { pluggyTransactionId: 'pluggy-tx-1' }))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: transação não foi criada');
  return row.id;
}

function errorOf(response: { statusCode: number; json: () => { error: Record<string, unknown> } }) {
  const { code, details } = response.json().error;
  return { statusCode: response.statusCode, code, details };
}

describe('POST /api/v1/transactions', () => {
  it('should_save_a_negative_manual_expense_in_the_cash_account_when_the_body_is_valid', async () => {
    // Arrange
    // Act
    const response = await post(await expenseBody());
    // Assert
    const [stored] = await database.db.select().from(transactions);
    expect({
      statusCode: response.statusCode,
      stored: {
        amountCents: stored?.amountCents,
        source: stored?.source,
        status: stored?.status,
        categorySource: stored?.categorySource,
        pluggyTransactionId: stored?.pluggyTransactionId,
        raw: stored?.raw,
        descriptionNormalized: stored?.descriptionNormalized,
        accountId: stored?.accountId,
      },
    }).toEqual({
      statusCode: 201,
      stored: {
        amountCents: -1250,
        source: 'manual',
        status: 'posted',
        categorySource: 'user',
        pluggyTransactionId: null,
        raw: null,
        descriptionNormalized: 'PASTEL',
        accountId: cashAccountId,
      },
    });
  });

  it('should_save_a_positive_amount_when_the_type_is_income', async () => {
    // Arrange
    const body = await expenseBody({
      type: 'income',
      amountCents: 50000,
      categoryId: await categoryIdOf('salary'),
    });
    // Act
    const response = await post(body);
    // Assert
    expect(response.json()).toMatchObject({ amountCents: 50000, source: 'manual' });
  });

  it('should_save_the_transaction_in_the_connected_account_when_it_is_chosen', async () => {
    // Arrange
    const body = await expenseBody({ accountId: bankAccountId });
    // Act
    const response = await post(body);
    // Assert
    expect(response.json()).toMatchObject({
      source: 'manual',
      account: { id: bankAccountId, type: 'checking' },
    });
  });

  it('should_answer_400_pointing_at_date_when_the_date_is_tomorrow', async () => {
    // Arrange
    const body = await expenseBody({ date: TOMORROW });
    // Act
    const response = await post(body);
    // Assert
    expect(errorOf(response)).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'date' }],
    });
  });

  it('should_answer_400_pointing_at_category_id_when_an_expense_uses_an_income_category', async () => {
    // Arrange
    const body = await expenseBody({ categoryId: await categoryIdOf('salary') });
    // Act
    const response = await post(body);
    // Assert
    expect(errorOf(response)).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'categoryId' }],
    });
  });

  it('should_answer_400_pointing_at_category_id_when_the_category_is_a_transfer', async () => {
    // Arrange
    const body = await expenseBody({ categoryId: await categoryIdOf('account_transfer') });
    // Act
    const response = await post(body);
    // Assert
    expect(errorOf(response)).toMatchObject({
      statusCode: 400,
      details: [{ field: 'categoryId' }],
    });
  });

  it('should_answer_400_pointing_at_category_id_when_the_category_is_archived', async () => {
    // Arrange
    const food = await categoryIdOf('food');
    await database.db.update(categories).set({ isArchived: true }).where(eq(categories.id, food));
    // Act
    const response = await post(await expenseBody({ categoryId: food }));
    // Assert
    expect(errorOf(response)).toMatchObject({
      statusCode: 400,
      details: [{ field: 'categoryId' }],
    });
  });

  it('should_answer_400_pointing_at_amount_cents_when_the_amount_is_zero', async () => {
    // Arrange
    const body = await expenseBody({ amountCents: 0 });
    // Act
    const response = await post(body);
    // Assert
    expect(errorOf(response)).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'amountCents' }],
    });
  });

  it('should_answer_400_pointing_at_amount_cents_when_the_amount_has_decimals', async () => {
    // Arrange
    const body = await expenseBody({ amountCents: 12.5 });
    // Act
    const response = await post(body);
    // Assert
    expect(errorOf(response)).toMatchObject({
      statusCode: 400,
      details: [{ field: 'amountCents' }],
    });
  });

  it.each([
    { name: 'empty', description: '   ' },
    { name: 'longer_than_120_characters', description: 'a'.repeat(121) },
  ])(
    'should_answer_400_pointing_at_description_when_the_case_is_$name',
    async ({ description }) => {
      // Arrange
      const body = await expenseBody({ description });
      // Act
      const response = await post(body);
      // Assert
      expect(errorOf(response)).toMatchObject({
        statusCode: 400,
        details: [{ field: 'description' }],
      });
    },
  );

  it('should_answer_400_pointing_at_account_id_when_the_account_does_not_exist', async () => {
    // Arrange
    const body = await expenseBody({ accountId: '00000000-0000-4000-8000-000000000000' });
    // Act
    const response = await post(body);
    // Assert
    expect(errorOf(response)).toMatchObject({ statusCode: 400, details: [{ field: 'accountId' }] });
  });

  it('should_save_nothing_when_the_body_is_invalid', async () => {
    // Arrange
    const body = await expenseBody({ date: TOMORROW });
    // Act
    await post(body);
    // Assert
    expect(await database.db.$count(transactions)).toBe(0);
  });
});

describe('PATCH /api/v1/transactions/:id (manual)', () => {
  it('should_change_the_amount_keeping_the_negative_sign_when_the_value_is_corrected', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    // Act
    const response = await patch(transactionId, { amountCents: 1500 });
    // Assert
    expect(response.json()).toMatchObject({ amountCents: -1500 });
  });

  it('should_flip_the_sign_and_require_a_matching_category_when_the_type_changes', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    // Act
    const response = await patch(transactionId, { type: 'income' });
    // Assert
    expect(errorOf(response)).toMatchObject({
      statusCode: 400,
      details: [{ field: 'categoryId' }],
    });
  });

  it('should_change_type_and_category_together_when_both_are_sent', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    const salary = await categoryIdOf('salary');
    // Act
    const response = await patch(transactionId, { type: 'income', categoryId: salary });
    // Assert
    expect(response.json()).toMatchObject({ amountCents: 1250, category: { id: salary } });
  });

  it('should_change_description_date_and_account_and_refresh_the_normalized_description', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    // Act
    await patch(transactionId, {
      description: 'Café da Padaria',
      date: '2026-11-02',
      accountId: bankAccountId,
    });
    // Assert
    const [stored] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    expect(stored).toMatchObject({
      description: 'Café da Padaria',
      descriptionNormalized: 'CAFE DA PADARIA',
      date: '2026-11-02',
      accountId: bankAccountId,
    });
  });

  it('should_answer_400_pointing_at_date_when_the_new_date_is_in_the_future', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    // Act
    const response = await patch(transactionId, { date: TOMORROW });
    // Assert
    expect(errorOf(response)).toMatchObject({ statusCode: 400, details: [{ field: 'date' }] });
  });

  it('should_answer_400_when_the_body_has_no_field', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    // Act
    const response = await patch(transactionId, {});
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_not_reject_a_value_correction_when_the_current_category_was_archived_later', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    await database.db
      .update(categories)
      .set({ isArchived: true })
      .where(eq(categories.id, await categoryIdOf('food')));
    // Act
    const response = await patch(transactionId, { amountCents: 2000 });
    // Assert
    expect(response.statusCode).toBe(200);
  });
});

describe('PATCH /api/v1/transactions/:id (Open Finance)', () => {
  it.each([
    { field: 'amountCents', value: 100 },
    { field: 'description', value: 'Outra descrição' },
    { field: 'date', value: TODAY },
    { field: 'type', value: 'income' },
  ])(
    'should_answer_409_and_change_nothing_when_the_field_sent_is_$field',
    async ({ field, value }) => {
      // Arrange
      const transactionId = await insertOpenFinanceTransaction();
      const before = await database.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));
      // Act
      const response = await patch(transactionId, { [field]: value });
      // Assert
      const after = await database.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));
      expect({ error: errorOf(response), unchanged: after }).toMatchObject({
        error: { statusCode: 409, code: 'OPEN_FINANCE_READ_ONLY' },
        unchanged: before,
      });
    },
  );

  it('should_answer_409_when_the_category_comes_together_with_another_field', async () => {
    // Arrange
    const transactionId = await insertOpenFinanceTransaction();
    // Act
    const response = await patch(transactionId, {
      categoryId: await categoryIdOf('leisure'),
      amountCents: 100,
    });
    // Assert
    expect(errorOf(response)).toMatchObject({ statusCode: 409, code: 'OPEN_FINANCE_READ_ONLY' });
  });

  it('should_still_change_the_category_when_only_the_category_is_sent', async () => {
    // Arrange
    const transactionId = await insertOpenFinanceTransaction();
    const leisure = await categoryIdOf('leisure');
    // Act
    const response = await patch(transactionId, { categoryId: leisure });
    // Assert
    expect(response.json()).toMatchObject({ category: { id: leisure }, categorySource: 'user' });
  });
});

describe('DELETE /api/v1/transactions/:id', () => {
  it('should_answer_204_and_remove_the_transaction_when_it_is_manual', async () => {
    // Arrange
    const transactionId = await createManualExpense();
    // Act
    const response = await remove(transactionId);
    // Assert
    expect({
      statusCode: response.statusCode,
      total: await database.db.$count(transactions),
    }).toEqual({ statusCode: 204, total: 0 });
  });

  it('should_answer_409_and_keep_the_transaction_when_it_comes_from_open_finance', async () => {
    // Arrange
    const transactionId = await insertOpenFinanceTransaction();
    // Act
    const response = await remove(transactionId);
    // Assert
    expect({
      error: errorOf(response),
      total: await database.db.$count(transactions),
    }).toMatchObject({
      error: { statusCode: 409, code: 'OPEN_FINANCE_READ_ONLY' },
      total: 1,
    });
  });

  it('should_answer_404_when_the_transaction_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await remove('00000000-0000-4000-8000-000000000000');
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('sincronização e transações manuais', () => {
  it('should_keep_a_manual_transaction_in_a_connected_account_unchanged_when_a_sync_runs', async () => {
    // Arrange
    const harness = buildSyncHarness({ database });
    await runSync(harness.syncService);
    const [syncedAccount] = await database.db
      .select()
      .from(accounts)
      .where(eq(accounts.type, 'checking'));
    if (!syncedAccount) throw new Error('Teste: nenhuma conta corrente sincronizada');
    const created = await testApp.app.inject({
      method: 'POST',
      url: TRANSACTIONS_URL,
      payload: await expenseBody({ accountId: syncedAccount.id, date: '2026-11-03' }),
    });
    // Act
    await runSync(harness.syncService);
    // Assert
    const [stored] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, created.json().id));
    expect(stored).toMatchObject({ source: 'manual', amountCents: -1250, description: 'Pastel' });
  });
});
