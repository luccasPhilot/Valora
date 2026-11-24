import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-client';

import { isRetryable } from './query-client';

describe('isRetryable', () => {
  it('should_retry_when_the_api_could_not_be_reached', () => {
    // Arrange
    const error = new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com a API em /dashboard');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(true);
  });

  it('should_retry_when_fetch_fails_with_a_type_error', () => {
    // Arrange
    const error = new TypeError('Failed to fetch');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(true);
  });

  it('should_retry_when_the_server_answers_500', () => {
    // Arrange
    const error = new ApiError(500, 'INTERNAL_ERROR', 'Erro interno');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(true);
  });

  it('should_retry_when_the_server_answers_503', () => {
    // Arrange
    const error = new ApiError(503, 'UNEXPECTED_ERROR', 'Resposta inesperada (HTTP 503)');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(true);
  });

  it('should_not_retry_when_the_server_answers_400', () => {
    // Arrange
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Requisição inválida');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(false);
  });

  it('should_not_retry_when_the_server_answers_404', () => {
    // Arrange
    const error = new ApiError(404, 'NOT_FOUND', 'Não encontrado');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(false);
  });

  it('should_not_retry_when_the_response_is_out_of_the_contract', () => {
    // Arrange
    const error = new ApiError(200, 'UNEXPECTED_ERROR', 'Resposta fora do contrato em /dashboard');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(false);
  });

  it('should_not_retry_when_the_error_is_unknown', () => {
    // Arrange
    const error = new Error('falha qualquer');
    // Act
    const shouldRetry = isRetryable(error);
    // Assert
    expect(shouldRetry).toBe(false);
  });
});
