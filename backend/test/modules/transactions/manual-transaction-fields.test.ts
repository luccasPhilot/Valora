import { describe, expect, it } from 'vitest';

import {
  buildManualChanges,
  signedAmountCents,
  typeOfAmount,
} from '../../../src/modules/transactions/manual-transaction-fields.js';

describe('signedAmountCents', () => {
  it('should_return_a_negative_amount_when_the_type_is_expense', () => {
    // Arrange
    // Act
    const amountCents = signedAmountCents('expense', 1250);
    // Assert
    expect(amountCents).toBe(-1250);
  });

  it('should_return_a_positive_amount_when_the_type_is_income', () => {
    // Arrange
    // Act
    const amountCents = signedAmountCents('income', 1250);
    // Assert
    expect(amountCents).toBe(1250);
  });
});

describe('typeOfAmount', () => {
  it.each([
    { amountCents: -1, expected: 'expense' },
    { amountCents: 1, expected: 'income' },
  ])(
    'should_return_the_right_type_when_the_amount_is_$amountCents',
    ({ amountCents, expected }) => {
      // Arrange
      // Act
      const type = typeOfAmount(amountCents);
      // Assert
      expect(type).toBe(expected);
    },
  );
});

describe('buildManualChanges', () => {
  it('should_change_nothing_when_the_patch_is_empty', () => {
    // Arrange
    // Act
    const changes = buildManualChanges(-1250, {});
    // Assert
    expect(changes).toEqual({});
  });

  it('should_keep_the_current_sign_when_only_the_amount_changes', () => {
    // Arrange
    // Act
    const changes = buildManualChanges(-1250, { amountCents: 1500 });
    // Assert
    expect(changes).toEqual({ amountCents: -1500 });
  });

  it('should_flip_the_sign_keeping_the_value_when_only_the_type_changes', () => {
    // Arrange
    // Act
    const changes = buildManualChanges(-1250, { type: 'income' });
    // Assert
    expect(changes).toEqual({ amountCents: 1250 });
  });

  it('should_refresh_the_normalized_description_when_the_description_changes', () => {
    // Arrange
    // Act
    const changes = buildManualChanges(-1250, { description: 'Padaria São João' });
    // Assert
    expect(changes).toEqual({
      description: 'Padaria São João',
      descriptionNormalized: 'PADARIA SAO JOAO',
    });
  });

  it('should_ignore_apply_always_when_building_the_columns', () => {
    // Arrange
    // Act
    const changes = buildManualChanges(-1250, { applyAlways: true });
    // Assert
    expect(changes).toEqual({});
  });
});
