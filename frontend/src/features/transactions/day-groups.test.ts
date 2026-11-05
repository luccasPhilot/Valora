import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/api/transactions';

import { groupByDay } from './day-groups';

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    date: '2026-11-03',
    description: 'Compra',
    amountCents: -1000,
    status: 'posted',
    source: 'open_finance',
    category: null,
    categorySource: 'none',
    account: { id: crypto.randomUUID(), name: 'Conta', type: 'checking' },
    installmentNumber: null,
    installmentTotal: null,
    ...overrides,
  };
}

const CARD_PAYMENT = {
  id: crypto.randomUUID(),
  name: 'Pagamento de fatura',
  icon: 'credit-card',
  kind: 'transfer' as const,
};

describe('groupByDay', () => {
  it('should_keep_the_received_order_and_split_by_date_when_grouping', () => {
    // Arrange
    const transactions = [
      transaction({ date: '2026-11-03', description: 'a' }),
      transaction({ date: '2026-11-03', description: 'b' }),
      transaction({ date: '2026-11-02', description: 'c' }),
    ];
    // Act
    const groups = groupByDay(transactions);
    // Assert
    expect(groups.map((group) => [group.date, group.transactions.length])).toEqual([
      ['2026-11-03', 2],
      ['2026-11-02', 1],
    ]);
  });

  it('should_sum_income_and_expense_when_computing_the_day_total', () => {
    // Arrange
    const transactions = [
      transaction({ amountCents: -8990 }),
      transaction({ amountCents: 500000 }),
    ];
    // Act
    const [group] = groupByDay(transactions);
    // Assert
    expect(group?.totalCents).toBe(491010);
  });

  it('should_leave_transfers_out_when_computing_the_day_total', () => {
    // Arrange
    const transactions = [
      transaction({ amountCents: -2000 }),
      transaction({ amountCents: -90000, category: CARD_PAYMENT, categorySource: 'rule' }),
    ];
    // Act
    const [group] = groupByDay(transactions);
    // Assert
    expect(group?.totalCents).toBe(-2000);
  });

  it('should_return_no_groups_when_there_are_no_transactions', () => {
    // Arrange
    // Act
    const groups = groupByDay([]);
    // Assert
    expect(groups).toEqual([]);
  });
});
