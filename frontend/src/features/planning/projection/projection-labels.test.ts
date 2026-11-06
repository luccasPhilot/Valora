import { describe, expect, it } from 'vitest';

import type { Projection } from '@/lib/api/projection';

import { describeNegativeBalance, projectionEndDate } from './projection-labels';

function projection(overrides: Partial<Projection> = {}): Projection {
  return {
    date: '2026-11-05',
    startBalanceCents: 100000,
    plannedIncomeCents: 0,
    plannedExpenseCents: 0,
    billsDueCents: 0,
    projectedBalanceCents: 100000,
    lowestBalanceCents: 100000,
    lowestBalanceDate: '2026-11-05',
    daily: [
      { date: '2026-11-05', balanceCents: 100000 },
      { date: '2026-11-06', balanceCents: 100000 },
    ],
    events: [],
    warnings: [],
    ...overrides,
  };
}

describe('describeNegativeBalance', () => {
  it('should_name_the_day_when_the_lowest_balance_is_negative', () => {
    // Arrange
    const tight = projection({ lowestBalanceCents: -50000, lowestBalanceDate: '2026-11-10' });
    // Act
    const message = describeNegativeBalance(tight);
    // Assert
    expect(message).toBe('Saldo negativo em 10/11');
  });

  it('should_return_nothing_when_the_lowest_balance_is_zero', () => {
    // Arrange
    const exactlyZero = projection({ lowestBalanceCents: 0 });
    // Act
    const message = describeNegativeBalance(exactlyZero);
    // Assert
    expect(message).toBeNull();
  });

  it('should_return_nothing_when_the_balance_stays_positive', () => {
    // Arrange
    const comfortable = projection();
    // Act
    const message = describeNegativeBalance(comfortable);
    // Assert
    expect(message).toBeNull();
  });
});

describe('projectionEndDate', () => {
  it('should_return_the_last_day_of_the_series_when_there_are_several_days', () => {
    // Arrange
    const month = projection();
    // Act
    const endDate = projectionEndDate(month);
    // Assert
    expect(endDate).toBe('2026-11-06');
  });

  it('should_fall_back_to_today_when_the_series_is_empty', () => {
    // Arrange
    const empty = projection({ daily: [] });
    // Act
    const endDate = projectionEndDate(empty);
    // Assert
    expect(endDate).toBe('2026-11-05');
  });
});
