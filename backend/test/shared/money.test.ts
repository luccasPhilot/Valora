import { describe, expect, it } from 'vitest';

import { centsSchema } from '../../src/shared/money.js';

describe('centsSchema', () => {
  it('should_accept_negative_integer_when_amount_is_an_outflow', () => {
    // Arrange
    const outflow = -8990;
    // Act
    const result = centsSchema.safeParse(outflow);
    // Assert
    expect(result.success).toBe(true);
  });

  it('should_accept_zero', () => {
    // Arrange
    const zero = 0;
    // Act
    const result = centsSchema.safeParse(zero);
    // Assert
    expect(result.success).toBe(true);
  });

  it('should_reject_value_when_it_has_decimal_places', () => {
    // Arrange
    const reais = 89.9;
    // Act
    const result = centsSchema.safeParse(reais);
    // Assert
    expect(result.success).toBe(false);
  });

  it('should_reject_value_when_it_exceeds_the_safe_integer_range', () => {
    // Arrange
    const tooBig = Number.MAX_SAFE_INTEGER + 2;
    // Act
    const result = centsSchema.safeParse(tooBig);
    // Assert
    expect(result.success).toBe(false);
  });

  it('should_reject_value_when_it_is_a_numeric_string', () => {
    // Arrange
    const text = '8990';
    // Act
    const result = centsSchema.safeParse(text);
    // Assert
    expect(result.success).toBe(false);
  });
});
