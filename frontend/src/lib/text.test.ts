import { describe, expect, it } from 'vitest';

import { normalizeSearchText } from './text';

describe('normalizeSearchText', () => {
  it.each([
    { text: 'Alimentação', expected: 'alimentacao' },
    { text: '  Saúde  ', expected: 'saude' },
    { text: '', expected: '' },
  ])('should_return_$expected_when_text_is_"$text"', ({ text, expected }) => {
    // Arrange
    // Act
    const normalized = normalizeSearchText(text);
    // Assert
    expect(normalized).toBe(expected);
  });
});
