import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { creditCardBills } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertCategoryOfKind, insertConnection } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 05/11/2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-05T15:00:00Z');
const CURRENT_MONTH = '2026-11';

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;
let expenseCategoryId: string;
let incomeCategoryId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
  expenseCategoryId = await insertCategoryOfKind(database.db, 'expense', 'Moradia');
  incomeCategoryId = await insertCategoryOfKind(database.db, 'income', 'Salário');
});

afterEach(async () => {
  await testApp.app.close();
});

async function getProjection() {
  const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/projection' });
  return { statusCode: response.statusCode, body: response.json() };
}

async function insertCheckingAccount(balanceCents: number) {
  const connectionId = await insertConnection(database.db);
  return insertAccountWith(database.db, { connectionId, type: 'checking', balanceCents });
}

async function insertCard(overrides: Parameters<typeof insertAccountWith>[1] = {}) {
  const connectionId = await insertConnection(database.db, { institutionName: 'Banco A' });
  return insertAccountWith(database.db, {
    connectionId,
    type: 'credit_card',
    name: 'Cartão Visa',
    balanceCents: 0,
    ...overrides,
  });
}

async function insertBill(
  accountId: string,
  dueDate: string,
  overrides: Partial<typeof creditCardBills.$inferInsert> = {},
) {
  await database.db.insert(creditCardBills).values({
    accountId,
    pluggyBillId: `bill-${accountId}-${dueDate}`,
    dueDate,
    totalCents: 200000,
    ...overrides,
  });
}

async function createEntry(overrides: Record<string, unknown>) {
  const response = await testApp.app.inject({
    method: 'POST',
    url: '/api/v1/planned-entries',
    payload: {
      description: 'Aluguel',
      type: 'expense',
      amountCents: 120000,
      categoryId: expenseCategoryId,
      dayOfMonth: 20,
      recurrence: 'monthly',
      startMonth: CURRENT_MONTH,
      ...overrides,
    },
  });
  return response.json();
}

describe('GET /api/v1/projection', () => {
  it('should_combine_balance_planned_entries_and_bills_when_everything_is_pending', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    await createEntry({
      description: 'Salário',
      type: 'income',
      amountCents: 300000,
      categoryId: incomeCategoryId,
      dayOfMonth: 15,
    });
    await createEntry({});
    const cardId = await insertCard();
    await insertBill(cardId, '2026-11-10');
    // Act
    const { statusCode, body } = await getProjection();
    // Assert
    expect({ statusCode, body }).toMatchObject({
      statusCode: 200,
      body: {
        date: '2026-11-05',
        startBalanceCents: 500000,
        plannedIncomeCents: 300000,
        plannedExpenseCents: 120000,
        billsDueCents: 200000,
        projectedBalanceCents: 480000,
        warnings: [],
      },
    });
  });

  it('should_list_the_events_in_date_order_when_the_projection_has_several_items', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    await createEntry({ dayOfMonth: 20 });
    const cardId = await insertCard();
    await insertBill(cardId, '2026-11-10');
    // Act
    const { body } = await getProjection();
    // Assert
    expect(
      body.events.map((event: { type: string; date: string }) => [event.type, event.date]),
    ).toEqual([
      ['bill', '2026-11-10'],
      ['planned_expense', '2026-11-20'],
    ]);
  });

  it('should_subtract_only_the_unpaid_part_when_the_bill_is_partially_paid', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    const cardId = await insertCard();
    await insertBill(cardId, '2026-11-10', { totalCents: 200000, paidCents: 50000 });
    // Act
    const { body } = await getProjection();
    // Assert
    expect(body).toMatchObject({ billsDueCents: 150000, projectedBalanceCents: 350000 });
  });

  it('should_skip_the_card_when_it_is_hidden', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    const cardId = await insertCard({ isHidden: true });
    await insertBill(cardId, '2026-11-10');
    // Act
    const { body } = await getProjection();
    // Assert
    expect(body).toMatchObject({ billsDueCents: 0, projectedBalanceCents: 500000 });
  });

  it('should_warn_and_not_estimate_when_the_card_has_a_balance_but_no_due_date', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    await insertCard({ balanceCents: 85973 });
    // Act
    const { body } = await getProjection();
    // Assert
    expect(body).toMatchObject({
      billsDueCents: 0,
      projectedBalanceCents: 500000,
      warnings: ['Fatura do cartão Cartão Visa sem vencimento informado'],
    });
  });

  it('should_not_count_a_planned_entry_when_it_was_skipped_this_month', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    const entry = await createEntry({});
    await testApp.app.inject({
      method: 'PUT',
      url: `/api/v1/planned-entries/${entry.id}/occurrences/${CURRENT_MONTH}`,
      payload: { action: 'skip' },
    });
    // Act
    const { body } = await getProjection();
    // Assert
    expect(body).toMatchObject({ plannedExpenseCents: 0, projectedBalanceCents: 500000 });
  });

  it('should_return_the_current_balance_when_the_month_has_nothing_planned', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    // Act
    const { body } = await getProjection();
    // Assert
    expect(body).toMatchObject({
      projectedBalanceCents: 500000,
      lowestBalanceCents: 500000,
      lowestBalanceDate: '2026-11-05',
      events: [],
      warnings: [],
    });
  });

  it('should_return_one_balance_per_day_until_the_end_of_the_month', async () => {
    // Arrange
    await insertCheckingAccount(500000);
    // Act
    const { body } = await getProjection();
    // Assert
    expect({ length: body.daily.length, last: body.daily.at(-1).date }).toEqual({
      length: 26,
      last: '2026-11-30',
    });
  });
});
