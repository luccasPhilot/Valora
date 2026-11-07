import { describe, expect, it } from 'vitest';

import { goalProgress } from '../../../src/modules/goals/goal-progress.js';

const TARGET_CENTS = 1000000;

describe('goalProgress', () => {
  it('should_be_zero_when_nothing_was_saved', () => {
    // Arrange
    const savedCents = 0;
    // Act
    const percent = goalProgress(savedCents, TARGET_CENTS);
    // Assert
    expect(percent).toBe(0);
  });

  it('should_be_50_when_half_of_the_target_was_saved', () => {
    // Arrange
    const savedCents = 500000;
    // Act
    const percent = goalProgress(savedCents, TARGET_CENTS);
    // Assert
    expect(percent).toBe(50);
  });

  it('should_be_99_when_one_cent_is_missing', () => {
    // Arrange
    const savedCents = 999999;
    // Act
    const percent = goalProgress(savedCents, TARGET_CENTS);
    // Assert
    expect(percent).toBe(99);
  });

  it('should_be_100_when_the_target_was_reached_exactly', () => {
    // Arrange
    const savedCents = TARGET_CENTS;
    // Act
    const percent = goalProgress(savedCents, TARGET_CENTS);
    // Assert
    expect(percent).toBe(100);
  });

  it('should_cap_at_100_when_saved_is_above_the_target', () => {
    // Arrange
    const savedCents = 1200000;
    // Act
    const percent = goalProgress(savedCents, TARGET_CENTS);
    // Assert
    expect(percent).toBe(100);
  });

  it('should_round_down_when_the_percent_has_a_fraction', () => {
    // Arrange
    const savedCents = 1;
    const targetCents = 3;
    // Act
    const percent = goalProgress(savedCents, targetCents);
    // Assert
    expect(percent).toBe(33);
  });
});
