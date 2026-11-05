import { describe, expect, it } from 'vitest';

import { calculateAccountTotals } from '../../../src/modules/accounts/account-totals.js';

type AccountForTotals = Parameters<typeof calculateAccountTotals>[0][number];

const CHECKING: AccountForTotals = {
  type: 'checking',
  isHidden: false,
  balanceCents: 300000,
  availableLimitCents: null,
};
const SAVINGS: AccountForTotals = {
  type: 'savings',
  isHidden: false,
  balanceCents: 185032,
  availableLimitCents: null,
};
const CREDIT_CARD: AccountForTotals = {
  type: 'credit_card',
  isHidden: false,
  balanceCents: 90000,
  availableLimitCents: 410000,
};
const CASH: AccountForTotals = {
  type: 'cash',
  isHidden: false,
  balanceCents: null,
  availableLimitCents: null,
};

describe('calculateAccountTotals', () => {
  it('should_sum_checking_and_savings_balances_when_a_card_exists', () => {
    // Arrange
    const accounts = [CHECKING, SAVINGS, CREDIT_CARD];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals.totalBalanceCents).toBe(485032);
  });

  it('should_sum_the_current_bills_of_the_cards_when_they_are_not_hidden', () => {
    // Arrange
    const accounts = [CHECKING, CREDIT_CARD, { ...CREDIT_CARD, balanceCents: 15000 }];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals.openCreditCardBillsCents).toBe(105000);
  });

  it('should_sum_the_available_limit_of_the_cards_when_they_are_not_hidden', () => {
    // Arrange
    const accounts = [CREDIT_CARD, { ...CREDIT_CARD, availableLimitCents: 90000 }];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals.availableCreditCents).toBe(500000);
  });

  it('should_leave_a_hidden_account_out_of_the_balance_when_it_is_hidden', () => {
    // Arrange
    const accounts = [CHECKING, { ...SAVINGS, isHidden: true }];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals.totalBalanceCents).toBe(300000);
  });

  it('should_leave_a_hidden_card_out_of_bills_and_limit_when_it_is_hidden', () => {
    // Arrange
    const accounts = [{ ...CREDIT_CARD, isHidden: true }];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals).toEqual({
      totalBalanceCents: 0,
      openCreditCardBillsCents: 0,
      availableCreditCents: 0,
    });
  });

  it('should_reduce_the_total_when_the_checking_account_is_in_overdraft', () => {
    // Arrange
    const accounts = [
      { ...CHECKING, balanceCents: -20000 },
      { ...SAVINGS, balanceCents: 100000 },
    ];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals.totalBalanceCents).toBe(80000);
  });

  it('should_ignore_the_cash_account_when_it_has_no_balance', () => {
    // Arrange
    const accounts = [CHECKING, CASH];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals.totalBalanceCents).toBe(300000);
  });

  it('should_return_zeros_when_there_are_no_accounts', () => {
    // Arrange
    const accounts: AccountForTotals[] = [];
    // Act
    const totals = calculateAccountTotals(accounts);
    // Assert
    expect(totals).toEqual({
      totalBalanceCents: 0,
      openCreditCardBillsCents: 0,
      availableCreditCents: 0,
    });
  });
});
