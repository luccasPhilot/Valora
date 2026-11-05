import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { balanceSnapshots, budgets, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  insertAccountWith,
  insertCategory,
  insertCategoryOfKind,
  transactionValues,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const NOVEMBER = '2026-11';
// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
const TODAY = '2026-11-15';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
});

afterEach(async () => {
  await testApp.app.close();
});

async function getDashboard(query = '') {
  const response = await testApp.app.inject({ method: 'GET', url: `/api/v1/dashboard${query}` });
  return response.json();
}

async function getJson(url: string) {
  const response = await testApp.app.inject({ method: 'GET', url });
  return response.json();
}

async function insertTransaction(
  accountId: string,
  amountCents: number,
  overrides: Partial<ReturnType<typeof transactionValues>> = {},
): Promise<void> {
  await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { amountCents, ...overrides }));
}

async function insertSnapshot(accountId: string, date: string, balanceCents: number) {
  await database.db.insert(balanceSnapshots).values({ accountId, date, balanceCents });
}

describe('GET /api/v1/dashboard — saldo', () => {
  it('should_return_the_balance_change_since_the_first_snapshot_of_the_month', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db, { balanceCents: 485032 });
    await insertSnapshot(accountId, '2026-11-01', 400000);
    await insertSnapshot(accountId, '2026-11-10', 450000);
    // Act
    const body = await getDashboard(`?month=${NOVEMBER}`);
    // Assert
    expect(body.balanceChange).toEqual({ cents: 85032, percent: 21.26 });
  });

  it('should_return_total_balance_and_daily_sum_of_the_included_accounts_only', async () => {
    // Arrange
    const checkingId = await insertAccountWith(database.db, { balanceCents: 300000 });
    const savingsId = await insertAccountWith(database.db, {
      type: 'savings',
      name: 'Poupança',
      balanceCents: 100000,
    });
    const hiddenId = await insertAccountWith(database.db, {
      name: 'Oculta',
      balanceCents: 999900,
      isHidden: true,
    });
    const cardId = await insertAccountWith(database.db, {
      type: 'credit_card',
      name: 'Cartão',
      balanceCents: 50000,
    });
    for (const accountId of [checkingId, savingsId, hiddenId, cardId]) {
      await insertSnapshot(accountId, '2026-11-02', 1000);
    }
    // Act
    const body = await getDashboard();
    // Assert
    expect(body).toMatchObject({
      totalBalanceCents: 400000,
      balanceEvolution: [{ date: '2026-11-02', balanceCents: 2000 }],
    });
  });

  it('should_return_null_balance_change_when_the_only_snapshot_is_from_today', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db, { balanceCents: 485032 });
    await insertSnapshot(accountId, TODAY, 485032);
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.balanceChange).toBeNull();
  });

  it('should_return_null_balance_change_when_the_month_has_no_snapshots', async () => {
    // Arrange
    await insertAccountWith(database.db, { balanceCents: 100000 });
    // Act
    const body = await getDashboard();
    // Assert
    expect(body).toMatchObject({ balanceChange: null, balanceEvolution: [] });
  });

  it('should_return_zero_balance_when_there_are_no_accounts', async () => {
    // Arrange
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.totalBalanceCents).toBe(0);
  });
});

describe('GET /api/v1/dashboard — receitas e despesas', () => {
  it('should_leave_the_card_bill_payment_out_of_the_expenses', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const groceriesId = await insertCategory(database.db);
    const billPaymentId = await insertCategoryOfKind(
      database.db,
      'transfer',
      'Pagamento de fatura',
    );
    await insertTransaction(accountId, -200000, { categoryId: groceriesId });
    await insertTransaction(accountId, -150000, { categoryId: billPaymentId });
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.monthExpenseCents).toBe(200000);
  });

  it('should_include_manual_cash_and_pending_transactions_in_the_expenses', async () => {
    // Arrange
    const cashId = await insertAccountWith(database.db, { type: 'cash', name: 'Dinheiro' });
    const accountId = await insertAccountWith(database.db);
    await insertTransaction(cashId, -1250, { source: 'manual' });
    await insertTransaction(accountId, -3000, { status: 'pending' });
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.monthExpenseCents).toBe(4250);
  });

  it('should_sum_the_income_of_the_month_without_transfers', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const salaryId = await insertCategoryOfKind(database.db, 'income', 'Salário');
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Transferência');
    await insertTransaction(accountId, 500000, { categoryId: salaryId });
    await insertTransaction(accountId, 80000, { categoryId: transferId });
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.monthIncomeCents).toBe(500000);
  });

  it('should_return_six_months_in_order_with_zero_in_the_empty_ones', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    await insertTransaction(accountId, 100000, { date: '2026-06-10' });
    await insertTransaction(accountId, -4000, { date: '2026-10-05' });
    await insertTransaction(accountId, -9000, { date: '2026-05-31' });
    // Act
    const body = await getDashboard(`?month=${NOVEMBER}`);
    // Assert
    expect(body.incomeVsExpense).toEqual([
      { month: '2026-06', incomeCents: 100000, expenseCents: 0 },
      { month: '2026-07', incomeCents: 0, expenseCents: 0 },
      { month: '2026-08', incomeCents: 0, expenseCents: 0 },
      { month: '2026-09', incomeCents: 0, expenseCents: 0 },
      { month: '2026-10', incomeCents: 0, expenseCents: 4000 },
      { month: '2026-11', incomeCents: 0, expenseCents: 0 },
    ]);
  });

  it('should_cross_the_year_boundary_when_the_month_is_early_in_the_year', async () => {
    // Arrange
    // Act
    const body = await getDashboard('?month=2026-02');
    // Assert
    expect(body.incomeVsExpense.map(({ month }: { month: string }) => month)).toEqual([
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });
});

describe('GET /api/v1/dashboard — gastos por categoria', () => {
  async function insertSpendingInCategories(amountsCents: readonly number[]): Promise<void> {
    const accountId = await insertAccountWith(database.db);
    for (const [index, amountCents] of amountsCents.entries()) {
      const categoryId = await insertCategoryOfKind(database.db, 'expense', `Categoria ${index}`);
      await insertTransaction(accountId, -amountCents, { categoryId });
    }
  }

  it('should_list_the_five_largest_and_group_the_rest_in_others_when_there_are_eight', async () => {
    // Arrange
    await insertSpendingInCategories([80000, 70000, 60000, 50000, 40000, 30000, 20000, 10000]);
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.spendingByCategory.map(({ name }: { name: string }) => name)).toEqual([
      'Categoria 0',
      'Categoria 1',
      'Categoria 2',
      'Categoria 3',
      'Categoria 4',
      'Outros',
    ]);
  });

  it('should_sum_the_three_smallest_into_others_when_there_are_eight_categories', async () => {
    // Arrange
    await insertSpendingInCategories([80000, 70000, 60000, 50000, 40000, 30000, 20000, 10000]);
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.spendingByCategory.at(-1)).toEqual({
      kind: 'other',
      name: 'Outros',
      amountCents: 60000,
      percent: 17,
    });
  });

  it('should_list_only_the_three_categories_without_others_when_there_are_three', async () => {
    // Arrange
    await insertSpendingInCategories([30000, 20000, 10000]);
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.spendingByCategory).toHaveLength(3);
  });

  it('should_show_uncategorized_expenses_competing_for_the_top_five', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const categoryId = await insertCategory(database.db);
    await insertTransaction(accountId, -1000, { categoryId });
    await insertTransaction(accountId, -9000, { categoryId: null });
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.spendingByCategory[0]).toEqual({
      kind: 'uncategorized',
      name: 'Sem categoria',
      amountCents: 9000,
      percent: 90,
    });
  });

  it('should_leave_transfers_and_income_out_of_the_list', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const transferId = await insertCategoryOfKind(database.db, 'transfer', 'Pagamento de fatura');
    const salaryId = await insertCategoryOfKind(database.db, 'income', 'Salário');
    await insertTransaction(accountId, -150000, { categoryId: transferId });
    await insertTransaction(accountId, 500000, { categoryId: salaryId });
    await insertTransaction(accountId, 2000, { categoryId: null });
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.spendingByCategory).toEqual([]);
  });

  it('should_return_an_empty_list_when_the_month_has_no_expenses', async () => {
    // Arrange
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.spendingByCategory).toEqual([]);
  });
});

describe('GET /api/v1/dashboard — orçamentos e últimas transações', () => {
  it('should_return_the_three_budgets_closest_to_the_limit_when_there_are_four', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const spentCentsByPercent = [30, 95, 60, 120];
    for (const [index, percent] of spentCentsByPercent.entries()) {
      const categoryId = await insertCategoryOfKind(database.db, 'expense', `Orçada ${index}`);
      await database.db
        .insert(budgets)
        .values({ categoryId, month: '2026-11-01', limitCents: 10000 });
      await insertTransaction(accountId, -percent * 100, { categoryId });
    }
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.budgetsNearLimit.map(({ percent }: { percent: number }) => percent)).toEqual([
      120, 95, 60,
    ]);
  });

  it('should_return_an_empty_budget_list_when_the_month_has_no_budgets', async () => {
    // Arrange
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.budgetsNearLimit).toEqual([]);
  });

  it('should_return_the_five_latest_transactions_of_any_source_and_type', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    for (let day = 1; day <= 7; day += 1) {
      await insertTransaction(accountId, day % 2 === 0 ? 1000 : -1000, {
        date: `2026-10-${String(day).padStart(2, '0')}`,
        source: day === 7 ? 'manual' : 'open_finance',
      });
    }
    // Act
    const body = await getDashboard();
    // Assert
    expect(body.latestTransactions.map(({ date }: { date: string }) => date)).toEqual([
      '2026-10-07',
      '2026-10-06',
      '2026-10-05',
      '2026-10-04',
      '2026-10-03',
    ]);
  });
});

describe('GET /api/v1/dashboard — mesmos números das outras telas', () => {
  it('should_match_the_accounts_screen_total_and_the_budgets_screen_items', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db, { balanceCents: 123456 });
    const categoryId = await insertCategory(database.db);
    await database.db
      .insert(budgets)
      .values({ categoryId, month: '2026-11-01', limitCents: 50000 });
    await insertTransaction(accountId, -42000, { categoryId });
    // Act
    const dashboard = await getDashboard(`?month=${NOVEMBER}`);
    const accounts = await getJson('/api/v1/accounts');
    const budgetsOverview = await getJson(`/api/v1/budgets?month=${NOVEMBER}`);
    // Assert
    expect([dashboard.totalBalanceCents, dashboard.budgetsNearLimit]).toEqual([
      accounts.totals.totalBalanceCents,
      budgetsOverview.items,
    ]);
  });

  it('should_match_the_transactions_screen_when_filtering_by_type_and_month', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const billPaymentId = await insertCategoryOfKind(
      database.db,
      'transfer',
      'Pagamento de fatura',
    );
    await insertTransaction(accountId, -7000);
    await insertTransaction(accountId, -3000);
    await insertTransaction(accountId, -99000, { categoryId: billPaymentId });
    // Act
    const dashboard = await getDashboard(`?month=${NOVEMBER}`);
    const expenses = await getJson(
      '/api/v1/transactions?type=expense&from=2026-11-01&to=2026-11-30',
    );
    const listedExpenseCents = expenses.items.reduce(
      (sum: number, { amountCents }: { amountCents: number }) => sum - amountCents,
      0,
    );
    // Assert
    expect(dashboard.monthExpenseCents).toBe(listedExpenseCents);
  });
});

describe('GET /api/v1/dashboard — entrada', () => {
  it('should_reject_a_month_in_the_wrong_format', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: '/api/v1/dashboard?month=11-2026',
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});
