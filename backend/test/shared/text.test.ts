import { describe, expect, it } from 'vitest';

import { normalizeDescription } from '../../src/shared/text.js';

describe('normalizeDescription', () => {
  it('should_remove_accents_and_extra_spaces_when_description_has_both', () => {
    // Arrange
    const description = '  Farmácia   São João ';
    // Act
    const normalized = normalizeDescription(description);
    // Assert
    expect(normalized).toBe('FARMACIA SAO JOAO');
  });

  it('should_uppercase_when_description_is_lowercase', () => {
    // Arrange
    const description = 'padaria do bairro';
    // Act
    const normalized = normalizeDescription(description);
    // Assert
    expect(normalized).toBe('PADARIA DO BAIRRO');
  });

  it('should_replace_cedilla_when_description_has_c_cedilla', () => {
    // Arrange
    const description = 'Açaí da praça';
    // Act
    const normalized = normalizeDescription(description);
    // Assert
    expect(normalized).toBe('ACAI DA PRACA');
  });

  it('should_collapse_tabs_and_line_breaks_when_description_has_them', () => {
    // Arrange
    const description = 'PIX\tENVIADO\nMERCADO';
    // Act
    const normalized = normalizeDescription(description);
    // Assert
    expect(normalized).toBe('PIX ENVIADO MERCADO');
  });

  it('should_return_empty_string_when_description_is_only_spaces', () => {
    // Arrange
    const description = '   ';
    // Act
    const normalized = normalizeDescription(description);
    // Assert
    expect(normalized).toBe('');
  });

  it('should_keep_digits_and_symbols_when_description_has_them', () => {
    // Arrange
    const description = 'Uber *Trip 12/03';
    // Act
    const normalized = normalizeDescription(description);
    // Assert
    expect(normalized).toBe('UBER *TRIP 12/03');
  });
});
