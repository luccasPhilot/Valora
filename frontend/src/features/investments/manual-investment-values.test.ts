import { describe, expect, it } from 'vitest';

import {
  describeManualUpdate,
  EMPTY_FORM_VALUES,
  formValuesOf,
  STALE_AFTER_DAYS,
  toCreateInput,
  toEditChanges,
  validateCreate,
  validateEdit,
} from './manual-investment-values';

const FUND = {
  name: 'Fundo INCO',
  institutionName: 'INCO',
  type: 'MUTUAL_FUND',
  balanceCents: 2_500_000,
};

describe('describeManualUpdate', () => {
  it('should_show_the_date_in_pt_br_when_the_value_was_informed_on_a_day', () => {
    // Arrange & Act
    const info = describeManualUpdate('2026-11-10', '2026-11-15');
    // Assert
    expect(info.text).toBe('Atualizado em 10/11/2026');
  });

  it('should_not_be_stale_when_exactly_thirty_days_passed', () => {
    // Arrange & Act
    const info = describeManualUpdate('2026-10-16', '2026-11-15');
    // Assert
    expect(info.isStale).toBe(false);
  });

  it('should_be_stale_when_thirty_one_days_passed', () => {
    // Arrange & Act
    const info = describeManualUpdate('2026-10-15', '2026-11-15');
    // Assert
    expect(info.isStale).toBe(true);
  });

  it('should_be_stale_when_the_dates_cross_a_year_boundary', () => {
    // Arrange & Act
    const info = describeManualUpdate('2026-12-20', '2027-01-25');
    // Assert
    expect(info.isStale).toBe(true);
  });

  it('should_use_a_limit_of_thirty_days', () => {
    // Arrange & Act & Assert
    expect(STALE_AFTER_DAYS).toBe(30);
  });
});

describe('validateCreate', () => {
  it('should_return_no_errors_when_all_fields_are_filled', () => {
    // Arrange
    const values = { ...EMPTY_FORM_VALUES, name: 'Fundo', institutionName: 'INCO', digits: '100' };
    // Act & Assert
    expect(validateCreate(values)).toEqual({});
  });

  it('should_require_name_institution_and_value_when_the_form_is_empty', () => {
    // Arrange & Act
    const errors = validateCreate(EMPTY_FORM_VALUES);
    // Assert
    expect(Object.keys(errors).sort()).toEqual(['balance', 'institutionName', 'name']);
  });

  it('should_treat_spaces_only_as_empty_when_the_name_is_blank', () => {
    // Arrange
    const values = { ...EMPTY_FORM_VALUES, name: '   ', institutionName: 'INCO', digits: '100' };
    // Act & Assert
    expect(validateCreate(values).name).toBeDefined();
  });
});

describe('validateEdit', () => {
  it('should_not_require_the_value_when_editing', () => {
    // Arrange
    const values = formValuesOf(FUND, true);
    // Act & Assert
    expect(validateEdit(values)).toEqual({});
  });
});

describe('toCreateInput', () => {
  it('should_trim_the_texts_and_convert_the_digits_to_cents_when_creating', () => {
    // Arrange
    const values = {
      name: ' Binance ',
      institutionName: ' Binance',
      type: 'CRYPTO',
      digits: '1250000',
    } as const;
    // Act
    const input = toCreateInput(values);
    // Assert
    expect(input).toEqual({
      name: 'Binance',
      institutionName: 'Binance',
      type: 'CRYPTO',
      balanceCents: 1_250_000,
    });
  });
});

describe('toEditChanges', () => {
  it('should_send_only_the_name_when_only_the_name_changed', () => {
    // Arrange
    const initial = formValuesOf(FUND, false);
    // Act
    const changes = toEditChanges({ ...initial, name: 'INCO Renda' }, initial);
    // Assert
    expect(changes).toEqual({ name: 'INCO Renda' });
  });

  it('should_send_nothing_when_nothing_changed', () => {
    // Arrange
    const initial = formValuesOf(FUND, false);
    // Act & Assert
    expect(toEditChanges(initial, initial)).toEqual({});
  });

  it('should_send_the_value_when_the_digits_changed', () => {
    // Arrange
    const initial = formValuesOf(FUND, false);
    // Act
    const changes = toEditChanges({ ...initial, digits: '2600000' }, initial);
    // Assert
    expect(changes).toEqual({ balanceCents: 2_600_000 });
  });

  it('should_keep_the_value_when_values_are_hidden_and_the_field_stays_empty', () => {
    // Arrange
    const initial = formValuesOf(FUND, true);
    // Act
    const changes = toEditChanges({ ...initial, name: 'INCO Renda' }, initial);
    // Assert
    expect(changes).toEqual({ name: 'INCO Renda' });
  });

  it('should_start_with_an_empty_value_field_when_values_are_hidden', () => {
    // Arrange & Act
    const values = formValuesOf(FUND, true);
    // Assert
    expect(values.digits).toBe('');
  });

  it('should_fall_back_to_the_first_type_when_the_stored_type_is_unknown', () => {
    // Arrange & Act
    const values = formValuesOf({ ...FUND, type: 'SOMETHING' }, false);
    // Assert
    expect(values.type).toBe('FIXED_INCOME');
  });
});
