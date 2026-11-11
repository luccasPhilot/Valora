import { describe, expect, it } from 'vitest';

import {
  buildSpendingBreakdown,
  fillMonthTotals,
} from '../../../src/modules/dashboard/dashboard-calculations.js';

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
