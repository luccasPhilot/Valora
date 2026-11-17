import { describe, expect, it } from 'vitest';

import {
  buildAttention,
  buildChanges,
} from '../../../src/modules/category-insights/category-changes.js';
import {
  buildDifferences,
  buildItems,
  buildTotals,
  percentOf,
  variationPercentOf,
} from '../../../src/modules/category-insights/category-insights-calculations.js';
import type {
  CategorySpending,
  MonthCategorySpending,
} from '../../../src/modules/transactions/transaction-totals.repository.js';

const MONTHS = ['2026-09', '2026-10', '2026-11'];

function spending(name: string | null, spentCents: number): CategorySpending {
  return {
    categoryId: name === null ? null : `id-${name}`,
    categoryName: name,
    categoryIcon: name === null ? null : 'tag',
    spentCents,
  };
}

function monthRow(month: string, name: string | null, spentCents: number): MonthCategorySpending {
  return { ...spending(name, spentCents), month };
}

function itemsFor(
  current: readonly CategorySpending[],
  previous: readonly CategorySpending[],
  rows: readonly MonthCategorySpending[] = [],
  limits: ReadonlyMap<string, number> = new Map(),
) {
  const differences = buildDifferences(current, previous);
  return {
    differences,
    items: buildItems({ differences, rows, months: MONTHS, limitsByCategoryId: limits }),
  };
}

describe('percentOf', () => {
  it('should_round_to_one_decimal_when_the_share_is_not_exact', () => {
    // Arrange
    // Act
    const percent = percentOf(1, 3);
    // Assert
    expect(percent).toBe(33.3);
  });

  it('should_return_zero_when_the_total_is_zero', () => {
    // Arrange
    // Act
    const percent = percentOf(0, 0);
    // Assert
    expect(percent).toBe(0);
  });
});

describe('variationPercentOf', () => {
  it('should_return_null_when_the_previous_period_had_no_spending', () => {
    // Arrange
    // Act
    const variation = variationPercentOf(5000, 0);
    // Assert
    expect(variation).toBeNull();
  });

  it('should_return_negative_ten_when_spending_fell_from_1000_to_900', () => {
    // Arrange
    // Act
    const variation = variationPercentOf(90000, 100000);
    // Assert
    expect(variation).toBe(-10);
  });

  it('should_return_zero_without_a_negative_sign_when_nothing_changed', () => {
    // Arrange
    // Act
    const variation = variationPercentOf(100000, 100000);
    // Assert
    expect(Object.is(variation, 0)).toBe(true);
  });
});

describe('buildTotals', () => {
  it('should_compare_the_month_with_the_previous_period', () => {
    // Arrange
    const current = [spending('Mercado', 180000)];
    const previous = [spending('Mercado', 100000), spending('Lazer', 50000)];
    // Act
    const totals = buildTotals(current, previous);
    // Assert
    expect(totals).toEqual({
      spentCents: 180000,
      previousSpentCents: 150000,
      variationPercent: 20,
    });
  });
});

describe('buildItems', () => {
  it('should_list_every_category_with_spending_without_grouping_into_others', () => {
    // Arrange
    const current = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name) => spending(name, 1000));
    // Act
    const { items } = itemsFor(current, []);
    // Assert
    expect(items).toHaveLength(7);
  });

  it('should_order_by_spending_then_by_name_when_there_is_a_tie', () => {
    // Arrange
    const current = [
      spending('Lazer', 40000),
      spending('Mercado', 90000),
      spending('Assinaturas', 40000),
    ];
    // Act
    const { items } = itemsFor(current, []);
    // Assert
    expect(items.map((item) => item.name)).toEqual(['Mercado', 'Assinaturas', 'Lazer']);
  });

  it('should_compute_the_share_of_the_month_total', () => {
    // Arrange
    const current = [spending('Mercado', 90000), spending('Lazer', 110000)];
    // Act
    const { items } = itemsFor(current, []);
    // Assert
    expect(items.find((item) => item.name === 'Mercado')?.percent).toBe(45);
  });

  it('should_keep_a_category_that_only_spent_before_out_of_the_list', () => {
    // Arrange
    const current = [spending('Mercado', 1000)];
    const previous = [spending('Educação', 40000)];
    // Act
    const { items } = itemsFor(current, previous);
    // Assert
    expect(items.map((item) => item.name)).toEqual(['Mercado']);
  });

  it('should_name_uncategorized_spending_without_id_or_icon', () => {
    // Arrange
    const current = [spending(null, 15000)];
    // Act
    const { items } = itemsFor(current, []);
    // Assert
    expect(items[0]).toMatchObject({
      kind: 'uncategorized',
      categoryId: null,
      icon: null,
      name: 'Sem categoria',
      spentCents: 15000,
    });
  });

  it('should_attach_the_budget_status_when_the_category_has_a_limit', () => {
    // Arrange
    const current = [spending('Mercado', 90000)];
    const limits = new Map([['id-Mercado', 100000]]);
    // Act
    const { items } = itemsFor(current, [], [], limits);
    // Assert
    expect(items[0]?.budget).toEqual({ limitCents: 100000, percent: 90, status: 'warning' });
  });

  it('should_leave_the_budget_null_when_there_is_no_limit', () => {
    // Arrange
    const current = [spending('Lazer', 5000)];
    // Act
    const { items } = itemsFor(current, []);
    // Assert
    expect(items[0]?.budget).toBeNull();
  });

  it('should_fill_months_without_spending_with_zero', () => {
    // Arrange
    const current = [spending('Lazer', 5000)];
    const rows = [monthRow('2026-09', 'Lazer', 3000), monthRow('2026-11', 'Lazer', 5000)];
    // Act
    const { items } = itemsFor(current, [], rows);
    // Assert
    expect(items[0]?.monthlyCents).toEqual([3000, 0, 5000]);
  });

  it('should_average_only_the_months_before_the_requested_one', () => {
    // Arrange
    const current = [spending('Mercado', 99900)];
    const rows = [
      monthRow('2026-09', 'Mercado', 80000),
      monthRow('2026-10', 'Mercado', 90000),
      monthRow('2026-11', 'Mercado', 99900),
    ];
    // Act
    const { items } = itemsFor(current, [], rows);
    // Assert
    expect(items[0]?.averageCents).toBe(85000);
  });

  it('should_leave_the_average_null_when_the_window_has_only_the_requested_month', () => {
    // Arrange
    const current = [spending('Mercado', 5000)];
    const differences = buildDifferences(current, []);
    // Act
    const [item] = buildItems({
      differences,
      rows: [monthRow('2026-11', 'Mercado', 5000)],
      months: ['2026-11'],
      limitsByCategoryId: new Map(),
    });
    // Assert
    expect(item?.averageCents).toBeNull();
  });

  it('should_pick_the_highest_month_as_the_peak_preferring_the_most_recent_on_a_tie', () => {
    // Arrange
    const current = [spending('Lazer', 30000)];
    const rows = [
      monthRow('2026-09', 'Lazer', 50000),
      monthRow('2026-10', 'Lazer', 50000),
      monthRow('2026-11', 'Lazer', 30000),
    ];
    // Act
    const { items } = itemsFor(current, [], rows);
    // Assert
    expect(items[0]?.peak).toEqual({ month: '2026-10', cents: 50000 });
  });
});

describe('buildChanges', () => {
  it('should_list_the_three_largest_increases_in_order', () => {
    // Arrange
    const current = [
      spending('Lazer', 30000),
      spending('Mercado', 20000),
      spending('Transporte', 15000),
      spending('Saúde', 5000),
    ];
    const { differences } = itemsFor(current, []);
    // Act
    const { increases } = buildChanges(differences);
    // Assert
    expect(increases.map((change) => change.name)).toEqual(['Lazer', 'Mercado', 'Transporte']);
  });

  it('should_count_a_category_that_zeroed_as_a_full_decrease', () => {
    // Arrange
    const { differences } = itemsFor([], [spending('Educação', 40000)]);
    // Act
    const { decreases } = buildChanges(differences);
    // Assert
    expect(decreases[0]).toMatchObject({ name: 'Educação', differenceCents: -40000 });
  });

  it('should_list_a_new_category_as_an_increase_of_its_full_amount', () => {
    // Arrange
    const { differences } = itemsFor([spending('Viagem', 60000)], []);
    // Act
    const { increases } = buildChanges(differences);
    // Assert
    expect(increases[0]).toMatchObject({ name: 'Viagem', differenceCents: 60000 });
  });

  it('should_leave_out_categories_with_no_difference', () => {
    // Arrange
    const { differences } = itemsFor([spending('Mercado', 1000)], [spending('Mercado', 1000)]);
    // Act
    const changes = buildChanges(differences);
    // Assert
    expect(changes).toEqual({ increases: [], decreases: [] });
  });
});

function attentionFor(
  current: readonly CategorySpending[],
  previous: readonly CategorySpending[],
  limits: ReadonlyMap<string, number> = new Map(),
) {
  const { items, differences } = itemsFor(current, previous, [], limits);
  const totals = buildTotals(current, previous);
  return buildAttention(items, differences, totals.spentCents);
}

describe('buildAttention', () => {
  it('should_flag_a_budget_that_was_exceeded', () => {
    // Arrange
    const limits = new Map([['id-Lazer', 30000]]);
    // Act
    const attention = attentionFor([spending('Lazer', 35000)], [], limits);
    // Assert
    expect(attention).toEqual([
      {
        type: 'budget_exceeded',
        categoryId: 'id-Lazer',
        name: 'Lazer',
        limitCents: 30000,
        spentCents: 35000,
      },
    ]);
  });

  it('should_flag_a_surge_of_50_percent_and_50_reais', () => {
    // Arrange
    const current = [spending('Assinaturas', 15000)];
    const previous = [spending('Assinaturas', 10000)];
    // Act
    const attention = attentionFor(current, previous);
    // Assert
    expect(attention).toEqual([
      {
        type: 'category_surge',
        categoryId: 'id-Assinaturas',
        name: 'Assinaturas',
        differenceCents: 5000,
        variationPercent: 50,
      },
    ]);
  });

  it('should_flag_a_surge_of_exactly_30_percent', () => {
    // Arrange
    const current = [spending('Mercado', 130000)];
    const previous = [spending('Mercado', 100000)];
    // Act
    const attention = attentionFor(current, previous);
    // Assert
    expect(attention.map((point) => point.type)).toEqual(['category_surge']);
  });

  it('should_not_flag_a_surge_of_29_point_9_percent', () => {
    // Arrange
    const current = [spending('Mercado', 129900)];
    const previous = [spending('Mercado', 100000)];
    // Act
    const attention = attentionFor(current, previous);
    // Assert
    expect(attention).toEqual([]);
  });

  it('should_not_flag_a_surge_when_the_difference_is_49_99_reais', () => {
    // Arrange
    const current = [spending('Lazer', 14999)];
    const previous = [spending('Lazer', 10000)];
    // Act
    const attention = attentionFor(current, previous);
    // Assert
    expect(attention).toEqual([]);
  });

  it('should_flag_a_surge_when_the_difference_is_exactly_50_reais', () => {
    // Arrange
    const current = [spending('Lazer', 15000)];
    const previous = [spending('Lazer', 10000)];
    // Act
    const attention = attentionFor(current, previous);
    // Assert
    expect(attention.map((point) => point.type)).toEqual(['category_surge']);
  });

  it('should_not_flag_a_new_category_as_a_surge', () => {
    // Arrange
    // Act
    const attention = attentionFor([spending('Viagem', 60000)], []);
    // Assert
    expect(attention).toEqual([]);
  });

  it('should_flag_uncategorized_spending_at_10_percent_of_the_total', () => {
    // Arrange
    const rows = [spending(null, 20000), spending('Mercado', 180000)];
    // Act
    const attention = attentionFor(rows, rows);
    // Assert
    expect(attention).toEqual([{ type: 'uncategorized_high', spentCents: 20000, percent: 10 }]);
  });

  it('should_not_flag_uncategorized_spending_just_below_10_percent', () => {
    // Arrange
    const rows = [spending(null, 19900), spending('Mercado', 180000)];
    // Act
    const attention = attentionFor(rows, rows);
    // Assert
    expect(attention).toEqual([]);
  });

  it('should_order_budget_then_surge_then_uncategorized', () => {
    // Arrange
    const current = [spending('Lazer', 35000), spending('Mercado', 90000), spending(null, 30000)];
    const previous = [spending('Lazer', 35000), spending('Mercado', 60000), spending(null, 30000)];
    const limits = new Map([['id-Lazer', 30000]]);
    // Act
    const attention = attentionFor(current, previous, limits);
    // Assert
    expect(attention.map((point) => point.type)).toEqual([
      'budget_exceeded',
      'category_surge',
      'uncategorized_high',
    ]);
  });

  it('should_return_nothing_when_no_rule_fires', () => {
    // Arrange
    const current = [spending('Mercado', 100000)];
    // Act
    const attention = attentionFor(current, current);
    // Assert
    expect(attention).toEqual([]);
  });
});
