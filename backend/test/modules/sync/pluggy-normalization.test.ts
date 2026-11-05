import { describe, expect, it } from 'vitest';

import {
  normalizeAmount,
  toAccountType,
  toCents,
  toLastDigits,
} from '../../../src/modules/sync/pluggy-normalization.js';

describe('toCents', () => {
  it('should_round_to_integer_cents_when_value_has_floating_point_noise', () => {
    // Arrange: 89.9 * 100 é 8990.000000000002 em ponto flutuante.
    const amountInReais = 89.9;
    // Act
    const cents = toCents(amountInReais);
    // Assert
    expect(cents).toBe(8990);
  });

  it('should_keep_sign_when_balance_is_negative', () => {
    // Arrange
    const amountInReais = -1250.5;
    // Act
    const cents = toCents(amountInReais);
    // Assert
    expect(cents).toBe(-125050);
  });

  it('should_return_zero_when_value_is_zero', () => {
    // Arrange
    const amountInReais = 0;
    // Act
    const cents = toCents(amountInReais);
    // Assert
    expect(cents).toBe(0);
  });

  it('should_throw_when_cents_exceed_safe_integer', () => {
    // Arrange
    const amountInReais = Number.MAX_SAFE_INTEGER;
    // Act
    const call = () => toCents(amountInReais);
    // Assert
    expect(call).toThrow();
  });
});

describe('normalizeAmount', () => {
  it('should_return_negative_cents_when_purchase_of_89_90_is_a_debit', () => {
    // Arrange: na conta corrente o Pluggy já manda a saída negativa.
    const amountInReais = -89.9;
    // Act
    const cents = normalizeAmount(amountInReais, 'DEBIT');
    // Assert
    expect(cents).toBe(-8990);
  });

  it('should_return_negative_when_card_purchase_comes_positive', () => {
    // Arrange: no cartão o Pluggy manda a compra (DEBIT) positiva.
    const amountInReais = 120;
    // Act
    const cents = normalizeAmount(amountInReais, 'DEBIT');
    // Assert
    expect(cents).toBe(-12000);
  });

  it('should_return_positive_when_card_refund_comes_negative', () => {
    // Arrange: no cartão o Pluggy manda o estorno (CREDIT) negativo.
    const amountInReais = -45.3;
    // Act
    const cents = normalizeAmount(amountInReais, 'CREDIT');
    // Assert
    expect(cents).toBe(4530);
  });

  it('should_return_positive_when_account_credit_comes_positive', () => {
    // Arrange
    const amountInReais = 3200;
    // Act
    const cents = normalizeAmount(amountInReais, 'CREDIT');
    // Assert
    expect(cents).toBe(320000);
  });

  it('should_return_positive_zero_when_debit_amount_is_zero', () => {
    // Arrange
    const amountInReais = 0;
    // Act
    const cents = normalizeAmount(amountInReais, 'DEBIT');
    // Assert
    expect(Object.is(cents, 0)).toBe(true);
  });
});

describe('toAccountType', () => {
  it('should_return_credit_card_when_type_is_credit', () => {
    // Arrange & Act
    const accountType = toAccountType('CREDIT', 'CREDIT_CARD');
    // Assert
    expect(accountType).toBe('credit_card');
  });

  it('should_return_savings_when_subtype_is_savings_account', () => {
    // Arrange & Act
    const accountType = toAccountType('BANK', 'SAVINGS_ACCOUNT');
    // Assert
    expect(accountType).toBe('savings');
  });

  it('should_return_checking_when_subtype_is_checking_account', () => {
    // Arrange & Act
    const accountType = toAccountType('BANK', 'CHECKING_ACCOUNT');
    // Assert
    expect(accountType).toBe('checking');
  });

  it('should_return_checking_when_bank_subtype_is_missing', () => {
    // Arrange & Act
    const accountType = toAccountType('BANK', null);
    // Assert
    expect(accountType).toBe('checking');
  });
});

describe('toLastDigits', () => {
  it('should_keep_last_four_digits_when_number_has_separators', () => {
    // Arrange
    const accountNumber = '0001/12345-6';
    // Act
    const lastDigits = toLastDigits(accountNumber);
    // Assert
    expect(lastDigits).toBe('3456');
  });

  it('should_return_null_when_number_is_missing', () => {
    // Arrange & Act
    const lastDigits = toLastDigits(null);
    // Assert
    expect(lastDigits).toBeNull();
  });

  it('should_return_null_when_number_has_no_digits', () => {
    // Arrange & Act
    const lastDigits = toLastDigits('---');
    // Assert
    expect(lastDigits).toBeNull();
  });
});
