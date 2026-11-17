import { describe, expect, it } from 'vitest';

import { insightTransactionsPath } from './analysis-links';

describe('insightTransactionsPath', () => {
  it('should_filter_the_transactions_of_the_category_in_the_whole_month', () => {
    // Arrange
    const category = { kind: 'category', categoryId: 'market-id' } as const;
    // Act
    const path = insightTransactionsPath(category, '2026-11');
    // Assert
    const params = new URLSearchParams(path?.split('?')[1]);
    expect({
      pathname: path?.split('?')[0],
      period: params.get('period'),
      from: params.get('from'),
      to: params.get('to'),
      category: params.get('category'),
    }).toEqual({
      pathname: '/transacoes',
      period: 'custom',
      from: '2026-11-01',
      to: '2026-11-30',
      category: 'market-id',
    });
  });

  it('should_filter_the_uncategorized_transactions_when_the_kind_is_uncategorized', () => {
    // Arrange
    const category = { kind: 'uncategorized', categoryId: null } as const;
    // Act
    const path = insightTransactionsPath(category, '2026-02');
    // Assert
    const params = new URLSearchParams(path?.split('?')[1]);
    expect({ category: params.get('category'), to: params.get('to') }).toEqual({
      category: 'none',
      to: '2026-02-28',
    });
  });

  it('should_return_null_when_a_category_has_no_id', () => {
    // Arrange
    const category = { kind: 'category', categoryId: null } as const;
    // Act
    const path = insightTransactionsPath(category, '2026-11');
    // Assert
    expect(path).toBeNull();
  });
});
