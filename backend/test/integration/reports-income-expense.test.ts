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

function monthOf(
  months: readonly { month: string }[],
  month: string,
): Record<string, unknown> | undefined {
  return months.find((item) => item.month === month);
}

describe('GET /api/v1/reports/income-expense', () => {
  it('should_leave_internal_transfers_out_of_income_and_expense', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Pagamento de fatura');
    await insertTransaction('2026-10-05', 500000);
    await insertTransaction('2026-10-06', -320000);
    await insertTransaction('2026-10-07', -100000, { categoryId: transferId });
    // Act
    const { body } = await getJson('/api/v1/reports/income-expense?from=2026-10&to=2026-10');
    // Assert
    expect(body.months).toEqual([
      { month: '2026-10', incomeCents: 500000, expenseCents: 320000, resultCents: 180000 },
    ]);
  });

  it('should_reduce_the_expense_and_keep_the_result_when_a_refund_is_in_an_expense_category', async () => {
    // Arrange
    const shoppingId = await insertCategoryOfKind(database.db, 'expense', 'Compras');
    await insertTransaction('2026-10-05', 500000);
    await insertTransaction('2026-10-06', -320000, { categoryId: shoppingId });
    await insertTransaction('2026-10-07', 20000, { categoryId: shoppingId });
    // Act
    const { body } = await getJson('/api/v1/reports/income-expense?from=2026-10&to=2026-10');
    // Assert
    expect(body.months).toEqual([
      { month: '2026-10', incomeCents: 500000, expenseCents: 300000, resultCents: 200000 },
    ]);
  });

  it('should_count_manual_and_pending_transactions_and_expenses_without_category', async () => {
    // Arrange
    await insertTransaction('2026-11-02', -1250, { source: 'manual' });
    await insertTransaction('2026-11-03', -3000, { status: 'pending' });
    await insertTransaction('2026-11-04', -4000, { categoryId: null });
    // Act
    const { body } = await getJson('/api/v1/reports/income-expense?from=2026-11&to=2026-11');
    // Assert
    expect(body.totals).toEqual({ incomeCents: 0, expenseCents: 8250, resultCents: -8250 });
  });

  it('should_return_zeros_for_a_month_without_movement_inside_the_period', async () => {
    // Arrange
    await insertTransaction('2026-07-10', 100000);
    await insertTransaction('2026-09-10', 200000);
    // Act
    const { body } = await getJson('/api/v1/reports/income-expense?from=2026-07&to=2026-09');
    // Assert
    expect(monthOf(body.months, '2026-08')).toEqual({
      month: '2026-08',
      incomeCents: 0,
      expenseCents: 0,
      resultCents: 0,
    });
  });

  it('should_start_at_the_month_of_the_first_transaction_when_the_period_begins_before_it', async () => {
    // Arrange
    await insertTransaction('2026-06-20', 100000);
    // Act
    const { body } = await getJson('/api/v1/reports/income-expense?from=2024-12&to=2026-11');
    // Assert
    expect({ first: body.months[0].month, count: body.months.length }).toEqual({
      first: '2026-06',
      count: 6,
    });
  });

  it('should_return_no_months_and_zero_totals_when_there_is_no_transaction', async () => {
    // Arrange
    // Act
    const { body } = await getJson('/api/v1/reports/income-expense');
    // Assert
    expect({ months: body.months, totals: body.totals }).toEqual({
      months: [],
      totals: { incomeCents: 0, expenseCents: 0, resultCents: 0 },
    });
  });

  it('should_use_the_twelve_months_ending_at_the_current_month_when_no_range_is_given', async () => {
    // Arrange
    await insertTransaction('2020-01-10', 100);
    // Act
    const { body } = await getJson('/api/v1/reports/income-expense');
    // Assert
    expect({ from: body.from, to: body.to, count: body.months.length }).toEqual({
      from: '2025-12',
      to: '2026-11',
      count: 12,
    });
  });

  it('should_match_the_month_numbers_of_the_dashboard', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Transferência');
    await insertTransaction('2026-10-05', 500000);
    await insertTransaction('2026-10-06', -320000, { source: 'manual' });
    await insertTransaction('2026-10-07', -90000, { status: 'pending' });
    await insertTransaction('2026-10-08', -100000, { categoryId: transferId });
    // Act
    const report = await getJson('/api/v1/reports/income-expense?from=2026-10&to=2026-10');
    const dashboard = await getJson('/api/v1/dashboard?month=2026-10');
    const dashboardMonth = monthOf(dashboard.body.incomeVsExpense, '2026-10');
    // Assert
    expect({
      incomeCents: report.body.months[0].incomeCents,
      expenseCents: report.body.months[0].expenseCents,
    }).toEqual({
      incomeCents: dashboardMonth?.incomeCents,
      expenseCents: dashboardMonth?.expenseCents,
    });
  });
});
