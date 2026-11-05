import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { categories, categoryRules, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { buildSyncHarness, runSync } from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TRANSACTIONS_URL = '/api/v1/transactions';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
// 4 de novembro de 2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-04T15:00:00Z');

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
    .values(transactionValues(accountId, overrides))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: transação não foi criada');
  return row.id;
}

interface ListedTransaction {
  id: string;
  description: string;
  date: string;
}

async function listDescriptions(query: string): Promise<string[]> {
  const response = await testApp.app.inject({ method: 'GET', url: `${TRANSACTIONS_URL}${query}` });
  return response.json().items.map((item: ListedTransaction) => item.description);
}

describe('GET /api/v1/transactions', () => {
  it('should_return_only_the_current_month_with_limit_50_when_no_filter_is_given', async () => {
    // Arrange
    await insertTransaction({ date: '2026-11-01', description: 'primeiro dia' });
    await insertTransaction({ date: '2026-11-30', description: 'último dia' });
    await insertTransaction({ date: '2026-10-31', description: 'mês passado' });
    await insertTransaction({ date: '2026-12-01', description: 'mês que vem' });
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: TRANSACTIONS_URL });
    // Assert
    expect({
      descriptions: response.json().items.map((item: ListedTransaction) => item.description),
      pagination: response.json().pagination,
    }).toEqual({
      descriptions: ['último dia', 'primeiro dia'],
      pagination: { page: 1, limit: 50, total: 2 },
    });
  });

  it('should_answer_400_validation_error_when_limit_is_above_the_maximum', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?limit=500`,
    });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('should_answer_400_validation_error_when_from_is_after_to', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}?from=2026-11-10&to=2026-11-01`,
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_filter_by_the_given_period_when_from_and_to_are_sent', async () => {
    // Arrange
    await insertTransaction({ date: '2026-09-15', description: 'setembro' });
    await insertTransaction({ date: '2026-10-15', description: 'outubro' });
    // Act
    const descriptions = await listDescriptions('?from=2026-09-01&to=2026-09-30');
    // Assert
    expect(descriptions).toEqual(['setembro']);
  });

  it('should_filter_by_category_when_category_id_is_sent', async () => {
    // Arrange
    const groceries = await categoryIdOf('groceries');
    await insertTransaction({ description: 'mercado', categoryId: groceries });
    await insertTransaction({ description: 'outra coisa' });
    // Act
    const descriptions = await listDescriptions(`?categoryId=${groceries}`);
    // Assert
    expect(descriptions).toEqual(['mercado']);
  });

  it('should_filter_by_account_when_account_id_is_sent', async () => {
    // Arrange
    const otherAccountId = await insertAccount(database.db);
    await insertTransaction({ description: 'conta principal' });
    await insertTransaction({ description: 'outra conta' });
    await database.db
      .update(transactions)
      .set({ accountId: otherAccountId })
      .where(eq(transactions.description, 'outra conta'));
    // Act
    const descriptions = await listDescriptions(`?accountId=${otherAccountId}`);
    // Assert
    expect(descriptions).toEqual(['outra conta']);
  });

  it('should_find_the_term_without_accents_in_any_part_of_the_description_when_searching', async () => {
    // Arrange
    await insertTransaction({
      description: 'COMPRA FARMÁCIA SÃO JOÃO',
      descriptionNormalized: 'COMPRA FARMACIA SAO JOAO',
    });
    await insertTransaction({ description: 'padaria', descriptionNormalized: 'PADARIA' });
    // Act
    const descriptions = await listDescriptions('?search=farmacia');
    // Assert
    expect(descriptions).toEqual(['COMPRA FARMÁCIA SÃO JOÃO']);
  });

  it.each([
    { term: '%', description: 'DESCONTO 10% AVISTA' },
    { term: '_', description: 'PAG_LOJA' },
  ])('should_treat_$term_as_plain_text_when_searching', async ({ term, description }) => {
    // Arrange
    await insertTransaction({ description, descriptionNormalized: description });
    await insertTransaction({ description: 'sem curinga', descriptionNormalized: 'SEM CURINGA' });
    // Act
    const descriptions = await listDescriptions(`?search=${encodeURIComponent(term)}`);
    // Assert
    expect(descriptions).toEqual([description]);
  });

  describe('type filter', () => {
    beforeEach(async () => {
      const cardPayment = await categoryIdOf('credit_card_payment');
      const salary = await categoryIdOf('salary');
      await insertTransaction({ description: 'despesa sem categoria', amountCents: -1000 });
      await insertTransaction({ description: 'receita sem categoria', amountCents: 2000 });
      await insertTransaction({ description: 'salário', amountCents: 500000, categoryId: salary });
      await insertTransaction({
        description: 'pagamento da fatura',
        amountCents: -90000,
        categoryId: cardPayment,
      });
    });

    it('should_return_only_negative_non_transfer_transactions_when_type_is_expense', async () => {
      // Arrange
      // Act
      const descriptions = await listDescriptions('?type=expense');
      // Assert
      expect(descriptions).toEqual(['despesa sem categoria']);
    });

    it('should_return_only_positive_non_transfer_transactions_when_type_is_income', async () => {
      // Arrange
      // Act
      const descriptions = await listDescriptions('?type=income');
      // Assert
      expect(descriptions.sort()).toEqual(['receita sem categoria', 'salário']);
    });

    it('should_return_only_transfer_category_transactions_when_type_is_transfer', async () => {
      // Arrange
      // Act
      const descriptions = await listDescriptions('?type=transfer');
      // Assert
      expect(descriptions).toEqual(['pagamento da fatura']);
    });
  });

  it('should_order_by_date_then_by_most_recent_creation_when_listing', async () => {
    // Arrange
    await insertTransaction({ date: '2026-11-02', description: 'antiga' });
    await insertTransaction({ date: '2026-11-03', description: 'criada primeiro' });
    await insertTransaction({ date: '2026-11-03', description: 'criada depois' });
    // Act
    const descriptions = await listDescriptions('');
    // Assert
    expect(descriptions).toEqual(['criada depois', 'criada primeiro', 'antiga']);
  });

  it('should_paginate_without_repeating_items_when_page_and_limit_are_sent', async () => {
    // Arrange
    await insertTransaction({ date: '2026-11-03', description: 'a' });
    await insertTransaction({ date: '2026-11-02', description: 'b' });
    await insertTransaction({ date: '2026-11-01', description: 'c' });
    // Act
    const firstPage = await listDescriptions('?limit=2&page=1');
    const secondPage = await listDescriptions('?limit=2&page=2');
    // Assert
    expect({ firstPage, secondPage }).toEqual({ firstPage: ['a', 'b'], secondPage: ['c'] });
  });

  it('should_return_the_installment_the_category_and_the_account_without_raw_when_listing', async () => {
    // Arrange
    const groceries = await categoryIdOf('groceries');
    await insertTransaction({
      description: 'TV 3/10',
      categoryId: groceries,
      categorySource: 'rule',
      installmentNumber: 3,
      installmentTotal: 10,
      raw: { secret: 'do pluggy' },
    });
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: TRANSACTIONS_URL });
    // Assert
    expect(response.json().items[0]).toEqual({
      id: expect.any(String),
      date: '2026-11-03',
      description: 'TV 3/10',
      amountCents: -8990,
      status: 'posted',
      source: 'open_finance',
      category: { id: groceries, name: 'Mercado', icon: expect.any(String), kind: 'expense' },
      categorySource: 'rule',
      account: { id: accountId, name: 'Conta corrente', type: 'checking' },
      installmentNumber: 3,
      installmentTotal: 10,
    });
  });
});

describe('GET /api/v1/transactions/:id', () => {
  it('should_return_the_transaction_when_it_exists', async () => {
    // Arrange
    const transactionId = await insertTransaction({ description: 'detalhe' });
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}/${transactionId}`,
    });
    // Assert
    expect(response.json()).toMatchObject({ id: transactionId, description: 'detalhe' });
  });

  it('should_answer_404_not_found_when_the_transaction_does_not_exist', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${TRANSACTIONS_URL}/${UNKNOWN_ID}`,
    });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('PATCH /api/v1/transactions/:id', () => {
  function changeCategory(transactionId: string, body: Record<string, unknown>) {
    return testApp.app.inject({
      method: 'PATCH',
      url: `${TRANSACTIONS_URL}/${transactionId}`,
      payload: body,
    });
  }

  it('should_save_the_category_as_user_choice_without_creating_a_rule_when_apply_always_is_off', async () => {
    // Arrange
    const leisure = await categoryIdOf('leisure');
    const transactionId = await insertTransaction({ description: 'cinema' });
    // Act
    const response = await changeCategory(transactionId, { categoryId: leisure });
    // Assert
    expect({
      body: response.json().categorySource,
      category: response.json().category.name,
      ruleCount: (await database.db.select().from(categoryRules)).length,
    }).toEqual({ body: 'user', category: 'Lazer', ruleCount: 0 });
  });

  it('should_create_the_rule_and_recategorize_the_others_when_apply_always_is_on', async () => {
    // Arrange
    const groceries = await categoryIdOf('groceries');
    const corrected = await insertTransaction({
      description: 'PAG*JOSEDASILVA',
      descriptionNormalized: 'PAG*JOSEDASILVA',
    });
    const sameDescription = await insertTransaction({
      description: 'PAG*JOSEDASILVA',
      descriptionNormalized: 'PAG*JOSEDASILVA',
    });
    const chosenByUser = await insertTransaction({
      description: 'PAG*JOSEDASILVA',
      descriptionNormalized: 'PAG*JOSEDASILVA',
      categoryId: await categoryIdOf('leisure'),
      categorySource: 'user',
    });
    // Act
    await changeCategory(corrected, { categoryId: groceries, applyAlways: true });
    // Assert
    const rows = await database.db.select().from(transactions);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect({
      corrected: [byId.get(corrected)?.categoryId, byId.get(corrected)?.categorySource],
      other: [byId.get(sameDescription)?.categoryId, byId.get(sameDescription)?.categorySource],
      userChoice: byId.get(chosenByUser)?.categorySource,
      rules: (await database.db.select().from(categoryRules)).map((rule) => [
        rule.pattern,
        rule.matchType,
        rule.categoryId,
      ]),
    }).toEqual({
      corrected: [groceries, 'user'],
      other: [groceries, 'rule'],
      userChoice: 'user',
      rules: [['PAG*JOSEDASILVA', 'equals', groceries]],
    });
  });

  it('should_keep_the_chosen_category_when_a_sync_runs_afterwards', async () => {
    // Arrange
    const leisure = await categoryIdOf('leisure');
    const harness = buildSyncHarness({ database });
    await runSync(harness.syncService);
    const [synced] = await database.db.select().from(transactions).limit(1);
    if (!synced) throw new Error('Teste: a sincronização não trouxe transações');
    await changeCategory(synced.id, { categoryId: leisure });
    // Act
    await runSync(harness.syncService);
    // Assert
    const [after] = await database.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, synced.id));
    expect([after?.categoryId, after?.categorySource]).toEqual([leisure, 'user']);
  });

  it('should_answer_400_validation_error_when_the_category_is_archived', async () => {
    // Arrange
    const leisure = await categoryIdOf('leisure');
    await database.db
      .update(categories)
      .set({ isArchived: true })
      .where(eq(categories.id, leisure));
    const transactionId = await insertTransaction();
    // Act
    const response = await changeCategory(transactionId, { categoryId: leisure });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('should_answer_404_not_found_when_the_transaction_does_not_exist', async () => {
    // Arrange
    const leisure = await categoryIdOf('leisure');
    // Act
    const response = await changeCategory(UNKNOWN_ID, { categoryId: leisure });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});
