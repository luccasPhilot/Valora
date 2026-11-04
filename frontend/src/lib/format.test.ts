import { describe, expect, it } from 'vitest';

import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDayHeader,
  formatMonth,
  formatPercent,
  formatSignedCurrency,
} from './format';

describe('formatCurrency', () => {
  it('should_format_reais_when_cents_are_given', () => {
    // Arrange
    const cents = 123456;
    // Act
    const text = formatCurrency(cents);
    // Assert
    expect(text).toBe('R$ 1.234,56');
  });

  it('should_format_zero_when_cents_are_zero', () => {
    // Arrange
    const cents = 0;
    // Act
    const text = formatCurrency(cents);
    // Assert
    expect(text).toBe('R$ 0,00');
  });

  it('should_throw_when_cents_are_not_an_integer', () => {
    // Arrange
    const cents = 89.9;
    // Act
    const call = () => formatCurrency(cents);
    // Assert
    expect(call).toThrow(RangeError);
  });

  it('should_use_typographic_minus_when_value_is_negative', () => {
    // Arrange
    const cents = -8990;
    // Act
    const text = formatCurrency(cents);
    // Assert
    expect(text).toBe('−R$ 89,90');
  });
});

describe('formatSignedCurrency', () => {
  it('should_prefix_plus_when_value_is_income', () => {
    // Arrange
    const cents = 5000;
    // Act
    const text = formatSignedCurrency(cents);
    // Assert
    expect(text).toBe('+ R$ 50,00');
  });

  it('should_prefix_typographic_minus_when_value_is_expense', () => {
    // Arrange
    const cents = -8990;
    // Act
    const text = formatSignedCurrency(cents);
    // Assert
    expect(text).toBe('− R$ 89,90');
  });

  it('should_not_prefix_sign_when_value_is_zero', () => {
    // Arrange
    const cents = 0;
    // Act
    const text = formatSignedCurrency(cents);
    // Assert
    expect(text).toBe('R$ 0,00');
  });

  it('should_throw_when_cents_are_not_an_integer', () => {
    // Arrange
    const cents = 0.5;
    // Act
    const call = () => formatSignedCurrency(cents);
    // Assert
    expect(call).toThrow(RangeError);
  });
});

describe('formatCompactCurrency', () => {
  it('should_abbreviate_thousands_when_value_is_in_the_thousands', () => {
    // Arrange
    const cents = 120000;
    // Act
    const text = formatCompactCurrency(cents);
    // Assert
    expect(text).toBe('R$ 1,2 mil');
  });

  it('should_abbreviate_millions_when_value_is_in_the_millions', () => {
    // Arrange
    const cents = 340000000;
    // Act
    const text = formatCompactCurrency(cents);
    // Assert
    expect(text).toBe('R$ 3,4 mi');
  });
});

describe('formatPercent', () => {
  it('should_use_decimal_comma_when_ratio_has_a_fraction', () => {
    // Arrange
    const ratio = 0.125;
    // Act
    const text = formatPercent(ratio);
    // Assert
    expect(text).toBe('12,5%');
  });
});

describe('formatDate', () => {
  it('should_format_day_month_year_when_iso_date_is_given', () => {
    // Arrange
    const isoDate = '2026-11-03';
    // Act
    const text = formatDate(isoDate);
    // Assert
    expect(text).toBe('03/11/2026');
  });

  it('should_throw_when_date_is_not_iso_formatted', () => {
    // Arrange
    const invalidDate = '03/11/2026';
    // Act
    const call = () => formatDate(invalidDate);
    // Assert
    expect(call).toThrow(RangeError);
  });
});

describe('formatMonth', () => {
  it('should_write_month_name_and_year_when_iso_date_is_given', () => {
    // Arrange
    const isoDate = '2026-11-03';
    // Act
    const text = formatMonth(isoDate);
    // Assert
    expect(text).toBe('novembro de 2026');
  });
});

describe('formatDayHeader', () => {
  it('should_return_weekday_and_date_when_day_is_older_than_yesterday', () => {
    // Arrange
    const now = new Date('2026-11-10T15:00:00Z');
    // Act
    const text = formatDayHeader('2026-11-03', now);
    // Assert
    expect(text).toBe('ter., 3 de nov.');
  });

  it('should_return_today_when_day_is_the_current_sao_paulo_day', () => {
    // Arrange
    const now = new Date('2026-11-10T15:00:00Z');
    // Act
    const text = formatDayHeader('2026-11-10', now);
    // Assert
    expect(text).toBe('Hoje');
  });

  it('should_return_yesterday_when_day_is_the_previous_sao_paulo_day', () => {
    // Arrange
    const now = new Date('2026-11-10T15:00:00Z');
    // Act
    const text = formatDayHeader('2026-11-09', now);
    // Assert
    expect(text).toBe('Ontem');
  });

  it('should_return_today_when_device_is_in_utc_after_midnight_but_sao_paulo_is_not', () => {
    // Arrange: 01:00 UTC de 4 de novembro ainda é 3 de novembro em São Paulo.
    const now = new Date('2026-11-04T01:00:00Z');
    // Act
    const text = formatDayHeader('2026-11-03', now);
    // Assert
    expect(text).toBe('Hoje');
  });

  it('should_return_yesterday_across_month_boundary_when_today_is_first_day', () => {
    // Arrange
    const now = new Date('2026-12-01T15:00:00Z');
    // Act
    const text = formatDayHeader('2026-11-30', now);
    // Assert
    expect(text).toBe('Ontem');
  });
});
