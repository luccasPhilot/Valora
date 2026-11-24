import { describe, expect, it } from 'vitest';

import { editAmountField, resolveAmountDigits } from './hidden-amount';

describe('editAmountField', () => {
  it('should_start_with_the_stored_digits_when_values_are_visible', () => {
    // Arrange / Act
    const field = editAmountField({ cents: -4500, areValuesHidden: false });
    // Assert
    expect(field).toEqual({ initialDigits: '4500', keptDigits: null });
  });

  it('should_start_empty_and_keep_the_stored_digits_when_values_are_hidden', () => {
    // Arrange / Act
    const field = editAmountField({ cents: -4500, areValuesHidden: true });
    // Assert
    expect(field).toEqual({ initialDigits: '', keptDigits: '4500' });
  });

  it('should_keep_nothing_when_the_stored_value_is_zero_and_values_are_hidden', () => {
    // Arrange / Act
    const field = editAmountField({ cents: 0, areValuesHidden: true });
    // Assert
    expect(field).toEqual({ initialDigits: '', keptDigits: '' });
  });
});

describe('resolveAmountDigits', () => {
  it('should_use_the_kept_digits_when_the_field_is_blank', () => {
    // Arrange / Act
    const digits = resolveAmountDigits('', '4500');
    // Assert
    expect(digits).toBe('4500');
  });

  it('should_use_the_typed_digits_when_the_field_was_filled', () => {
    // Arrange / Act
    const digits = resolveAmountDigits('5000', '4500');
    // Assert
    expect(digits).toBe('5000');
  });

  it('should_keep_the_blank_field_when_nothing_is_kept', () => {
    // Arrange / Act
    const digits = resolveAmountDigits('', null);
    // Assert
    expect(digits).toBe('');
  });
});
