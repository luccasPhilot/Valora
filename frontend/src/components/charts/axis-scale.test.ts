import { describe, expect, it } from 'vitest';

import { niceValueAxis } from './axis-scale';

describe('niceValueAxis', () => {
  it('should_round_the_ticks_to_thousands_when_the_values_are_in_the_low_thousands', () => {
    // Arrange
    const values = [0, 340000];
    // Act
    const axis = niceValueAxis(values);
    // Assert
    expect(axis.ticks).toEqual([0, 100000, 200000, 300000, 400000]);
  });

  it('should_use_the_largest_tick_as_the_top_of_the_domain', () => {
    // Arrange
    const values = [120000, 340000];
    // Act
    const axis = niceValueAxis(values);
    // Assert
    expect(axis.domain).toEqual([0, 400000]);
  });

  it('should_include_the_zero_when_every_value_is_positive', () => {
    // Arrange
    const values = [900000, 950000];
    // Act
    const axis = niceValueAxis(values);
    // Assert
    expect(axis.ticks[0]).toBe(0);
  });

  it('should_extend_below_zero_with_the_same_step_when_there_are_negative_values', () => {
    // Arrange
    const values = [-150000, 300000];
    // Act
    const axis = niceValueAxis(values);
    // Assert
    expect(axis.ticks).toEqual([-200000, 0, 200000, 400000]);
  });

  it('should_keep_a_visible_axis_when_every_value_is_zero', () => {
    // Arrange
    const values = [0, 0, 0];
    // Act
    const axis = niceValueAxis(values);
    // Assert
    expect(axis.ticks.at(-1)).toBeGreaterThan(0);
  });

  it('should_return_whole_cents_when_the_step_would_be_fractional', () => {
    // Arrange
    const values = [0, 14000];
    // Act
    const axis = niceValueAxis(values);
    // Assert
    expect(axis.ticks.every((tick) => Number.isInteger(tick))).toBe(true);
  });
});
