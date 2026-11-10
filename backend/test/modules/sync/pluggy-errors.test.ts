import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  isItemNotFoundBody,
  PluggyItemNotFoundError,
  translateItemError,
} from '../../../src/modules/sync/pluggy-errors.js';

// Corpo de erro que o Pluggy devolveu para um item inexistente (conferido no sandbox, anonimizado).
const NOT_FOUND_BODY: unknown = JSON.parse(
  readFileSync(new URL('../../fixtures/pluggy/item-not-found-error.json', import.meta.url), 'utf8'),
);

describe('isItemNotFoundBody', () => {
  it('should_recognize_the_recorded_pluggy_not_found_body', () => {
    // Arrange
    // Act
    const isNotFound = isItemNotFoundBody(NOT_FOUND_BODY);
    // Assert
    expect(isNotFound).toBe(true);
  });

  it('should_not_recognize_a_server_error_body', () => {
    // Arrange
    const body = { message: 'internal error', code: 500, codeDescription: 'INTERNAL_ERROR' };
    // Act
    const isNotFound = isItemNotFoundBody(body);
    // Assert
    expect(isNotFound).toBe(false);
  });

  it('should_not_recognize_a_network_error', () => {
    // Arrange
    const error = new TypeError('fetch failed');
    // Act
    const isNotFound = isItemNotFoundBody(error);
    // Assert
    expect(isNotFound).toBe(false);
  });

  it.each([null, undefined, 'item not found', 404])('should_not_recognize_%s', (value) => {
    // Arrange
    // Act
    const isNotFound = isItemNotFoundBody(value);
    // Assert
    expect(isNotFound).toBe(false);
  });
});

describe('translateItemError', () => {
  it('should_turn_the_not_found_body_into_a_typed_error', () => {
    // Arrange
    // Act
    const translated = translateItemError(NOT_FOUND_BODY);
    // Assert
    expect(translated).toBeInstanceOf(PluggyItemNotFoundError);
  });

  it('should_keep_any_other_error_as_it_came', () => {
    // Arrange
    const error = new TypeError('fetch failed');
    // Act
    const translated = translateItemError(error);
    // Assert
    expect(translated).toBe(error);
  });
});
