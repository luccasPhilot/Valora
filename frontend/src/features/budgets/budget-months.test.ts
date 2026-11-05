import { describe, expect, it } from 'vitest';

import { monthOf, monthRange, parseMonth, shiftMonth, transactionsLinkFor } from './budget-months';

const FALLBACK_MONTH = '2026-11';

describe('monthOf', () => {
  it('should_return_year_and_month_when_given_a_full_date', () => {
    // Arrange
    const isoDate = '2026-11-17';
    // Act
    const month = monthOf(isoDate);
    // Assert
    expect(month).toBe('2026-11');
  });
});

describe('parseMonth', () => {
  it.each([
    { value: '2026-03', expected: '2026-03' },
    { value: null, expected: FALLBACK_MONTH },
    { value: '2026-13', expected: FALLBACK_MONTH },
    { value: '2026-00', expected: FALLBACK_MONTH },
    { value: 'novembro', expected: FALLBACK_MONTH },
    { value: '2026-11-01', expected: FALLBACK_MONTH },
  ])('should_return_$expected_when_value_is_$value', ({ value, expected }) => {
    // Arrange
    // Act
    const month = parseMonth(value, FALLBACK_MONTH);
    // Assert
    expect(month).toBe(expected);
  });
});

describe('shiftMonth', () => {
  it.each([
    { month: '2026-11', offset: -1, expected: '2026-10' },
    { month: '2026-11', offset: 1, expected: '2026-12' },
    { month: '2026-01', offset: -1, expected: '2025-12' },
    { month: '2026-12', offset: 1, expected: '2027-01' },
  ])('should_return_$expected_when_shifting_$month_by_$offset', ({ month, offset, expected }) => {
    // Arrange
    // Act
    const shifted = shiftMonth(month, offset);
    // Assert
    expect(shifted).toBe(expected);
  });
});

describe('monthRange', () => {
  it('should_cover_the_whole_month_when_it_has_30_days', () => {
    // Arrange
    const month = '2026-11';
    // Act
    const range = monthRange(month);
    // Assert
    expect(range).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });

  it('should_end_on_the_29th_when_it_is_february_of_a_leap_year', () => {
    // Arrange
    const month = '2028-02';
    // Act
    const range = monthRange(month);
    // Assert
    expect(range.to).toBe('2028-02-29');
  });
});

describe('transactionsLinkFor', () => {
  it('should_filter_by_category_and_month_when_building_the_link', () => {
    // Arrange
    const categoryId = '11111111-1111-4111-8111-111111111111';
    // Act
    const link = transactionsLinkFor(categoryId, '2026-11');
    // Assert
    expect(link).toBe(
      `/transacoes?period=custom&from=2026-11-01&to=2026-11-30&category=${categoryId}`,
    );
  });
});
