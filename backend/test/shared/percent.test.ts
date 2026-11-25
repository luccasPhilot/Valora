import { describe, expect, it } from 'vitest';

import { percentWithOneDecimal } from '../../src/shared/percent.js';

describe('percentWithOneDecimal', () => {
  it('should_round_to_one_decimal_when_the_share_is_not_exact', () => {
    // Arrange
    // Act
    const percent = percentWithOneDecimal(1, 3);
    // Assert
    expect(percent).toBe(33.3);
  });

  it('should_round_half_up_when_the_second_decimal_is_five', () => {
    // Arrange
    // Act
    const percent = percentWithOneDecimal(1, 2000);
    // Assert
    expect(percent).toBe(0.1);
  });

  it('should_return_positive_zero_when_a_small_negative_share_rounds_to_zero', () => {
    // Arrange
    // Act
    const percent = percentWithOneDecimal(-1, 100000);
    // Assert
    expect(Object.is(percent, 0)).toBe(true);
  });

  it('should_return_zero_when_the_total_is_zero', () => {
    // Arrange
    // Act
    const percent = percentWithOneDecimal(0, 0);
    // Assert
    expect(percent).toBe(0);
  });

  it('should_return_a_negative_share_when_the_part_is_negative', () => {
    // Arrange
    // Act
    const percent = percentWithOneDecimal(-1000, 10000);
    // Assert
    expect(percent).toBe(-10);
  });
});
