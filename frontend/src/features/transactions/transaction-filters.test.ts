import { describe, expect, it } from 'vitest';

import type { Category } from '@/lib/api/categories';
import type { AccountOption } from '@/lib/api/transactions';

import {
  describeActiveFilters,
  NO_FILTERS,
  parseFilters,
  resolvePeriod,
  serializeFilters,
  toTransactionQuery,
} from './transaction-filters';

const TODAY = '2026-11-04';
const TRANSPORT: Category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Transporte',
  kind: 'expense',
  icon: 'car',
  isArchived: false,
};
const CHECKING: AccountOption = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Conta corrente',
  type: 'checking',
  institutionName: 'Nubank',
};

describe('resolvePeriod', () => {
  it.each([
    { period: 'this-month', from: '2026-11-01', to: '2026-11-30' },
    { period: 'last-month', from: '2026-10-01', to: '2026-10-31' },
    { period: 'last-3-months', from: '2026-09-01', to: '2026-11-30' },
    { period: 'this-year', from: '2026-01-01', to: '2026-12-31' },
  ] as const)('should_resolve_$period_when_today_is_in_november', ({ period, from, to }) => {
    // Arrange
    const filters = { ...NO_FILTERS, period };
    // Act
    const range = resolvePeriod(filters, TODAY);
    // Assert
    expect(range).toEqual({ from, to });
  });

  it('should_use_the_given_dates_when_the_period_is_custom', () => {
    // Arrange
    const filters = { ...NO_FILTERS, period: 'custom' as const, from: '2026-08-10', to: null };
    // Act
    const range = resolvePeriod(filters, TODAY);
    // Assert
    expect(range).toEqual({ from: '2026-08-10', to: undefined });
  });

  it('should_fall_back_to_the_current_month_when_custom_has_no_dates', () => {
    // Arrange
    const filters = { ...NO_FILTERS, period: 'custom' as const };
    // Act
    const range = resolvePeriod(filters, TODAY);
    // Assert
    expect(range).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });
});

describe('parseFilters and serializeFilters', () => {
  it('should_return_no_filters_when_the_url_has_no_params', () => {
    // Arrange
    const params = new URLSearchParams();
    // Act
    const filters = parseFilters(params);
    // Assert
    expect(filters).toEqual(NO_FILTERS);
  });

  it('should_ignore_unknown_period_and_type_values_when_the_url_is_edited_by_hand', () => {
    // Arrange
    const params = new URLSearchParams('period=forever&type=gift&from=ontem');
    // Act
    const filters = parseFilters(params);
    // Assert
    expect(filters).toEqual(NO_FILTERS);
  });

  it('should_keep_every_filter_when_serializing_and_parsing_again', () => {
    // Arrange
    const filters = {
      period: 'custom' as const,
      from: '2026-08-01',
      to: '2026-08-31',
      categoryId: TRANSPORT.id,
      type: 'expense' as const,
      accountId: CHECKING.id,
      search: 'farmácia',
    };
    // Act
    const parsed = parseFilters(serializeFilters(filters));
    // Assert
    expect(parsed).toEqual(filters);
  });

  it('should_leave_the_url_empty_when_all_filters_are_default', () => {
    // Arrange
    // Act
    const params = serializeFilters(NO_FILTERS);
    // Assert
    expect(params.toString()).toBe('');
  });
});

describe('toTransactionQuery', () => {
  it('should_send_only_the_active_filters_when_building_the_query', () => {
    // Arrange
    const filters = { ...NO_FILTERS, type: 'income' as const, search: 'salário' };
    // Act
    const query = toTransactionQuery(filters, TODAY);
    // Assert
    expect(query).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
      categoryId: undefined,
      type: 'income',
      accountId: undefined,
      search: 'salário',
    });
  });
});

describe('describeActiveFilters', () => {
  it('should_return_no_chips_when_only_the_default_period_is_active', () => {
    // Arrange
    // Act
    const chips = describeActiveFilters(NO_FILTERS, { categories: [], accounts: [] });
    // Assert
    expect(chips).toEqual([]);
  });

  it('should_name_the_category_and_the_account_when_they_are_known', () => {
    // Arrange
    const filters = { ...NO_FILTERS, categoryId: TRANSPORT.id, accountId: CHECKING.id };
    // Act
    const chips = describeActiveFilters(filters, { categories: [TRANSPORT], accounts: [CHECKING] });
    // Assert
    expect(chips.map((chip) => chip.label)).toEqual(['Transporte', 'Nubank · Conta corrente']);
  });

  it('should_drop_only_that_filter_when_removing_a_chip', () => {
    // Arrange
    const filters = { ...NO_FILTERS, categoryId: TRANSPORT.id, type: 'expense' as const };
    const [categoryChip] = describeActiveFilters(filters, {
      categories: [TRANSPORT],
      accounts: [],
    });
    // Act
    const remaining = categoryChip?.filtersWithoutIt;
    // Assert
    expect(remaining).toEqual({ ...NO_FILTERS, type: 'expense' });
  });
});
