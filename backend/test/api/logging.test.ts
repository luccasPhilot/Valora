import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { API_PREFIX } from '../../src/app.js';
import { buildTestApp, type LogLine } from '../helpers/test-app.js';

const SECRET_DESCRIPTION = 'PAGAMENTO FARMACIA 89,90';
const SECRET_TOKEN = 'token-super-secreto';

describe('request logging', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  function startApp(): { server: FastifyInstance; logLines: LogLine[] } {
    const testApp = buildTestApp();
    app = testApp.app;
    app.register(
      async (instance) => {
        const typed = instance.withTypeProvider<ZodTypeProvider>();
        typed.post(
          '/payments',
          { schema: { body: z.object({ description: z.string() }) } },
          async () => ({}),
        );
        instance.get('/payments', async () => ({}));
        instance.get('/boom', async () => {
          throw new Error(`falha ao gravar ${SECRET_DESCRIPTION}`);
        });
      },
      { prefix: API_PREFIX },
    );
    return { server: app, logLines: testApp.logLines };
  }

  it('should_log_method_path_status_and_duration_when_request_completes', async () => {
    // Arrange
    const { server, logLines } = startApp();
    // Act
    await server.inject({ method: 'GET', url: `${API_PREFIX}/payments` });
    // Assert
    expect(logLines.find((line) => line.msg === 'request completed')).toMatchObject({
      method: 'GET',
      path: `${API_PREFIX}/payments`,
      statusCode: 200,
      durationMs: expect.any(Number),
    });
  });

  it('should_write_a_single_line_per_request_when_it_completes', async () => {
    // Arrange
    const { server, logLines } = startApp();
    // Act
    await server.inject({ method: 'GET', url: `${API_PREFIX}/payments` });
    // Assert
    expect(logLines.filter((line) => line.msg === 'request completed')).toHaveLength(1);
  });

  it('should_not_log_the_body_when_request_has_one', async () => {
    // Arrange
    const { server, logLines } = startApp();
    // Act
    await server.inject({
      method: 'POST',
      url: `${API_PREFIX}/payments`,
      payload: { description: SECRET_DESCRIPTION },
    });
    // Assert
    expect(JSON.stringify(logLines)).not.toContain('FARMACIA');
  });

  it('should_not_log_the_query_string_when_request_has_one', async () => {
    // Arrange
    const { server, logLines } = startApp();
    // Act
    await server.inject({ method: 'GET', url: `${API_PREFIX}/payments?search=farmacia` });
    // Assert
    expect(JSON.stringify(logLines)).not.toContain('farmacia');
  });

  it('should_not_log_credentials_when_request_has_authorization_header', async () => {
    // Arrange
    const { server, logLines } = startApp();
    // Act
    await server.inject({
      method: 'GET',
      url: `${API_PREFIX}/payments`,
      headers: { authorization: `Bearer ${SECRET_TOKEN}`, cookie: `session=${SECRET_TOKEN}` },
    });
    // Assert
    expect(JSON.stringify(logLines)).not.toContain(SECRET_TOKEN);
  });

  it('should_log_only_error_type_and_route_when_route_throws_unexpected_error', async () => {
    // Arrange
    const { server, logLines } = startApp();
    // Act
    await server.inject({ method: 'GET', url: `${API_PREFIX}/boom?search=farmacia` });
    // Assert
    expect(logLines.find((line) => line.msg === 'unexpected error')).toMatchObject({
      errorType: 'Error',
      route: `${API_PREFIX}/boom`,
    });
  });

  it('should_not_log_the_error_message_when_route_throws_unexpected_error', async () => {
    // Arrange
    const { server, logLines } = startApp();
    // Act
    await server.inject({ method: 'GET', url: `${API_PREFIX}/boom?search=farmacia` });
    // Assert
    expect(JSON.stringify(logLines)).not.toMatch(/FARMACIA|farmacia/);
  });
});
