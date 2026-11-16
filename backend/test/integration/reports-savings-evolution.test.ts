import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertCategoryOfKind, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const SAVINGS_URL = '/api/v1/reports/savings-evolution';

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

describe('GET /api/v1/reports/savings-evolution', () => {
  it('should_return_result_and_rate_of_a_month_with_income_and_expense', async () => {
    // Arrange
    await insertTransaction('2026-10-05', 500000);
    await insertTransaction('2026-10-10', -350000);
    // Act
    const { body } = await getJson(`${SAVINGS_URL}?from=2026-10&to=2026-10`);
    // Assert
    expect(body.months).toEqual([
      {
        month: '2026-10',
        incomeCents: 500000,
        expenseCents: 350000,
        resultCents: 150000,
        savingsRatePercent: 30,
        cumulativeResultCents: 150000,
      },
    ]);
  });

  it('should_return_a_null_rate_and_a_negative_result_for_a_month_with_only_expenses', async () => {
    // Arrange
    await insertTransaction('2026-10-10', -80000);
    // Act
    const { body } = await getJson(`${SAVINGS_URL}?from=2026-10&to=2026-10`);
    // Assert
    expect(monthOf(body.months, '2026-10')).toMatchObject({
      resultCents: -80000,
      savingsRatePercent: null,
    });
  });

  it('should_return_zeros_and_a_null_rate_for_a_month_without_movement_inside_the_period', async () => {
    // Arrange
    await insertTransaction('2026-07-10', 100000);
    await insertTransaction('2026-09-10', 200000);
    // Act
    const { body } = await getJson(`${SAVINGS_URL}?from=2026-07&to=2026-09`);
    // Assert
    expect(monthOf(body.months, '2026-08')).toEqual({
      month: '2026-08',
      incomeCents: 0,
      expenseCents: 0,
      resultCents: 0,
      savingsRatePercent: null,
      cumulativeResultCents: 100000,
    });
  });

  it('should_leave_internal_transfers_out_of_income_and_expense', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Pagamento de fatura');
    await insertTransaction('2026-10-05', 500000);
    await insertTransaction('2026-10-07', -100000, { categoryId: transferId });
    // Act
    const { body } = await getJson(`${SAVINGS_URL}?from=2026-10&to=2026-10`);
    // Assert
    expect(body.totals).toMatchObject({ expenseCents: 0, resultCents: 500000 });
  });

  it('should_count_only_closed_months_with_a_surplus_and_leave_the_current_month_out', async () => {
    // Arrange
    await insertTransaction('2026-09-05', 100000);
    await insertTransaction('2026-10-05', 100000);
    await insertTransaction('2026-10-06', -150000);
    await insertTransaction('2026-11-05', 100000);
    // Act
    const { body } = await getJson(`${SAVINGS_URL}?from=2026-09&to=2026-11`);
    // Assert
    expect(body.totals).toMatchObject({ surplusMonths: 1, closedMonths: 2 });
  });

  it('should_match_the_month_numbers_of_the_dashboard_and_of_the_income_expense_report', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Transferência');
    await insertTransaction('2026-10-05', 500000);
    await insertTransaction('2026-10-06', -320000, { source: 'manual' });
    await insertTransaction('2026-10-07', -90000, { status: 'pending' });
    await insertTransaction('2026-10-08', -100000, { categoryId: transferId });
    // Act
    const savings = await getJson(`${SAVINGS_URL}?from=2026-10&to=2026-10`);
    const history = await getJson('/api/v1/reports/income-expense?from=2026-10&to=2026-10');
    const dashboard = await getJson('/api/v1/dashboard?month=2026-10');
    const dashboardMonth = monthOf(dashboard.body.incomeVsExpense, '2026-10');
    // Assert
    expect({
      incomeCents: savings.body.months[0].incomeCents,
      expenseCents: savings.body.months[0].expenseCents,
      resultCents: savings.body.months[0].resultCents,
    }).toEqual({
      incomeCents: dashboardMonth?.incomeCents,
      expenseCents: dashboardMonth?.expenseCents,
      resultCents: history.body.months[0].resultCents,
    });
  });

  it('should_return_no_months_and_zero_totals_when_there_is_no_transaction', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getJson(SAVINGS_URL);
    // Assert
    expect({ statusCode, months: body.months, totals: body.totals }).toEqual({
      statusCode: 200,
      months: [],
      totals: {
        incomeCents: 0,
        expenseCents: 0,
        resultCents: 0,
        savingsRatePercent: null,
        surplusMonths: 0,
        closedMonths: 0,
      },
    });
  });
});
