import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonthsKeepingDay,
  firstDayOfMonth,
  firstDayOfPreviousMonth,
  lastDayOfMonth,
  nextOccurrenceOfDay,
  subtractDays,
  todayInSaoPaulo,
  toSaoPauloDate,
} from '../../src/shared/dates.js';

describe('toSaoPauloDate', () => {
  it('should_return_previous_day_when_utc_is_after_midnight_but_sao_paulo_is_not', () => {
    // Arrange: 01:00 UTC de 4 de novembro são 22:00 de 3 de novembro em São Paulo (UTC-3).
    const instant = new Date('2026-11-04T01:00:00Z');
    // Act
    const date = toSaoPauloDate(instant);
    // Assert
    expect(date).toBe('2026-11-03');
  });

  it('should_return_same_day_when_sao_paulo_is_after_midnight', () => {
    // Arrange: 03:00 UTC é exatamente meia-noite em São Paulo.
    const instant = new Date('2026-11-04T03:00:00Z');
    // Act
    const date = toSaoPauloDate(instant);
    // Assert
    expect(date).toBe('2026-11-04');
  });

  it('should_handle_year_change_when_utc_is_already_in_the_new_year', () => {
    // Arrange
    const instant = new Date('2027-01-01T02:30:00Z');
    // Act
    const date = toSaoPauloDate(instant);
    // Assert
    expect(date).toBe('2026-12-31');
  });
});

describe('todayInSaoPaulo', () => {
  it('should_use_sao_paulo_day_when_now_is_given', () => {
    // Arrange
    const now = new Date('2026-11-04T01:00:00Z');
    // Act
    const today = todayInSaoPaulo(now);
    // Assert
    expect(today).toBe('2026-11-03');
  });
});

describe('firstDayOfMonth', () => {
  it('should_return_day_one_when_date_is_in_the_middle_of_the_month', () => {
    // Arrange
    const isoDate = '2026-11-15';
    // Act
    const firstDay = firstDayOfMonth(isoDate);
    // Assert
    expect(firstDay).toBe('2026-11-01');
  });

  it('should_return_same_date_when_it_is_already_day_one', () => {
    // Arrange
    const isoDate = '2026-02-01';
    // Act
    const firstDay = firstDayOfMonth(isoDate);
    // Assert
    expect(firstDay).toBe('2026-02-01');
  });

  it('should_throw_when_date_is_not_iso_formatted', () => {
    // Arrange
    const invalidDate = '15/11/2026';
    // Act
    const call = () => firstDayOfMonth(invalidDate);
    // Assert
    expect(call).toThrow(RangeError);
  });
});

describe('subtractDays', () => {
  it('should_go_back_to_previous_month_when_days_cross_the_month_start', () => {
    // Arrange
    const isoDate = '2026-11-04';
    // Act
    const date = subtractDays(isoDate, 30);
    // Assert
    expect(date).toBe('2026-10-05');
  });

  it('should_go_back_one_year_when_subtracting_365_days_in_a_regular_year', () => {
    // Arrange
    const isoDate = '2026-11-04';
    // Act
    const date = subtractDays(isoDate, 365);
    // Assert
    expect(date).toBe('2025-11-04');
  });

  it('should_count_february_29_when_the_range_includes_a_leap_day', () => {
    // Arrange
    const isoDate = '2028-03-01';
    // Act
    const date = subtractDays(isoDate, 1);
    // Assert
    expect(date).toBe('2028-02-29');
  });

  it('should_return_same_date_when_days_is_zero', () => {
    // Arrange
    const isoDate = '2026-11-04';
    // Act
    const date = subtractDays(isoDate, 0);
    // Assert
    expect(date).toBe('2026-11-04');
  });

  it('should_throw_when_date_is_not_iso_formatted', () => {
    // Arrange
    const invalidDate = '04/11/2026';
    // Act
    const call = () => subtractDays(invalidDate, 1);
    // Assert
    expect(call).toThrow(RangeError);
  });
});

describe('lastDayOfMonth', () => {
  it.each([
    { isoDate: '2026-11-04', expected: '2026-11-30' },
    { isoDate: '2026-12-15', expected: '2026-12-31' },
    { isoDate: '2026-02-01', expected: '2026-02-28' },
    { isoDate: '2028-02-10', expected: '2028-02-29' },
  ])('should_return_$expected_when_date_is_$isoDate', ({ isoDate, expected }) => {
    // Arrange
    // Act
    const lastDay = lastDayOfMonth(isoDate);
    // Assert
    expect(lastDay).toBe(expected);
  });

  it('should_throw_when_date_is_not_iso_formatted', () => {
    // Arrange
    const invalidDate = '30/11/2026';
    // Act
    const call = () => lastDayOfMonth(invalidDate);
    // Assert
    expect(call).toThrow(RangeError);
  });
});

describe('firstDayOfPreviousMonth', () => {
  it.each([
    { isoDate: '2026-11-01', expected: '2026-10-01' },
    { isoDate: '2026-11-17', expected: '2026-10-01' },
    { isoDate: '2026-01-01', expected: '2025-12-01' },
    { isoDate: '2026-03-31', expected: '2026-02-01' },
  ])('should_return_$expected_when_date_is_$isoDate', ({ isoDate, expected }) => {
    // Arrange
    // Act
    const previousMonth = firstDayOfPreviousMonth(isoDate);
    // Assert
    expect(previousMonth).toBe(expected);
  });

  it('should_throw_when_date_is_not_iso_formatted', () => {
    // Arrange
    const invalidDate = '2026-11';
    // Act
    const call = () => firstDayOfPreviousMonth(invalidDate);
    // Assert
    expect(call).toThrow(RangeError);
  });
});

describe('addMonthsKeepingDay', () => {
  it('should_keep_the_day_when_the_next_month_is_long_enough', () => {
    // Arrange & Act
    const result = addMonthsKeepingDay('2026-11-15', 1);
    // Assert
    expect(result).toBe('2026-12-15');
  });

  it('should_fall_on_the_last_day_when_the_next_month_is_shorter', () => {
    // Arrange & Act
    const result = addMonthsKeepingDay('2027-01-31', 1);
    // Assert
    expect(result).toBe('2027-02-28');
  });

  it('should_roll_the_year_when_adding_months_past_december', () => {
    // Arrange & Act
    const result = addMonthsKeepingDay('2026-12-10', 2);
    // Assert
    expect(result).toBe('2027-02-10');
  });

  it('should_return_the_same_date_when_adding_zero_months', () => {
    // Arrange & Act
    const result = addMonthsKeepingDay('2026-11-15', 0);
    // Assert
    expect(result).toBe('2026-11-15');
  });
});

describe('nextOccurrenceOfDay', () => {
  it('should_use_the_next_month_when_the_day_already_passed_this_month', () => {
    // Arrange & Act
    const result = nextOccurrenceOfDay('2026-10-10', '2026-11-12');
    // Assert
    expect(result).toBe('2026-12-10');
  });

  it('should_use_this_month_when_the_day_is_still_ahead', () => {
    // Arrange & Act
    const result = nextOccurrenceOfDay('2026-10-10', '2026-11-06');
    // Assert
    expect(result).toBe('2026-11-10');
  });

  it('should_use_today_when_the_day_is_today', () => {
    // Arrange & Act
    const result = nextOccurrenceOfDay('2026-10-10', '2026-11-10');
    // Assert
    expect(result).toBe('2026-11-10');
  });

  it('should_fall_on_the_last_day_when_the_day_does_not_exist_in_the_month', () => {
    // Arrange & Act
    const result = nextOccurrenceOfDay('2026-10-31', '2027-02-05');
    // Assert
    expect(result).toBe('2027-02-28');
  });
});

describe('addDays', () => {
  it('should_cross_the_month_boundary_when_adding_days_to_the_last_day', () => {
    // Arrange
    const isoDate = '2026-11-30';
    // Act
    const date = addDays(isoDate, 1);
    // Assert
    expect(date).toBe('2026-12-01');
  });

  it('should_return_the_same_date_when_adding_zero_days', () => {
    // Arrange
    const isoDate = '2027-02-28';
    // Act
    const date = addDays(isoDate, 0);
    // Assert
    expect(date).toBe('2027-02-28');
  });
});
