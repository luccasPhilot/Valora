import { describe, expect, it } from 'vitest';

import { countMonthsBetween, monthsBetween, monthsEndingAt } from '../../src/shared/months.js';

describe('monthsBetween', () => {
  it('should_return_every_month_in_order_when_the_range_crosses_the_year', () => {
    // Arrange
    // Act
    const months = monthsBetween('2025-11-01', '2026-02-01');
    // Assert
    expect(months).toEqual(['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01']);
  });

  it('should_return_a_single_month_when_from_equals_to', () => {
    // Arrange
    // Act
    const months = monthsBetween('2026-05-01', '2026-05-01');
    // Assert
    expect(months).toEqual(['2026-05-01']);
  });
});

describe('countMonthsBetween', () => {
  it('should_count_both_ends_when_the_range_spans_two_years', () => {
    // Arrange
    // Act
    const count = countMonthsBetween('2025-12-01', '2026-11-01');
    // Assert
    expect(count).toBe(12);
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

  it('should_cross_the_year_boundary_when_the_window_starts_in_the_previous_year', () => {
    // Arrange
    // Act
    const months = monthsEndingAt('2026-02-01', 4);
    // Assert
    expect(months).toEqual(['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01']);
  });
});
