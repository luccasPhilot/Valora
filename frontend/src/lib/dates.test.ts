import { describe, expect, it } from 'vitest';

import { todayInSaoPaulo, toSaoPauloDate } from './dates';

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
