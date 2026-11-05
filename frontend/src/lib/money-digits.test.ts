import { describe, expect, it } from 'vitest';

import { centsToDigits, digitsToCents, extractMoneyDigits, MAX_MONEY_DIGITS } from './money-digits';

describe('extractMoneyDigits', () => {
  it.each([
    { text: 'R$ 0,089', expected: '89' },
    { text: 'R$ 89,90', expected: '8990' },
    { text: '', expected: '' },
    { text: '000', expected: '' },
    { text: 'abc', expected: '' },
  ])(
    'should_return_the_digits_without_leading_zeros_when_the_text_is_$text',
    ({ text, expected }) => {
      // Arrange
      // Act
      const digits = extractMoneyDigits(text);
      // Assert
      expect(digits).toBe(expected);
    },
  );

  it('should_accept_exactly_the_maximum_number_of_digits', () => {
    // Arrange
    const text = '9'.repeat(MAX_MONEY_DIGITS);
    // Act
    const digits = extractMoneyDigits(text);
    // Assert
    expect(digits).toBe(text);
  });

  it('should_return_null_when_there_is_one_digit_more_than_the_maximum', () => {
    // Arrange
    const text = '9'.repeat(MAX_MONEY_DIGITS + 1);
    // Act
    const digits = extractMoneyDigits(text);
    // Assert
    expect(digits).toBeNull();
  });
});

describe('digitsToCents', () => {
  it.each([
    { digits: '', expected: 0 },
    { digits: '8990', expected: 8990 },
    { digits: '9'.repeat(MAX_MONEY_DIGITS), expected: 9_999_999_999 },
  ])('should_return_the_integer_cents_when_the_digits_are_$digits', ({ digits, expected }) => {
    // Arrange
    // Act
    const cents = digitsToCents(digits);
    // Assert
    expect(cents).toBe(expected);
  });
});

describe('centsToDigits', () => {
  it.each([
    { cents: 8990, expected: '8990' },
    { cents: 0, expected: '' },
  ])('should_return_the_digits_when_the_cents_are_$cents', ({ cents, expected }) => {
    // Arrange
    // Act
    const digits = centsToDigits(cents);
    // Assert
    expect(digits).toBe(expected);
  });
});
