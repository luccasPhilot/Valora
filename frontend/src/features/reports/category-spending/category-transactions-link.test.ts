import { describe, expect, it } from 'vitest';

import type { CategorySeries } from '@/lib/api/reports';

import { categoryTransactionsPath } from './category-transactions-link';

function series(overrides: Partial<CategorySeries>): CategorySeries {
  return {
    kind: 'category',
    categoryId: 'cat-1',
    name: 'Moradia',
    icon: null,
    totalCents: 100000,
    percent: 50,
    monthlyCents: [],
    ...overrides,
  };
}

describe('categoryTransactionsPath', () => {
  it('should_filter_by_category_and_cover_the_whole_period_when_the_category_is_real', () => {
    // Arrange
    const housing = series({});
    // Act
    const path = categoryTransactionsPath(housing, '2026-06', '2026-11');
    // Assert
    expect(path).toBe('/transacoes?period=custom&from=2026-06-01&to=2026-11-30&category=cat-1');
  });

  it('should_use_the_uncategorized_filter_when_the_series_is_uncategorized', () => {
    // Arrange
    const uncategorized = series({ kind: 'uncategorized', categoryId: null });
    // Act
    const path = categoryTransactionsPath(uncategorized, '2026-01', '2026-02');
    // Assert
    expect(path).toBe('/transacoes?period=custom&from=2026-01-01&to=2026-02-28&category=none');
  });

  it('should_return_null_when_the_series_groups_several_categories', () => {
    // Arrange
    const others = series({ kind: 'other', categoryId: null });
    // Act
    const path = categoryTransactionsPath(others, '2026-06', '2026-11');
    // Assert
    expect(path).toBeNull();
  });
});
