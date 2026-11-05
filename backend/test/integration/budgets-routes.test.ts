import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { budgets, categories, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  insertAccountWith,
  insertCategory,
  insertCategoryOfKind,
  transactionValues,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const NOVEMBER = '2026-11';
const NOVEMBER_FIRST_DAY = '2026-11-01';
const OCTOBER_FIRST_DAY = '2026-10-01';
// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');

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

async function insertLimit(categoryId: string, month: string, limitCents: number): Promise<void> {
  await database.db.insert(budgets).values({ categoryId, month, limitCents });
}

async function insertSpending(
  accountId: string,
  categoryId: string,
  amountCents: number,
  overrides: Partial<ReturnType<typeof transactionValues>> = {},
): Promise<void> {
  await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { categoryId, amountCents, ...overrides }));
}

async function getBudgets(query = `?month=${NOVEMBER}`) {
  const response = await testApp.app.inject({ method: 'GET', url: `/api/v1/budgets${query}` });
  return response.json();
}

describe('GET /api/v1/budgets', () => {
  it('should_return_limit_spent_percent_and_status_when_the_month_has_budgets', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    await insertSpending(accountId, categoryId, -82000);
    // Act
    const body = await getBudgets();
    // Assert
    expect(body).toMatchObject({
      month: NOVEMBER,
      items: [
        { categoryId, limitCents: 100000, spentCents: 82000, percent: 82, status: 'warning' },
      ],
      totals: { limitCents: 100000, spentCents: 82000 },
    });
  });

  it('should_return_empty_list_and_zero_totals_when_the_month_has_no_budgets', async () => {
    // Arrange
    // Act
    const body = await getBudgets();
    // Assert
    expect(body).toEqual({ month: NOVEMBER, items: [], totals: { limitCents: 0, spentCents: 0 } });
  });

  it('should_use_the_current_month_when_month_is_not_sent', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 50000);
    // Act
    const body = await getBudgets('');
    // Assert
    expect(body.month).toBe(NOVEMBER);
  });

  it('should_count_cash_spending_together_with_bank_spending_when_summing', async () => {
    // Arrange
    const bankAccountId = await insertAccountWith(database.db);
    const cashAccountId = await insertAccountWith(database.db, { type: 'cash', name: 'Dinheiro' });
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    await insertSpending(bankAccountId, categoryId, -30000);
    await insertSpending(cashAccountId, categoryId, -2500, { source: 'manual' });
    // Act
    const body = await getBudgets();
    // Assert
    expect(body.items[0].spentCents).toBe(32500);
  });

  it('should_count_pending_transactions_when_summing', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    await insertSpending(accountId, categoryId, -4000, { status: 'pending' });
    // Act
    const body = await getBudgets();
    // Assert
    expect(body.items[0].spentCents).toBe(4000);
  });

  it('should_reduce_the_spending_when_the_category_has_a_refund', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    await insertSpending(accountId, categoryId, -20000);
    await insertSpending(accountId, categoryId, 5000);
    // Act
    const body = await getBudgets();
    // Assert
    expect(body.items[0].spentCents).toBe(15000);
  });

  it('should_return_zero_spending_when_the_category_only_has_refunds', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    await insertSpending(accountId, categoryId, 3000);
    // Act
    const body = await getBudgets();
    // Assert
    expect(body.items[0].spentCents).toBe(0);
  });

  it('should_ignore_transactions_from_other_months_when_summing', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    await insertSpending(accountId, categoryId, -9000, { date: '2026-10-31' });
    await insertSpending(accountId, categoryId, -7000, { date: '2026-11-30' });
    await insertSpending(accountId, categoryId, -5000, { date: '2026-12-01' });
    // Act
    const body = await getBudgets();
    // Assert
    expect(body.items[0].spentCents).toBe(7000);
  });

  it('should_order_items_from_the_highest_percent_to_the_lowest_when_listing', async () => {
    // Arrange
    const accountId = await insertAccountWith(database.db);
    const lowUsageId = await insertCategory(database.db);
    const highUsageId = await insertCategory(database.db);
    await insertLimit(lowUsageId, NOVEMBER_FIRST_DAY, 100000);
    await insertLimit(highUsageId, NOVEMBER_FIRST_DAY, 10000);
    await insertSpending(accountId, lowUsageId, -20000);
    await insertSpending(accountId, highUsageId, -9000);
    // Act
    const body = await getBudgets();
    // Assert
    expect(body.items.map((item: { categoryId: string }) => item.categoryId)).toEqual([
      highUsageId,
      lowUsageId,
    ]);
  });

  it('should_reject_the_request_when_month_has_an_invalid_format', async () => {
    // Arrange
    // Act
    const response = await testApp.app.inject({
      method: 'GET',
      url: '/api/v1/budgets?month=2026-13',
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('PUT /api/v1/budgets/:categoryId', () => {
  async function putLimit(categoryId: string, limitCents: unknown) {
    return testApp.app.inject({
      method: 'PUT',
      url: `/api/v1/budgets/${categoryId}?month=${NOVEMBER}`,
      payload: { limitCents },
    });
  }

  it('should_create_the_limit_when_the_category_has_none_in_the_month', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    // Act
    const response = await putLimit(categoryId, 120000);
    // Assert
    expect(response.json()).toMatchObject({ categoryId, limitCents: 120000, spentCents: 0 });
  });

  it('should_update_the_limit_without_creating_another_budget_when_it_already_exists', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    // Act
    await putLimit(categoryId, 120000);
    // Assert
    const body = await getBudgets();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].limitCents).toBe(120000);
  });

  it('should_reject_with_validation_error_when_the_category_is_income', async () => {
    // Arrange
    const incomeCategoryId = await insertCategoryOfKind(database.db, 'income', 'Salário');
    // Act
    const response = await putLimit(incomeCategoryId, 100000);
    // Assert
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should_reject_with_validation_error_when_the_category_is_archived', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await database.db.update(categories).set({ isArchived: true });
    // Act
    const response = await putLimit(categoryId, 100000);
    // Assert
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should_reject_with_not_found_when_the_category_does_not_exist', async () => {
    // Arrange
    const unknownCategoryId = crypto.randomUUID();
    // Act
    const response = await putLimit(unknownCategoryId, 100000);
    // Assert
    expect(response.statusCode).toBe(404);
  });

  it.each([0, -100, 10.5])('should_reject_the_limit_when_it_is_%s', async (limitCents) => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    // Act
    const response = await putLimit(categoryId, limitCents);
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('DELETE /api/v1/budgets/:categoryId', () => {
  it('should_remove_the_limit_when_it_exists', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 100000);
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/budgets/${categoryId}?month=${NOVEMBER}`,
    });
    // Assert
    expect(response.statusCode).toBe(204);
    expect((await getBudgets()).items).toEqual([]);
  });

  it('should_return_not_found_when_the_category_has_no_limit_in_the_month', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    // Act
    const response = await testApp.app.inject({
      method: 'DELETE',
      url: `/api/v1/budgets/${categoryId}?month=${NOVEMBER}`,
    });
    // Assert
    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/v1/budgets/copy-previous', () => {
  async function copyPrevious() {
    return testApp.app.inject({
      method: 'POST',
      url: `/api/v1/budgets/copy-previous?month=${NOVEMBER}`,
    });
  }

  it('should_copy_all_limits_when_the_new_month_has_none', async () => {
    // Arrange
    for (let count = 0; count < 5; count += 1) {
      await insertLimit(await insertCategory(database.db), OCTOBER_FIRST_DAY, 10000 + count);
    }
    // Act
    const response = await copyPrevious();
    // Assert
    expect(response.json()).toEqual({ copied: 5 });
    expect((await getBudgets()).items).toHaveLength(5);
  });

  it('should_keep_the_existing_limit_when_the_category_already_has_one_in_the_month', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, OCTOBER_FIRST_DAY, 100000);
    await insertLimit(categoryId, NOVEMBER_FIRST_DAY, 250000);
    // Act
    const response = await copyPrevious();
    // Assert
    expect(response.json()).toEqual({ copied: 0 });
    expect((await getBudgets()).items[0].limitCents).toBe(250000);
  });

  it('should_skip_archived_categories_when_copying', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, OCTOBER_FIRST_DAY, 100000);
    await database.db.update(categories).set({ isArchived: true });
    // Act
    const response = await copyPrevious();
    // Assert
    expect(response.json()).toEqual({ copied: 0 });
  });

  it('should_copy_from_december_when_the_target_is_january', async () => {
    // Arrange
    const categoryId = await insertCategory(database.db);
    await insertLimit(categoryId, '2025-12-01', 70000);
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/budgets/copy-previous?month=2026-01',
    });
    // Assert
    expect(response.json()).toEqual({ copied: 1 });
  });
});
