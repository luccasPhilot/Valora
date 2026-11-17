import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { budgets, categories, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertCategoryOfKind, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 14h em São Paulo, 17 de novembro de 2026.
const NOW = new Date('2026-11-17T17:00:00Z');
const INSIGHTS_URL = '/api/v1/category-insights';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  accountId = await insertAccountWith(database.db, { balanceCents: 0 });
});

afterEach(async () => {
  await testApp.app.close();
});

async function insertTransaction(
  date: string,
  amountCents: number,
  overrides: Partial<ReturnType<typeof transactionValues>> = {},
): Promise<void> {
  await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { date, amountCents, ...overrides }));
}

async function getJson(url: string) {
  const response = await testApp.app.inject({ method: 'GET', url });
  return { statusCode: response.statusCode, body: response.json() };
}

interface CategoryBody {
  readonly name: string;
  readonly kind: string;
  readonly spentCents: number;
  readonly budget: { status: string } | null;
}

function categoryNamed(categories: readonly CategoryBody[], name: string) {
  return categories.find((category) => category.name === name);
}

describe('GET /api/v1/category-insights', () => {
  it('should_match_the_total_of_the_category_report_for_the_same_month', async () => {
    // Arrange
    const marketId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    const leisureId = await insertCategoryOfKind(database.db, 'expense', 'Lazer');
    await insertTransaction('2026-10-05', -200000, { categoryId: marketId });
    await insertTransaction('2026-10-06', -80000, { categoryId: leisureId, source: 'manual' });
    await insertTransaction('2026-10-07', -40000, { categoryId: null, status: 'pending' });
    // Act
    const insights = await getJson(`${INSIGHTS_URL}?month=2026-10`);
    const report = await getJson('/api/v1/reports/category-spending?from=2026-10&to=2026-10');
    // Assert
    expect(insights.body.totals.spentCents).toBe(report.body.totals.totalCents);
  });

  it('should_leave_transfers_and_income_out_and_name_uncategorized_spending', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Pagamento de fatura');
    const salaryId = await insertCategoryOfKind(database.db, 'income', 'Salário');
    const marketId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    await insertTransaction('2026-10-05', -100000, { categoryId: transferId });
    await insertTransaction('2026-10-06', 500000, { categoryId: salaryId });
    await insertTransaction('2026-10-07', 300000, { categoryId: null });
    await insertTransaction('2026-10-08', -15000, { categoryId: null });
    await insertTransaction('2026-10-09', -50000, { categoryId: marketId });
    // Act
    const { body } = await getJson(`${INSIGHTS_URL}?month=2026-10`);
    // Assert
    expect(
      body.categories.map((category: CategoryBody) => [category.name, category.spentCents]),
    ).toEqual([
      ['Mercado', 50000],
      ['Sem categoria', 15000],
    ]);
  });

  it('should_reduce_the_category_spending_with_a_refund', async () => {
    // Arrange
    const shoppingId = await insertCategoryOfKind(database.db, 'expense', 'Compras');
    await insertTransaction('2026-10-05', -20000, { categoryId: shoppingId });
    await insertTransaction('2026-10-06', 5000, { categoryId: shoppingId });
    // Act
    const { body } = await getJson(`${INSIGHTS_URL}?month=2026-10`);
    // Assert
    expect(categoryNamed(body.categories, 'Compras')?.spentCents).toBe(15000);
  });

  it('should_keep_an_archived_category_that_has_spending_in_the_month', async () => {
    // Arrange
    const educationId = await insertCategoryOfKind(database.db, 'expense', 'Educação');
    await insertTransaction('2026-10-05', -20000, { categoryId: educationId });
    await database.db
      .update(categories)
      .set({ isArchived: true })
      .where(eq(categories.id, educationId));
    // Act
    const { body } = await getJson(`${INSIGHTS_URL}?month=2026-10`);
    // Assert
    expect(categoryNamed(body.categories, 'Educação')).toBeDefined();
  });

  it('should_attach_the_budget_status_of_the_month', async () => {
    // Arrange
    const leisureId = await insertCategoryOfKind(database.db, 'expense', 'Lazer');
    await insertTransaction('2026-11-05', -35000, { categoryId: leisureId });
    await database.db
      .insert(budgets)
      .values({ categoryId: leisureId, month: '2026-11-01', limitCents: 30000 });
    // Act
    const { body } = await getJson(INSIGHTS_URL);
    // Assert
    expect(categoryNamed(body.categories, 'Lazer')?.budget?.status).toBe('exceeded');
  });

  it('should_compare_with_the_same_stretch_of_the_previous_month_while_the_month_is_in_progress', async () => {
    // Arrange
    const marketId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    await insertTransaction('2026-10-10', -100000, { categoryId: marketId });
    await insertTransaction('2026-10-25', -200000, { categoryId: marketId });
    await insertTransaction('2026-11-10', -120000, { categoryId: marketId });
    // Act
    const { body } = await getJson(INSIGHTS_URL);
    // Assert
    expect(body.totals).toEqual({
      spentCents: 120000,
      previousSpentCents: 100000,
      variationPercent: 20,
      comparedThroughDay: 17,
    });
  });

  it('should_list_a_monthly_subscription_the_same_way_the_alert_detects_it', async () => {
    // Arrange
    for (const date of ['2026-08-05', '2026-09-04', '2026-10-05']) {
      await insertTransaction(date, -3990, {
        description: 'Streaming Exemplo',
        descriptionNormalized: 'STREAMING EXEMPLO',
      });
    }
    // Act
    const { body } = await getJson(INSIGHTS_URL);
    // Assert
    expect(body.recurring).toMatchObject({
      items: [{ description: 'Streaming Exemplo', amountCents: 3990, chargesCount: 3 }],
      monthlyTotalCents: 3990,
      yearlyTotalCents: 47880,
    });
  });

  it('should_answer_200_with_empty_lists_when_the_month_has_no_spending', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getJson(`${INSIGHTS_URL}?month=2026-10`);
    // Assert
    expect({ statusCode, categories: body.categories, attention: body.attention }).toEqual({
      statusCode: 200,
      categories: [],
      attention: [],
    });
  });

  it('should_answer_400_when_the_month_is_in_the_future', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getJson(`${INSIGHTS_URL}?month=2026-12`);
    // Assert
    expect({ statusCode, code: body.error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});
