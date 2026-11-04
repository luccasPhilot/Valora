import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { API_PREFIX } from '../../src/app.js';
import { NotFoundError } from '../../src/shared/errors.js';
import { buildTestApp } from '../helpers/test-app.js';

const SECRET_DESCRIPTION = 'PAGAMENTO FARMACIA 89,90';

function registerFailingRoutes(app: FastifyInstance): void {
  app.register(
    async (instance) => {
      const typed = instance.withTypeProvider<ZodTypeProvider>();
      typed.post(
        '/echo',
        { schema: { body: z.object({ amountCents: z.int() }) } },
        async () => ({}),
      );
      instance.get('/missing', async () => {
        throw new NotFoundError('Transação 123 não encontrada ao editar a categoria');
      });
      instance.get('/boom', async () => {
        throw new Error(`falha ao gravar ${SECRET_DESCRIPTION}`);
      });
    },
    { prefix: API_PREFIX },
  );
}

describe('error format', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  function startApp(): FastifyInstance {
    app = buildTestApp().app;
    registerFailingRoutes(app);
    return app;
  }

  it('should_answer_400_with_validation_error_when_body_is_invalid', async () => {
    // Arrange
    const server = startApp();
    // Act
    const response = await server.inject({
      method: 'POST',
      url: `${API_PREFIX}/echo`,
      payload: { amountCents: 89.9 },
    });
    // Assert
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('should_list_each_invalid_field_when_validation_fails', async () => {
    // Arrange
    const server = startApp();
    // Act
    const response = await server.inject({
      method: 'POST',
      url: `${API_PREFIX}/echo`,
      payload: { amountCents: 'abc' },
    });
    // Assert
    expect(response.json().error.details).toEqual([
      expect.objectContaining({ field: 'amountCents', message: expect.any(String) }),
    ]);
  });

  it('should_answer_400_when_body_is_not_valid_json', async () => {
    // Arrange
    const server = startApp();
    // Act
    const response = await server.inject({
      method: 'POST',
      url: `${API_PREFIX}/echo`,
      headers: { 'content-type': 'application/json' },
      payload: '{ nao e json',
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });

  it('should_answer_404_with_domain_message_when_route_throws_not_found', async () => {
    // Arrange
    const server = startApp();
    // Act
    const response = await server.inject({ method: 'GET', url: `${API_PREFIX}/missing` });
    // Assert
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Transação 123 não encontrada ao editar a categoria',
        details: [],
      },
    });
  });

  it('should_answer_404_in_standard_format_when_route_is_outside_the_api_prefix', async () => {
    // Arrange
    const server = startApp();
    // Act
    const response = await server.inject({ method: 'GET', url: '/health' });
    // Assert
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('should_answer_500_without_internal_message_when_route_throws_unexpected_error', async () => {
    // Arrange
    const server = startApp();
    // Act
    const response = await server.inject({ method: 'GET', url: `${API_PREFIX}/boom` });
    // Assert
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor', details: [] },
    });
  });

  it('should_not_leak_the_stack_or_error_message_when_error_is_unexpected', async () => {
    // Arrange
    const server = startApp();
    // Act
    const response = await server.inject({ method: 'GET', url: `${API_PREFIX}/boom` });
    // Assert
    expect(response.body).not.toMatch(/FARMACIA|stack|\.ts:/);
  });
});
