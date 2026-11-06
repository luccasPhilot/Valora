import { describe, expect, it } from 'vitest';

import {
  entryFieldErrorsFromApi,
  type EntryFormValues,
  validateEntryForm,
} from './entry-form-values';

const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

function values(overrides: Partial<EntryFormValues> = {}): EntryFormValues {
  return {
    type: 'expense',
    amountDigits: '180000',
    description: 'Aluguel',
    categoryId: CATEGORY_ID,
    dayOfMonth: '10',
    recurrence: 'monthly',
    startMonth: '2026-12',
    endMonth: '',
    ...overrides,
  };
}

describe('validateEntryForm', () => {
  it('should_build_the_input_with_positive_cents_when_the_form_is_valid', () => {
    // Arrange & Act
    const validation = validateEntryForm(values());
    // Assert
    expect(validation).toEqual({
      isValid: true,
      input: {
        description: 'Aluguel',
        type: 'expense',
        amountCents: 180000,
        categoryId: CATEGORY_ID,
        dayOfMonth: 10,
        recurrence: 'monthly',
        startMonth: '2026-12',
        endMonth: null,
        isActive: true,
      },
    });
  });

  it('should_ask_for_the_amount_when_it_is_empty', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ amountDigits: '' }));
    // Assert
    expect(validation).toEqual({ isValid: false, errors: { amount: 'Informe o valor' } });
  });

  it('should_ask_for_a_description_when_it_is_blank', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ description: '   ' }));
    // Assert
    expect(validation).toEqual({
      isValid: false,
      errors: { description: 'Informe uma descrição' },
    });
  });

  it('should_ask_for_a_category_when_none_is_chosen', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ categoryId: '' }));
    // Assert
    expect(validation).toEqual({ isValid: false, errors: { category: 'Escolha uma categoria' } });
  });

  it('should_refuse_day_32_when_the_day_is_out_of_range', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ dayOfMonth: '32' }));
    // Assert
    expect(validation).toEqual({ isValid: false, errors: { day: 'Informe um dia de 1 a 31' } });
  });

  it('should_refuse_the_day_when_the_field_is_empty', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ dayOfMonth: '' }));
    // Assert
    expect(validation).toEqual({ isValid: false, errors: { day: 'Informe um dia de 1 a 31' } });
  });

  it('should_accept_day_31_when_the_day_is_the_last_possible', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ dayOfMonth: '31' }));
    // Assert
    expect(validation.isValid).toBe(true);
  });

  it('should_refuse_the_end_month_when_it_is_before_the_start_month', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ endMonth: '2026-11' }));
    // Assert
    expect(validation).toEqual({
      isValid: false,
      errors: { end: 'O mês de fim não pode ser antes do início' },
    });
  });

  it('should_ignore_the_end_month_when_the_entry_does_not_repeat', () => {
    // Arrange & Act
    const validation = validateEntryForm(values({ recurrence: 'none', endMonth: '2026-01' }));
    // Assert
    expect(validation.isValid && validation.input.endMonth).toBeNull();
  });
});

describe('entryFieldErrorsFromApi', () => {
  it('should_map_api_fields_to_form_fields_when_the_api_refuses_the_entry', () => {
    // Arrange
    const details = [{ field: 'categoryId', message: 'Escolha uma categoria de despesa' }];
    // Act
    const errors = entryFieldErrorsFromApi(details);
    // Assert
    expect(errors).toEqual({ category: 'Escolha uma categoria de despesa' });
  });

  it('should_ignore_unknown_fields_when_the_api_sends_them', () => {
    // Arrange & Act
    const errors = entryFieldErrorsFromApi([{ field: 'other', message: 'x' }, 'not-an-object']);
    // Assert
    expect(errors).toEqual({});
  });
});
