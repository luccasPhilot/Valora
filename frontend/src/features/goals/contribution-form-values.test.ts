import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTION_MESSAGES,
  type ContributionFormValues,
  toContributionInput,
  validateContribution,
} from './contribution-form-values';

const TODAY = '2026-11-15';

function values(overrides: Partial<ContributionFormValues> = {}): ContributionFormValues {
  return { amountDigits: '50000', date: TODAY, ...overrides };
}

describe('validateContribution', () => {
  it('should_have_no_errors_when_a_deposit_is_valid', () => {
    // Arrange
    const context = { type: 'deposit', savedCents: 0, today: TODAY } as const;
    // Act
    const errors = validateContribution(values(), context);
    // Assert
    expect(errors).toEqual({});
  });

  it('should_ask_for_an_amount_when_it_is_zero', () => {
    // Arrange
    const context = { type: 'deposit', savedCents: 0, today: TODAY } as const;
    // Act
    const errors = validateContribution(values({ amountDigits: '' }), context);
    // Assert
    expect(errors.amount).toBe(CONTRIBUTION_MESSAGES.amount);
  });

  it('should_refuse_a_withdrawal_when_it_is_above_the_saved_value', () => {
    // Arrange
    const context = { type: 'withdrawal', savedCents: 49999, today: TODAY } as const;
    // Act
    const errors = validateContribution(values(), context);
    // Assert
    expect(errors.amount).toBe(CONTRIBUTION_MESSAGES.withdrawalTooLarge);
  });

  it('should_accept_a_withdrawal_when_it_is_exactly_the_saved_value', () => {
    // Arrange
    const context = { type: 'withdrawal', savedCents: 50000, today: TODAY } as const;
    // Act
    const errors = validateContribution(values(), context);
    // Assert
    expect(errors).toEqual({});
  });

  it('should_accept_a_deposit_above_the_saved_value', () => {
    // Arrange
    const context = { type: 'deposit', savedCents: 100, today: TODAY } as const;
    // Act
    const errors = validateContribution(values(), context);
    // Assert
    expect(errors).toEqual({});
  });

  it('should_refuse_a_date_after_today', () => {
    // Arrange
    const context = { type: 'deposit', savedCents: 0, today: TODAY } as const;
    // Act
    const errors = validateContribution(values({ date: '2026-11-16' }), context);
    // Assert
    expect(errors.date).toBe(CONTRIBUTION_MESSAGES.date);
  });

  it('should_refuse_an_empty_date', () => {
    // Arrange
    const context = { type: 'deposit', savedCents: 0, today: TODAY } as const;
    // Act
    const errors = validateContribution(values({ date: '' }), context);
    // Assert
    expect(errors.date).toBe(CONTRIBUTION_MESSAGES.date);
  });
});

describe('toContributionInput', () => {
  it('should_build_the_input_with_a_positive_amount_in_cents_when_it_is_a_withdrawal', () => {
    // Arrange
    const filled = values({ amountDigits: '12345' });
    // Act
    const input = toContributionInput(filled, 'withdrawal');
    // Assert
    expect(input).toEqual({ type: 'withdrawal', amountCents: 12345, date: TODAY });
  });
});
