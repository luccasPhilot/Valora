import { describe, expect, it } from 'vitest';

import type { Category } from '@/lib/api/categories';
import { type AccountOption, UNCATEGORIZED_FILTER } from '@/lib/api/transactions';

import {
  activeFilterCount,
  describeActiveFilters,
  describePeriod,
  NO_FILTERS,
  parseFilters,
  resolvePeriod,
  serializeFilters,
  toTransactionQuery,
  withoutPanelFilters,
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
      source: 'manual' as const,
      possibleDuplicate: true,
      search: 'farmácia',
      tagId: '66666666-6666-4666-8666-666666666666',
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

describe('filtros de origem e de duplicatas', () => {
  it('should_send_source_and_possible_duplicate_when_building_the_query', () => {
    // Arrange
    const filters = { ...NO_FILTERS, source: 'manual' as const, possibleDuplicate: true };
    // Act
    const query = toTransactionQuery(filters, TODAY);
    // Assert
    expect(query).toMatchObject({ source: 'manual', possibleDuplicate: true });
  });

  it('should_not_send_possible_duplicate_when_the_filter_is_off', () => {
    // Arrange
    // Act
    const query = toTransactionQuery(NO_FILTERS, TODAY);
    // Assert
    expect(query.possibleDuplicate).toBeUndefined();
  });

  it('should_ignore_an_unknown_source_when_the_url_is_edited_by_hand', () => {
    // Arrange
    const params = new URLSearchParams('source=aliens');
    // Act
    const filters = parseFilters(params);
    // Assert
    expect(filters.source).toBeNull();
  });

  it('should_name_the_tag_in_the_chip_when_filtering_by_tag', () => {
    // Arrange
    const trip = {
      id: '66666666-6666-4666-8666-666666666666',
      name: 'Viagem Chile',
      transactionCount: 3,
    };
    const filters = { ...NO_FILTERS, tagId: trip.id };
    // Act
    const chips = describeActiveFilters(filters, { categories: [], accounts: [], tags: [trip] });
    // Assert
    expect(chips.map((chip) => chip.label)).toEqual(['Etiqueta: Viagem Chile']);
  });

  it('should_count_the_tag_in_the_filters_button_when_a_tag_is_chosen', () => {
    // Arrange
    const filters = { ...NO_FILTERS, tagId: '66666666-6666-4666-8666-666666666666' };
    // Act
    const count = activeFilterCount(filters, { isPeriodInside: false });
    // Assert
    expect(count).toBe(1);
  });

  it('should_send_the_tag_in_the_query_when_a_tag_is_chosen', () => {
    // Arrange
    const filters = { ...NO_FILTERS, tagId: '66666666-6666-4666-8666-666666666666' };
    // Act
    const query = toTransactionQuery(filters, '2026-11-15');
    // Assert
    expect(query.tagId).toBe('66666666-6666-4666-8666-666666666666');
  });

  it('should_name_the_source_and_the_duplicates_in_chips_when_they_are_active', () => {
    // Arrange
    const filters = { ...NO_FILTERS, source: 'manual' as const, possibleDuplicate: true };
    // Act
    const chips = describeActiveFilters(filters, { categories: [], accounts: [], tags: [] });
    // Assert
    expect(chips.map((chip) => chip.label)).toEqual([
      'Origem: Lançamento manual',
      'Possíveis duplicatas',
    ]);
  });
});

describe('activeFilterCount', () => {
  it('should_count_only_category_type_source_and_account_when_the_period_is_outside', () => {
    // Arrange
    const filters = {
      ...NO_FILTERS,
      period: 'last-month' as const,
      categoryId: TRANSPORT.id,
      type: 'expense' as const,
      possibleDuplicate: true,
      search: 'farmácia',
    };
    // Act
    const count = activeFilterCount(filters, { isPeriodInside: false });
    // Assert
    expect(count).toBe(2);
  });

  it('should_count_the_period_when_it_is_inside_the_panel_and_not_this_month', () => {
    // Arrange
    const filters = { ...NO_FILTERS, period: 'last-month' as const, categoryId: TRANSPORT.id };
    // Act
    const count = activeFilterCount(filters, { isPeriodInside: true });
    // Assert
    expect(count).toBe(2);
  });

  it('should_not_count_this_month_when_the_period_is_inside_the_panel', () => {
    // Arrange
    const filters = { ...NO_FILTERS, categoryId: TRANSPORT.id };
    // Act
    const count = activeFilterCount(filters, { isPeriodInside: true });
    // Assert
    expect(count).toBe(1);
  });

  it('should_return_zero_when_no_filter_is_active', () => {
    // Arrange
    // Act
    const count = activeFilterCount(NO_FILTERS, { isPeriodInside: true });
    // Assert
    expect(count).toBe(0);
  });

  it('should_count_all_four_when_every_panel_filter_is_active', () => {
    // Arrange
    const filters = {
      ...NO_FILTERS,
      categoryId: TRANSPORT.id,
      type: 'income' as const,
      source: 'manual' as const,
      accountId: CHECKING.id,
    };
    // Act
    const count = activeFilterCount(filters, { isPeriodInside: false });
    // Assert
    expect(count).toBe(4);
  });
});

describe('withoutPanelFilters', () => {
  it('should_drop_category_type_source_and_account_and_keep_period_and_search', () => {
    // Arrange
    const filters = {
      ...NO_FILTERS,
      period: 'last-month' as const,
      search: 'uber',
      categoryId: TRANSPORT.id,
      type: 'expense' as const,
      source: 'manual' as const,
      accountId: CHECKING.id,
    };
    // Act
    const cleared = withoutPanelFilters(filters);
    // Assert
    expect(cleared).toEqual({ ...NO_FILTERS, period: 'last-month', search: 'uber' });
  });
});

describe('describeActiveFilters', () => {
  it('should_return_no_chips_when_only_the_default_period_is_active', () => {
    // Arrange
    // Act
    const chips = describeActiveFilters(NO_FILTERS, { categories: [], accounts: [], tags: [] });
    // Assert
    expect(chips).toEqual([]);
  });

  it('should_name_the_category_and_the_account_when_they_are_known', () => {
    // Arrange
    const filters = { ...NO_FILTERS, categoryId: TRANSPORT.id, accountId: CHECKING.id };
    // Act
    const chips = describeActiveFilters(filters, {
      categories: [TRANSPORT],
      accounts: [CHECKING],
      tags: [],
    });
    // Assert
    expect(chips.map((chip) => chip.label)).toEqual([
      'Categoria: Transporte',
      'Conta: Nubank · Conta corrente',
    ]);
  });

  it('should_never_turn_the_period_into_a_chip_when_it_is_not_this_month', () => {
    // Arrange
    const filters = { ...NO_FILTERS, period: 'custom' as const, from: '2026-10-01' };
    // Act
    const chips = describeActiveFilters(filters, { categories: [], accounts: [], tags: [] });
    // Assert
    expect(chips).toEqual([]);
  });

  it('should_name_the_type_in_the_chip_when_it_is_active', () => {
    // Arrange
    const filters = { ...NO_FILTERS, type: 'expense' as const };
    // Act
    const chips = describeActiveFilters(filters, { categories: [], accounts: [], tags: [] });
    // Assert
    expect(chips.map((chip) => chip.label)).toEqual(['Tipo: Despesas']);
  });

  it('should_label_the_chip_as_uncategorized_when_filtering_transactions_without_category', () => {
    // Arrange
    const filters = { ...NO_FILTERS, categoryId: UNCATEGORIZED_FILTER };
    // Act
    const chips = describeActiveFilters(filters, {
      categories: [TRANSPORT],
      accounts: [],
      tags: [],
    });
    // Assert
    expect(chips.map((chip) => chip.label)).toEqual(['Categoria: Sem categoria']);
  });

  it('should_drop_only_that_filter_when_removing_a_chip', () => {
    // Arrange
    const filters = { ...NO_FILTERS, categoryId: TRANSPORT.id, type: 'expense' as const };
    const [categoryChip] = describeActiveFilters(filters, {
      categories: [TRANSPORT],
      accounts: [],
      tags: [],
    });
    // Act
    const remaining = categoryChip?.filtersWithoutIt;
    // Assert
    expect(remaining).toEqual({ ...NO_FILTERS, type: 'expense' });
  });
});

describe('describePeriod', () => {
  it.each([
    { period: 'this-month', text: 'novembro de 2026' },
    { period: 'last-month', text: 'outubro de 2026' },
    { period: 'last-3-months', text: 'setembro a novembro de 2026' },
    { period: 'this-year', text: 'ano de 2026' },
  ] as const)('should_describe_$period_when_today_is_in_november', ({ period, text }) => {
    // Arrange
    const filters = { ...NO_FILTERS, period };
    // Act
    const description = describePeriod(filters, TODAY);
    // Assert
    expect(description).toBe(text);
  });

  it('should_name_both_years_when_the_last_3_months_cross_the_year', () => {
    // Arrange
    const filters = { ...NO_FILTERS, period: 'last-3-months' as const };
    // Act
    const description = describePeriod(filters, '2027-01-10');
    // Assert
    expect(description).toBe('novembro de 2026 a janeiro de 2027');
  });

  it('should_show_the_dates_when_the_period_is_custom', () => {
    // Arrange
    const filters = {
      ...NO_FILTERS,
      period: 'custom' as const,
      from: '2026-10-01',
      to: '2026-10-15',
    };
    // Act
    const description = describePeriod(filters, TODAY);
    // Assert
    expect(description).toBe('01/10/2026 a 15/10/2026');
  });

  it('should_describe_the_current_month_when_custom_has_no_dates', () => {
    // Arrange
    const filters = { ...NO_FILTERS, period: 'custom' as const };
    // Act
    const description = describePeriod(filters, TODAY);
    // Assert
    expect(description).toBe('novembro de 2026');
  });
});
