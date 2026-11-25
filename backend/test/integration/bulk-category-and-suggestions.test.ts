import { eq, inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { budgets, categories, categoryRules, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccount, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const TRANSACTIONS_URL = '/api/v1/transactions';
const SUGGESTIONS_URL = '/api/v1/category-rules/suggestions';
// 4 de novembro de 2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-04T15:00:00Z');
const UBER = 'UBER *TRIP';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let accountId: string;
let transportId: string;
let foodId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  await testApp.categorySeedService.run();
  accountId = await insertAccount(database.db);
  transportId = await categoryIdOf('transport');
  foodId = await categoryIdOf('food');
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

function insertUber(overrides: Partial<typeof transactions.$inferInsert> = {}): Promise<string> {
  return insertTransaction({
    description: 'Uber *trip',
    descriptionNormalized: UBER,
    ...overrides,
  });
}

async function changeInBulk(transactionIds: string[], categoryId: string) {
  return testApp.app.inject({
    method: 'PATCH',
    url: `${TRANSACTIONS_URL}/category`,
    payload: { transactionIds, categoryId },
  });
}

async function changeOne(transactionId: string, categoryId: string) {
  return testApp.app.inject({
    method: 'PATCH',
    url: `${TRANSACTIONS_URL}/${transactionId}`,
    payload: { categoryId },
  });
}

async function listSuggestionPatterns(): Promise<string[]> {
  const response = await testApp.app.inject({ method: 'GET', url: SUGGESTIONS_URL });
  return response.json().items.map((item: { pattern: string }) => item.pattern);
}

async function rowsOf(transactionIds: string[]) {
  return database.db
    .select({
      categoryId: transactions.categoryId,
      categorySource: transactions.categorySource,
      reviewedAt: transactions.reviewedAt,
    })
    .from(transactions)
    .where(inArray(transactions.id, transactionIds));
}

describe('PATCH /api/v1/transactions/category', () => {
  it('should_set_the_user_category_and_review_bank_and_manual_transactions', async () => {
    // Arrange
    const bankIds = await Promise.all(
      ['A', 'B', 'C'].map((letter) =>
        insertTransaction({ descriptionNormalized: `LOJA ${letter}` }),
      ),
    );
    const manualIds = await Promise.all(
      [1, 2].map(() => insertTransaction({ source: 'manual', categorySource: 'user' })),
    );
    const transactionIds = [...bankIds, ...manualIds];
    // Act
    const response = await changeInBulk(transactionIds, foodId);
    // Assert
    const rows = await rowsOf(transactionIds);
    expect({
      body: response.json(),
      rows: rows.map(({ categoryId, categorySource, reviewedAt }) => ({
        categoryId,
        categorySource,
        isReviewed: reviewedAt !== null,
      })),
    }).toEqual({
      body: { updatedCount: 5, ruleSuggestion: null },
      rows: Array.from({ length: 5 }, () => ({
        categoryId: foodId,
        categorySource: 'user',
        isReviewed: true,
      })),
    });
  });

  it('should_change_nothing_when_the_category_is_archived', async () => {
    // Arrange
    const transactionIds = await Promise.all([1, 2].map(() => insertTransaction()));
    await database.db.update(categories).set({ isArchived: true }).where(eq(categories.id, foodId));
    // Act
    const response = await changeInBulk(transactionIds, foodId);
    // Assert
    const rows = await rowsOf(transactionIds);
    expect({
      statusCode: response.statusCode,
      code: response.json().error.code,
      categoryIds: rows.map((row) => row.categoryId),
    }).toEqual({ statusCode: 400, code: 'VALIDATION_ERROR', categoryIds: [null, null] });
  });

  it('should_refuse_an_income_category_for_a_manual_expense', async () => {
    // Arrange
    const manualId = await insertTransaction({ source: 'manual', amountCents: -1000 });
    // Act
    const response = await changeInBulk([manualId], await categoryIdOf('salary'));
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_count_only_the_transactions_that_exist', async () => {
    // Arrange
    const transactionId = await insertTransaction();
    // Act
    const response = await changeInBulk([transactionId, crypto.randomUUID()], foodId);
    // Assert
    expect(response.json().updatedCount).toBe(1);
  });

  it('should_create_the_budget_alert_when_the_bulk_change_passes_eighty_percent', async () => {
    // Arrange
    await database.db
      .insert(budgets)
      .values({ categoryId: foodId, month: '2026-11-01', limitCents: 10_000 });
    const transactionIds = await Promise.all(
      [1, 2].map(() => insertTransaction({ amountCents: -4_250 })),
    );
    // Act
    await changeInBulk(transactionIds, foodId);
    // Assert
    const alerts = await testApp.app.inject({ method: 'GET', url: '/api/v1/alerts' });
    expect(alerts.json().items.map((alert: { type: string }) => alert.type)).toEqual([
      'budget_warning',
    ]);
  });
});

describe('GET /api/v1/category-rules/suggestions', () => {
  it('should_suggest_the_rule_when_two_bank_transactions_were_corrected', async () => {
    // Arrange
    await insertUber({ categoryId: transportId, categorySource: 'user' });
    await insertUber({ categoryId: transportId, categorySource: 'user' });
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: SUGGESTIONS_URL });
    // Assert
    expect(response.json()).toEqual({
      items: [
        {
          pattern: UBER,
          categoryId: transportId,
          categoryName: expect.any(String),
          categoryIcon: expect.any(String),
          correctionCount: 2,
        },
      ],
    });
  });

  it('should_not_suggest_when_the_corrections_are_manual', async () => {
    // Arrange
    await insertUber({ source: 'manual', categoryId: transportId, categorySource: 'user' });
    await insertUber({ source: 'manual', categoryId: transportId, categorySource: 'user' });
    // Act
    const patterns = await listSuggestionPatterns();
    // Assert
    expect(patterns).toEqual([]);
  });

  it('should_not_count_transactions_categorized_by_a_rule', async () => {
    // Arrange
    await insertUber({ categoryId: transportId, categorySource: 'user' });
    await insertUber({ categoryId: transportId, categorySource: 'pluggy' });
    // Act
    const patterns = await listSuggestionPatterns();
    // Assert
    expect(patterns).toEqual([]);
  });

  it('should_drop_the_suggestion_when_it_is_accepted', async () => {
    // Arrange
    await insertUber({ categoryId: transportId, categorySource: 'user' });
    await insertUber({ categoryId: transportId, categorySource: 'user' });
    const third = await insertUber();
    // Act
    await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/category-rules',
      payload: { pattern: UBER, matchType: 'equals', categoryId: transportId },
    });
    // Assert
    const [thirdRow] = await rowsOf([third]);
    expect({ patterns: await listSuggestionPatterns(), third: thirdRow?.categoryId }).toEqual({
      patterns: [],
      third: transportId,
    });
  });
});

describe('POST /api/v1/category-rules/suggestions/dismiss', () => {
  async function dismiss() {
    return testApp.app.inject({
      method: 'POST',
      url: `${SUGGESTIONS_URL}/dismiss`,
      payload: { pattern: UBER, categoryId: transportId },
    });
  }

  it('should_never_suggest_the_pair_again_after_a_third_correction', async () => {
    // Arrange
    await insertUber({ categoryId: transportId, categorySource: 'user' });
    await insertUber({ categoryId: transportId, categorySource: 'user' });
    await dismiss();
    const third = await insertUber();
    // Act
    const response = await changeOne(third, transportId);
    // Assert
    expect({
      ruleSuggestion: response.json().ruleSuggestion,
      patterns: await listSuggestionPatterns(),
    }).toEqual({ ruleSuggestion: null, patterns: [] });
  });

  it('should_answer_204_when_the_pair_is_dismissed_twice', async () => {
    // Arrange
    await dismiss();
    // Act
    const response = await dismiss();
    // Assert
    expect(response.statusCode).toBe(204);
  });
});

describe('ruleSuggestion depois de uma troca', () => {
  it('should_bring_the_suggestion_after_the_second_correction_of_the_description', async () => {
    // Arrange
    const first = await insertUber();
    const second = await insertUber();
    await changeOne(first, transportId);
    // Act
    const response = await changeOne(second, transportId);
    // Assert
    expect(response.json().ruleSuggestion).toMatchObject({
      pattern: UBER,
      categoryId: transportId,
      correctionCount: 2,
    });
  });

  it('should_bring_null_after_the_first_correction', async () => {
    // Arrange
    const first = await insertUber();
    // Act
    const response = await changeOne(first, transportId);
    // Assert
    expect(response.json().ruleSuggestion).toBeNull();
  });

  it('should_bring_the_suggestion_after_a_bulk_change', async () => {
    // Arrange
    const transactionIds = await Promise.all([1, 2].map(() => insertUber()));
    // Act
    const response = await changeInBulk(transactionIds, transportId);
    // Assert
    expect(response.json().ruleSuggestion).toMatchObject({ pattern: UBER, correctionCount: 2 });
  });

  it('should_not_learn_a_rule_by_itself', async () => {
    // Arrange
    const transactionIds = await Promise.all([1, 2].map(() => insertUber()));
    // Act
    await changeInBulk(transactionIds, transportId);
    // Assert
    expect(await database.db.$count(categoryRules)).toBe(0);
  });
});
