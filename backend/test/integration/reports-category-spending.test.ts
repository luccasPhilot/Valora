import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertCategoryOfKind, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');

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

const CATEGORY_SPENDING_URL = '/api/v1/reports/category-spending';

interface SeriesBody {
  readonly name: string;
  readonly kind: string;
  readonly totalCents: number;
  readonly monthlyCents: number[];
}

function seriesNamed(series: readonly SeriesBody[], name: string): SeriesBody | undefined {
  return series.find((item) => item.name === name);
}

describe('GET /api/v1/reports/category-spending', () => {
  it('should_match_the_month_spending_of_the_dashboard', async () => {
    // Arrange
    const marketId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    const leisureId = await insertCategoryOfKind(database.db, 'expense', 'Lazer');
    await insertTransaction('2026-10-05', -200000, { categoryId: marketId });
    await insertTransaction('2026-10-06', -80000, { categoryId: leisureId, source: 'manual' });
    await insertTransaction('2026-10-07', -40000, { categoryId: null, status: 'pending' });
    // Act
    const report = await getJson(`${CATEGORY_SPENDING_URL}?from=2026-10&to=2026-10`);
    const dashboard = await getJson('/api/v1/dashboard?month=2026-10');
    const dashboardTotalCents = dashboard.body.spendingByCategory.reduce(
      (sum: number, item: { amountCents: number }) => sum + item.amountCents,
      0,
    );
    // Assert
    expect(report.body.totals.monthlyCents).toEqual([dashboardTotalCents]);
  });

  it('should_leave_transfers_and_income_out_of_every_series', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Pagamento de fatura');
    const salaryId = await insertCategoryOfKind(database.db, 'income', 'Salário');
    const marketId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    await insertTransaction('2026-10-05', -100000, { categoryId: transferId });
    await insertTransaction('2026-10-06', 500000, { categoryId: salaryId });
    await insertTransaction('2026-10-07', 300000, { categoryId: null });
    await insertTransaction('2026-10-08', -10000, { categoryId: marketId });
    // Act
    const { body } = await getJson(`${CATEGORY_SPENDING_URL}?from=2026-10&to=2026-10`);
    // Assert
    expect(body.series.map((item: SeriesBody) => item.name)).toEqual(['Mercado']);
  });

  it('should_reduce_the_month_spending_with_a_refund_in_the_same_month', async () => {
    // Arrange
    const shoppingId = await insertCategoryOfKind(database.db, 'expense', 'Compras');
    await insertTransaction('2026-10-05', -20000, { categoryId: shoppingId });
    await insertTransaction('2026-10-20', 5000, { categoryId: shoppingId });
    // Act
    const { body } = await getJson(`${CATEGORY_SPENDING_URL}?from=2026-10&to=2026-10`);
    // Assert
    expect(seriesNamed(body.series, 'Compras')?.monthlyCents).toEqual([15000]);
  });

  it('should_not_let_a_refund_in_a_later_month_erase_the_original_spending', async () => {
    // Arrange
    const shoppingId = await insertCategoryOfKind(database.db, 'expense', 'Compras');
    await insertTransaction('2026-08-05', -20000, { categoryId: shoppingId });
    await insertTransaction('2026-10-20', 5000, { categoryId: shoppingId });
    // Act
    const { body } = await getJson(`${CATEGORY_SPENDING_URL}?from=2026-08&to=2026-10`);
    // Assert
    expect(seriesNamed(body.series, 'Compras')).toMatchObject({
      totalCents: 20000,
      monthlyCents: [20000, 0, 0],
    });
  });

  it('should_count_an_expense_without_category_as_uncategorized', async () => {
    // Arrange
    await insertTransaction('2026-10-05', -4000, { categoryId: null });
    // Act
    const { body } = await getJson(`${CATEGORY_SPENDING_URL}?from=2026-10&to=2026-10`);
    // Assert
    expect(body.series).toMatchObject([
      { kind: 'uncategorized', name: 'Sem categoria', categoryId: null, totalCents: 4000 },
    ]);
  });

  it('should_return_zero_for_a_month_without_spending_inside_the_period', async () => {
    // Arrange
    const marketId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    await insertTransaction('2026-07-10', -1000, { categoryId: marketId });
    await insertTransaction('2026-09-10', -2000, { categoryId: marketId });
    // Act
    const { body } = await getJson(`${CATEGORY_SPENDING_URL}?from=2026-07&to=2026-09`);
    // Assert
    expect(body.totals.monthlyCents).toEqual([1000, 0, 2000]);
  });

  it('should_return_no_series_when_there_is_no_spending', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getJson(CATEGORY_SPENDING_URL);
    // Assert
    expect({ statusCode, series: body.series, totalCents: body.totals.totalCents }).toEqual({
      statusCode: 200,
      series: [],
      totalCents: 0,
    });
  });
});
