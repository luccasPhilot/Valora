import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { creditCardBills, transactions } from '../../src/db/schema.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertConnection, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 05/11/2026, meio-dia em São Paulo.
const NOW = new Date('2026-11-05T15:00:00Z');

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

async function getBills() {
  const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/credit-card-bills' });
  return response.json();
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
    totalCents: 100000,
    ...overrides,
  });
}

describe('GET /api/v1/credit-card-bills', () => {
  it('should_return_current_and_upcoming_bills_when_the_card_has_three_bills', async () => {
    // Arrange
    const accountId = await insertCard();
    await insertBill(accountId, '2026-11-10');
    await insertBill(accountId, '2026-12-10');
    await insertBill(accountId, '2027-01-10');
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect({
      current: card.currentBill.dueDate,
      upcoming: card.upcomingBills.map((bill: { dueDate: string }) => bill.dueDate),
    }).toEqual({ current: '2026-11-10', upcoming: ['2026-12-10', '2027-01-10'] });
  });

  it('should_skip_the_bill_due_today_when_it_is_already_paid', async () => {
    // Arrange
    const accountId = await insertCard();
    await insertBill(accountId, '2026-11-05', { paidCents: 100000 });
    await insertBill(accountId, '2026-12-10');
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card.currentBill.dueDate).toBe('2026-12-10');
  });

  it('should_build_the_current_bill_from_the_balance_when_every_closed_bill_is_paid', async () => {
    // Arrange: o Pluggy só devolve faturas fechadas; o saldo da conta é a fatura aberta.
    const accountId = await insertCard({ balanceCents: 250000 });
    await insertBill(accountId, '2026-09-10', { paidCents: 100000 });
    await insertBill(accountId, '2026-10-10', { paidCents: 100000 });
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card).toMatchObject({
      currentBill: {
        id: null,
        totalCents: 250000,
        dueDate: '2026-11-10',
        isEstimatedDueDate: true,
        status: 'open',
      },
      upcomingBills: [],
    });
  });

  it('should_show_the_latest_bill_as_overdue_when_it_was_never_paid', async () => {
    // Arrange
    const accountId = await insertCard({ balanceCents: 250000 });
    await insertBill(accountId, '2026-10-10');
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card.currentBill).toMatchObject({ dueDate: '2026-10-10', status: 'overdue' });
  });

  it('should_not_list_the_card_when_it_is_hidden', async () => {
    // Arrange
    await insertCard({ isHidden: true });
    // Act
    const body = await getBills();
    // Assert
    expect(body.items).toEqual([]);
  });

  it('should_use_the_account_due_date_when_the_card_has_no_bills_and_the_date_is_in_the_future', async () => {
    // Arrange
    await insertCard({
      balanceCents: 250000,
      raw: { creditData: { balanceDueDate: '2026-11-15' } },
    });
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card).toMatchObject({
      currentBill: { totalCents: 250000, dueDate: '2026-11-15', isEstimatedDueDate: false },
      upcomingBills: [],
    });
  });

  it('should_estimate_the_due_date_when_the_account_due_date_is_stale', async () => {
    // Arrange
    await insertCard({
      balanceCents: 250000,
      raw: { creditData: { balanceDueDate: '2026-10-10T03:00:00.000Z' } },
    });
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card.currentBill).toMatchObject({ dueDate: '2026-11-10', isEstimatedDueDate: true });
  });

  it('should_return_a_null_due_date_when_the_bank_gave_none', async () => {
    // Arrange
    await insertCard({ balanceCents: 85973, raw: { creditData: { balanceDueDate: null } } });
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card.currentBill).toMatchObject({ totalCents: 85973, dueDate: null });
  });

  it('should_return_a_zero_bill_without_due_date_when_the_balance_is_zero', async () => {
    // Arrange
    await insertCard({ balanceCents: 0 });
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card.currentBill).toMatchObject({ totalCents: 0, dueDate: null, status: 'paid' });
  });

  it('should_project_future_installments_per_month_when_the_card_has_an_installment_purchase', async () => {
    // Arrange
    const accountId = await insertCard();
    await database.db.insert(transactions).values(
      transactionValues(accountId, {
        date: '2026-11-03',
        description: 'Loja X',
        descriptionNormalized: 'LOJA X',
        amountCents: -10000,
        installmentNumber: 1,
        installmentTotal: 3,
      }),
    );
    // Act
    const [card] = (await getBills()).items;
    // Assert
    expect(card.futureInstallments).toEqual([
      { month: '2026-12-01', totalCents: 10000 },
      { month: '2027-01-01', totalCents: 10000 },
    ]);
  });

  it('should_not_expose_the_raw_payload_when_listing_bills', async () => {
    // Arrange
    const accountId = await insertCard({ raw: { creditData: { balanceDueDate: null } } });
    await insertBill(accountId, '2026-11-10', { raw: { secret: 'x' } });
    // Act
    const body = await getBills();
    // Assert
    expect(JSON.stringify(body)).not.toContain('raw');
  });
});
