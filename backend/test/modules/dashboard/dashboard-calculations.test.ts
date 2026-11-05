import { describe, expect, it } from 'vitest';

import {
  buildBalanceChange,
  buildSpendingBreakdown,
  fillMonthTotals,
  monthsEndingAt,
} from '../../../src/modules/dashboard/dashboard-calculations.js';

const TODAY = '2026-11-15';

describe('buildBalanceChange', () => {
  it('should_return_the_difference_in_cents_and_percent_when_there_is_a_previous_snapshot', () => {
    // Arrange
    const evolution = [{ date: '2026-11-01', balanceCents: 400000 }];
    // Act
    const change = buildBalanceChange(485032, evolution, TODAY);
    // Assert
    expect(change).toEqual({ cents: 85032, percent: 21.26 });
  });

  it('should_return_a_negative_change_when_the_balance_dropped', () => {
    // Arrange
    const evolution = [{ date: '2026-11-01', balanceCents: 100000 }];
    // Act
    const change = buildBalanceChange(75000, evolution, TODAY);
    // Assert
    expect(change).toEqual({ cents: -25000, percent: -25 });
  });

  it('should_return_null_percent_when_the_first_snapshot_is_zero', () => {
    // Arrange
    const evolution = [{ date: '2026-11-01', balanceCents: 0 }];
    // Act
    const change = buildBalanceChange(10000, evolution, TODAY);
    // Assert
    expect(change).toEqual({ cents: 10000, percent: null });
  });

  it('should_return_null_when_the_first_snapshot_is_from_today', () => {
    // Arrange
    const evolution = [{ date: TODAY, balanceCents: 400000 }];
    // Act
    const change = buildBalanceChange(400000, evolution, TODAY);
    // Assert
    expect(change).toBeNull();
  });

  it('should_return_null_when_there_are_no_snapshots', () => {
    // Arrange
    // Act
    const change = buildBalanceChange(400000, [], TODAY);
    // Assert
    expect(change).toBeNull();
  });
});

describe('monthsEndingAt', () => {
  it('should_return_the_six_months_in_order_ending_at_the_given_month', () => {
    // Arrange
    // Act
    const months = monthsEndingAt('2026-11-01', 6);
    // Assert
    expect(months).toEqual([
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
    ]);
  });
});

describe('fillMonthTotals', () => {
  it('should_fill_missing_months_with_zero', () => {
    // Arrange
    const found = [{ month: '2026-10', incomeCents: 500, expenseCents: 200 }];
    // Act
    const totals = fillMonthTotals(['2026-10-01', '2026-11-01'], found);
    // Assert
    expect(totals).toEqual([
      { month: '2026-10', incomeCents: 500, expenseCents: 200 },
      { month: '2026-11', incomeCents: 0, expenseCents: 0 },
    ]);
  });
});

describe('buildSpendingBreakdown', () => {
  const spending = (name: string, spentCents: number) => ({
    categoryId: `id-${name}`,
    categoryName: name,
    categoryIcon: 'wallet',
    spentCents,
  });

  it('should_return_an_empty_list_when_there_is_no_spending', () => {
    // Arrange
    // Act
    const items = buildSpendingBreakdown([]);
    // Assert
    expect(items).toEqual([]);
  });

  it('should_order_by_spending_and_break_ties_by_name', () => {
    // Arrange
    const input = [spending('Zeta', 1000), spending('Alfa', 1000), spending('Maior', 5000)];
    // Act
    const items = buildSpendingBreakdown(input);
    // Assert
    expect(items.map(({ name }) => name)).toEqual(['Maior', 'Alfa', 'Zeta']);
  });

  it('should_not_add_others_when_there_are_exactly_five_categories', () => {
    // Arrange
    const input = ['A', 'B', 'C', 'D', 'E'].map((name) => spending(name, 1000));
    // Act
    const items = buildSpendingBreakdown(input);
    // Assert
    expect(items.some(({ kind }) => kind === 'other')).toBe(false);
  });

  it('should_add_others_with_the_sum_when_there_are_six_categories', () => {
    // Arrange
    const input = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, index) =>
      spending(name, 6000 - index * 1000),
    );
    // Act
    const items = buildSpendingBreakdown(input);
    // Assert
    expect(items.at(-1)).toMatchObject({ kind: 'other', amountCents: 1000, percent: 5 });
  });

  it('should_mark_spending_without_category_as_uncategorized', () => {
    // Arrange
    const input = [{ categoryId: null, categoryName: null, categoryIcon: null, spentCents: 3000 }];
    // Act
    const items = buildSpendingBreakdown(input);
    // Assert
    expect(items).toEqual([
      { kind: 'uncategorized', name: 'Sem categoria', amountCents: 3000, percent: 100 },
    ]);
  });
});
