import { describe, expect, it } from 'vitest';

import { budgetPercent, budgetStatus } from '../../../src/modules/budgets/budget-status.js';

const LIMIT_CENTS = 100000;

describe('budgetStatus', () => {
  it('should_be_ok_when_spent_is_one_cent_below_80_percent', () => {
    // Arrange
    const spentCents = 79999;
    // Act
    const status = budgetStatus(spentCents, LIMIT_CENTS);
    // Assert
    expect(status).toBe('ok');
  });

  it('should_be_warning_when_spent_is_exactly_80_percent', () => {
    // Arrange
    const spentCents = 80000;
    // Act
    const status = budgetStatus(spentCents, LIMIT_CENTS);
    // Assert
    expect(status).toBe('warning');
  });

  it('should_be_warning_when_spent_is_exactly_the_limit', () => {
    // Arrange
    const spentCents = 100000;
    // Act
    const status = budgetStatus(spentCents, LIMIT_CENTS);
    // Assert
    expect(status).toBe('warning');
  });

  it('should_be_exceeded_when_spent_is_one_cent_above_the_limit', () => {
    // Arrange
    const spentCents = 100001;
    // Act
    const status = budgetStatus(spentCents, LIMIT_CENTS);
    // Assert
    expect(status).toBe('exceeded');
  });

  it('should_be_ok_when_nothing_was_spent', () => {
    // Arrange
    const spentCents = 0;
    // Act
    const status = budgetStatus(spentCents, LIMIT_CENTS);
    // Assert
    expect(status).toBe('ok');
  });

  it('should_be_exact_when_the_limit_is_not_a_multiple_of_five', () => {
    // Arrange: 80% de 1 centavo seria 0,8; um centavo gasto já passa de 80%.
    const spentCents = 1;
    // Act
    const status = budgetStatus(spentCents, 1);
    // Assert
    expect(status).toBe('warning');
  });
});

describe('budgetPercent', () => {
  it('should_round_down_when_the_percent_has_a_fraction', () => {
    // Arrange
    const spentCents = 82999;
    // Act
    const percent = budgetPercent(spentCents, LIMIT_CENTS);
    // Assert
    expect(percent).toBe(82);
  });

  it('should_be_zero_when_nothing_was_spent', () => {
    // Arrange
    const spentCents = 0;
    // Act
    const percent = budgetPercent(spentCents, LIMIT_CENTS);
    // Assert
    expect(percent).toBe(0);
  });
});
