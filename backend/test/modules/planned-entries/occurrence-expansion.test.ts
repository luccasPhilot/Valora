import { describe, expect, it } from 'vitest';

import {
  expandOccurrences,
  type RecurringEntry,
} from '../../../src/modules/planned-entries/occurrence-expansion.js';

function entry(overrides: Partial<RecurringEntry> = {}): RecurringEntry {
  return {
    recurrence: 'monthly',
    dayOfMonth: 10,
    startMonth: '2026-12-01',
    endMonth: null,
    isActive: true,
    ...overrides,
  };
}

describe('expandOccurrences', () => {
  it('should_happen_only_in_the_start_month_when_the_entry_does_not_repeat', () => {
    // Arrange
    const single = entry({ recurrence: 'none' });
    // Act
    const dates = [
      expandOccurrences(single, '2026-11-01'),
      expandOccurrences(single, '2026-12-01'),
      expandOccurrences(single, '2027-01-01'),
    ];
    // Assert
    expect(dates).toEqual([[], ['2026-12-10'], []]);
  });

  it('should_happen_in_every_month_of_the_period_when_the_entry_is_monthly_with_an_end', () => {
    // Arrange
    const rent = entry({ endMonth: '2027-02-01' });
    // Act
    const dates = ['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01'].map(
      (month) => expandOccurrences(rent, month).length,
    );
    // Assert
    expect(dates).toEqual([0, 1, 1, 1, 0]);
  });

  it('should_happen_in_every_month_after_the_start_when_the_entry_has_no_end', () => {
    // Arrange
    const salary = entry({ startMonth: '2026-01-01' });
    // Act
    const dates = expandOccurrences(salary, '2030-07-01');
    // Assert
    expect(dates).toEqual(['2030-07-10']);
  });

  it('should_happen_once_a_year_in_the_start_month_when_the_entry_is_yearly', () => {
    // Arrange
    const insurance = entry({ recurrence: 'yearly', startMonth: '2026-03-01' });
    // Act
    const dates = [
      expandOccurrences(insurance, '2026-03-01'),
      expandOccurrences(insurance, '2027-03-01'),
      expandOccurrences(insurance, '2027-04-01'),
    ];
    // Assert
    expect(dates).toEqual([['2026-03-10'], ['2027-03-10'], []]);
  });

  it('should_not_happen_before_the_start_when_the_entry_is_yearly', () => {
    // Arrange
    const insurance = entry({ recurrence: 'yearly', startMonth: '2026-03-01' });
    // Act
    const dates = expandOccurrences(insurance, '2025-03-01');
    // Assert
    expect(dates).toEqual([]);
  });

  it('should_fall_on_day_28_when_day_31_meets_a_common_february', () => {
    // Arrange
    const lastDay = entry({ dayOfMonth: 31 });
    // Act
    const dates = expandOccurrences(lastDay, '2027-02-01');
    // Assert
    expect(dates).toEqual(['2027-02-28']);
  });

  it('should_fall_on_day_29_when_day_31_meets_a_leap_february', () => {
    // Arrange
    const lastDay = entry({ dayOfMonth: 31, startMonth: '2028-01-01' });
    // Act
    const dates = expandOccurrences(lastDay, '2028-02-01');
    // Assert
    expect(dates).toEqual(['2028-02-29']);
  });

  it('should_keep_day_31_when_the_month_has_31_days', () => {
    // Arrange
    const lastDay = entry({ dayOfMonth: 31 });
    // Act
    const dates = expandOccurrences(lastDay, '2026-12-01');
    // Assert
    expect(dates).toEqual(['2026-12-31']);
  });

  it('should_never_happen_when_the_entry_is_paused', () => {
    // Arrange
    const paused = entry({ isActive: false });
    // Act
    const dates = expandOccurrences(paused, '2026-12-01');
    // Assert
    expect(dates).toEqual([]);
  });
});
