import { describe, expect, it } from 'vitest';

import { firstDayOfMonth, lastDayOfMonth, todayInSaoPaulo, toSaoPauloDate } from './dates';

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
  it.each([
    { isoDate: '2026-11-15', offset: 0, expected: '2026-11-01' },
    { isoDate: '2026-11-15', offset: -1, expected: '2026-10-01' },
    { isoDate: '2026-01-10', offset: -2, expected: '2025-11-01' },
  ])('should_return_$expected_when_date_is_$isoDate_and_offset_is_$offset', (scenario) => {
    // Arrange
    // Act
    const firstDay = firstDayOfMonth(scenario.isoDate, scenario.offset);
    // Assert
    expect(firstDay).toBe(scenario.expected);
  });

  it('should_throw_when_date_is_not_iso_formatted', () => {
    // Arrange
    // Act
    const call = () => firstDayOfMonth('15/11/2026');
    // Assert
    expect(call).toThrow(RangeError);
  });
});

describe('lastDayOfMonth', () => {
  it.each([
    { isoDate: '2026-11-04', offset: 0, expected: '2026-11-30' },
    { isoDate: '2026-12-04', offset: 0, expected: '2026-12-31' },
    { isoDate: '2026-03-31', offset: -1, expected: '2026-02-28' },
    { isoDate: '2028-03-10', offset: -1, expected: '2028-02-29' },
  ])('should_return_$expected_when_date_is_$isoDate_and_offset_is_$offset', (scenario) => {
    // Arrange
    // Act
    const lastDay = lastDayOfMonth(scenario.isoDate, scenario.offset);
    // Assert
    expect(lastDay).toBe(scenario.expected);
  });
});
