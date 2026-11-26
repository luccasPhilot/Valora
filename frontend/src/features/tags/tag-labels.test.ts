import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-client';

import { describeTagError, describeTransactionCount, isSameTagName } from './tag-labels';

describe('isSameTagName', () => {
  it('should_ignore_case_and_accents_when_comparing_names', () => {
    // Arrange
    const first = 'Aniversário';
    // Act
    const isSame = isSameTagName(first, ' aniversario ');
    // Assert
    expect(isSame).toBe(true);
  });

  it('should_tell_names_apart_when_they_differ_by_a_letter', () => {
    // Arrange
    const first = 'Viagem';
    // Act
    const isSame = isSameTagName(first, 'Viagens');
    // Assert
    expect(isSame).toBe(false);
  });
});

describe('describeTransactionCount', () => {
  it('should_use_the_singular_when_there_is_one_transaction', () => {
    // Arrange
    const count = 1;
    // Act
    const text = describeTransactionCount(count);
    // Assert
    expect(text).toBe('1 transação');
  });

  it('should_use_the_plural_when_there_are_many_transactions', () => {
    // Arrange
    const count = 8;
    // Act
    const text = describeTransactionCount(count);
    // Assert
    expect(text).toBe('8 transações');
  });
});

describe('describeTagError', () => {
  it('should_explain_a_repeated_name_when_the_api_answers_tag_already_exists', () => {
    // Arrange
    const error = new ApiError(409, 'TAG_ALREADY_EXISTS', 'repetida', []);
    // Act
    const message = describeTagError(error);
    // Assert
    expect(message).toBe('Já existe uma etiqueta com este nome.');
  });

  it('should_use_the_generic_message_when_the_error_is_unknown', () => {
    // Arrange
    const error = new Error('boom');
    // Act
    const message = describeTagError(error);
    // Assert
    expect(message).toBe('Não foi possível salvar. Tente de novo.');
  });
});
