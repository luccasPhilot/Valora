import { describe, expect, it } from 'vitest';

import { buildValueChange } from '../../src/shared/value-change.js';

const TODAY = '2026-11-15';

describe('buildValueChange', () => {
  it('should_return_the_difference_in_cents_and_percent_when_there_is_a_previous_snapshot', () => {
    // Arrange
    const firstPoint = { date: '2026-11-01', cents: 400000 };
    // Act
    const change = buildValueChange(485032, firstPoint, TODAY);
    // Assert
    expect(change).toEqual({ cents: 85032, percent: 21.26 });
  });

  it('should_return_a_negative_change_when_the_value_dropped', () => {
    // Arrange
    const firstPoint = { date: '2026-11-01', cents: 100000 };
    // Act
    const change = buildValueChange(75000, firstPoint, TODAY);
    // Assert
    expect(change).toEqual({ cents: -25000, percent: -25 });
  });

  it('should_use_the_absolute_base_when_the_first_value_is_negative', () => {
    // Arrange
    const firstPoint = { date: '2026-11-01', cents: -100000 };
    // Act
    const change = buildValueChange(-50000, firstPoint, TODAY);
    // Assert
    expect(change).toEqual({ cents: 50000, percent: 50 });
  });

  it('should_return_null_percent_when_the_first_value_is_zero', () => {
    // Arrange
    const firstPoint = { date: '2026-11-01', cents: 0 };
    // Act
    const change = buildValueChange(10000, firstPoint, TODAY);
    // Assert
    expect(change).toEqual({ cents: 10000, percent: null });
  });

  it('should_return_null_when_the_first_snapshot_is_from_today', () => {
    // Arrange
    const firstPoint = { date: TODAY, cents: 400000 };
    // Act
    const change = buildValueChange(400000, firstPoint, TODAY);
    // Assert
    expect(change).toBeNull();
  });

  it('should_return_null_when_there_are_no_snapshots', () => {
    // Arrange
    // Act
    const change = buildValueChange(400000, undefined, TODAY);
    // Assert
    expect(change).toBeNull();
  });
});
