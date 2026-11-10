import { describe, expect, it } from 'vitest';

import {
  describeClosedPositions,
  describePositions,
  investmentSubtypeLabel,
  investmentTypeInfo,
} from './investment-labels';

describe('investmentTypeInfo', () => {
  it('should_return_renda_fixa_when_the_type_is_fixed_income', () => {
    // Arrange & Act
    const info = investmentTypeInfo('FIXED_INCOME');
    // Assert
    expect(info.label).toBe('Renda fixa');
  });

  it.each([
    ['MUTUAL_FUND', 'Fundos'],
    ['EQUITY', 'Ações'],
    ['ETF', 'ETFs'],
    ['SECURITY', 'Títulos e previdência'],
    ['COE', 'COE'],
  ])('should_translate_%s_to_%s_when_the_type_is_known', (type, label) => {
    // Arrange & Act
    const info = investmentTypeInfo(type);
    // Assert
    expect(info.label).toBe(label);
  });

  it('should_fall_back_to_outros_when_the_type_is_unknown', () => {
    // Arrange & Act
    const info = investmentTypeInfo('NEW_TYPE');
    // Assert
    expect(info.label).toBe('Outros');
  });
});

describe('investmentSubtypeLabel', () => {
  it('should_translate_treasury_to_tesouro_direto_when_the_subtype_is_known', () => {
    // Arrange & Act
    const label = investmentSubtypeLabel('TREASURY');
    // Assert
    expect(label).toBe('Tesouro Direto');
  });

  it('should_keep_cdb_when_the_subtype_is_cdb', () => {
    // Arrange & Act
    const label = investmentSubtypeLabel('CDB');
    // Assert
    expect(label).toBe('CDB');
  });

  it('should_make_an_unknown_code_readable_when_it_has_no_translation', () => {
    // Arrange & Act
    const label = investmentSubtypeLabel('NEW_KIND_OF_FUND');
    // Assert
    expect(label).toBe('New kind of fund');
  });
});

describe('describePositions', () => {
  it('should_use_singular_when_there_is_one_position_in_one_institution', () => {
    // Arrange & Act
    const text = describePositions(1, 1);
    // Assert
    expect(text).toBe('1 posição em 1 instituição');
  });

  it('should_use_plural_when_there_are_several', () => {
    // Arrange & Act
    const text = describePositions(12, 3);
    // Assert
    expect(text).toBe('12 posições em 3 instituições');
  });
});

describe('describeClosedPositions', () => {
  it.each([
    [1, '1 posição zerada não aparece na lista'],
    [3, '3 posições zeradas não aparecem na lista'],
  ])('should_describe_%i_closed_positions', (count, expected) => {
    // Arrange & Act
    const text = describeClosedPositions(count);
    // Assert
    expect(text).toBe(expected);
  });
});
