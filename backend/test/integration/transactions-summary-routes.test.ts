import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertCategoryOfKind, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const SUMMARY_URL = '/api/v1/transactions/summary';
const LIST_URL = '/api/v1/transactions';
// 4 de novembro de 2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-04T15:00:00Z');

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  accountId = await insertAccountWith(database.db);
});

afterEach(async () => {
  await testApp.app.close();
});

async function insertTransaction(
  amountCents: number,
  overrides: Partial<typeof transactions.$inferInsert> = {},
): Promise<void> {
  await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { amountCents, ...overrides }));
}

async function getSummary(query = '') {
  const response = await testApp.app.inject({ method: 'GET', url: `${SUMMARY_URL}${query}` });
  return response.json();
}

async function getListTotal(query = ''): Promise<number> {
  const response = await testApp.app.inject({ method: 'GET', url: `${LIST_URL}${query}` });
  return response.json().pagination.total;
}

describe('GET /api/v1/transactions/summary', () => {
  it('should_sum_income_and_expense_of_the_current_month_when_no_filter_is_given', async () => {
    // Arrange
    await insertTransaction(850000);
    await insertTransaction(-300000);
    await insertTransaction(-121530);
    await insertTransaction(-9999, { date: '2026-10-31' });
    // Act
    const body = await getSummary();
    // Assert
    expect(body).toEqual({ incomeCents: 850000, expenseCents: 421530, count: 3 });
  });

  it('should_summarize_only_the_given_category_when_category_id_is_sent', async () => {
    // Arrange
    const transportId = await insertCategoryOfKind(database.db, 'expense', 'Transporte');
    await insertTransaction(-50000, { categoryId: transportId });
    await insertTransaction(-25000, { categoryId: transportId });
    await insertTransaction(-99000);
    // Act
    const body = await getSummary(`?categoryId=${transportId}`);
    // Assert
    expect(body).toEqual({ incomeCents: 0, expenseCents: 75000, count: 2 });
  });

  it('should_return_zero_income_and_expense_and_count_the_transfers_when_type_is_transfer', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Fatura');
    await insertTransaction(-120000, { categoryId: transferId });
    await insertTransaction(30000, { categoryId: transferId });
    await insertTransaction(-5000);
    // Act
    const body = await getSummary('?type=transfer');
    // Assert
    expect(body).toEqual({ incomeCents: 0, expenseCents: 0, count: 2 });
  });

  it('should_leave_transfers_out_of_income_and_expense_but_inside_the_count', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Fatura');
    await insertTransaction(-120000, { categoryId: transferId });
    await insertTransaction(-4000);
    // Act
    const body = await getSummary();
    // Assert
    expect(body).toEqual({ incomeCents: 0, expenseCents: 4000, count: 2 });
  });

  it('should_reduce_the_expense_and_keep_the_income_when_a_refund_is_in_an_expense_category', async () => {
    // Arrange
    const shoppingId = await insertCategoryOfKind(database.db, 'expense', 'Compras');
    await insertTransaction(-20000, { categoryId: shoppingId });
    await insertTransaction(5000, { categoryId: shoppingId });
    await insertTransaction(850000);
    // Act
    const body = await getSummary('?type=expense');
    // Assert
    expect(body).toEqual({ incomeCents: 0, expenseCents: 15000, count: 2 });
  });

  it('should_include_manual_and_pending_transactions_in_the_totals', async () => {
    // Arrange
    await insertTransaction(-1250, { source: 'manual' });
    await insertTransaction(-3000, { status: 'pending' });
    // Act
    const body = await getSummary();
    // Assert
    expect(body).toEqual({ incomeCents: 0, expenseCents: 4250, count: 2 });
  });

  it('should_find_the_term_without_accents_when_searching', async () => {
    // Arrange
    await insertTransaction(-7000, {
      description: 'COMPRA FARMÁCIA',
      descriptionNormalized: 'COMPRA FARMACIA',
    });
    await insertTransaction(-1000, { description: 'padaria', descriptionNormalized: 'PADARIA' });
    // Act
    const body = await getSummary('?search=farmacia');
    // Assert
    expect(body).toEqual({ incomeCents: 0, expenseCents: 7000, count: 1 });
  });

  it('should_return_zeros_when_the_filter_matches_nothing', async () => {
    // Arrange
    await insertTransaction(-1000, { date: '2026-09-10' });
    // Act
    const body = await getSummary();
    // Assert
    expect(body).toEqual({ incomeCents: 0, expenseCents: 0, count: 0 });
  });

  it('should_have_the_same_count_as_the_list_total_when_using_the_same_filters', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Fatura');
    await insertTransaction(-120000, { categoryId: transferId });
    await insertTransaction(500000);
    await insertTransaction(-2000, { source: 'manual' });
    const query = '?from=2026-11-01&to=2026-11-30&source=open_finance';
    // Act
    const [summary, listTotal] = await Promise.all([getSummary(query), getListTotal(query)]);
    // Assert
    expect(summary.count).toBe(listTotal);
  });

  it('should_match_the_month_income_and_expense_of_the_dashboard_when_no_other_filter_is_given', async () => {
    // Arrange
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Fatura');
    await insertTransaction(500000);
    await insertTransaction(-200000);
    await insertTransaction(-80000, { categoryId: transferId });
    await insertTransaction(-1250, { source: 'manual' });
    // Act
    const summary = await getSummary();
    const dashboard = (
      await testApp.app.inject({ method: 'GET', url: '/api/v1/dashboard' })
    ).json();
    // Assert
    expect({ incomeCents: summary.incomeCents, expenseCents: summary.expenseCents }).toEqual({
      incomeCents: dashboard.monthIncomeCents,
      expenseCents: dashboard.monthExpenseCents,
    });
  });

  it('should_answer_400_validation_error_when_from_is_after_to', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${SUMMARY_URL}?from=2026-11-10&to=2026-11-01`,
    });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('should_answer_400_validation_error_when_the_category_id_is_not_a_uuid', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: `${SUMMARY_URL}?categoryId=abc`,
    });
    // Assert
    expect({ statusCode: response.statusCode, code: response.json().error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});
