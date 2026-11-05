import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiDelete, ApiError, apiGet, apiPost, apiPut } from './api-client';

const healthSchema = z.object({ status: z.string() });

function stubFetch(response: Response | Error): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('should_return_parsed_body_when_response_matches_the_schema', async () => {
    // Arrange
    stubFetch(Response.json({ status: 'ok' }));
    // Act
    const health = await apiGet('/health', healthSchema);
    // Assert
    expect(health).toEqual({ status: 'ok' });
  });

  it('should_throw_api_error_with_code_when_api_returns_the_standard_error', async () => {
    // Arrange
    const body = { error: { code: 'NOT_FOUND', message: 'Conta 7 não encontrada', details: [] } };
    stubFetch(Response.json(body, { status: 404 }));
    // Act
    const call = apiGet('/accounts/7', healthSchema);
    // Assert
    await expect(call).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('should_throw_api_error_when_error_body_is_not_the_standard_format', async () => {
    // Arrange
    stubFetch(new Response('<html>bad gateway</html>', { status: 502 }));
    // Act
    const call = apiGet('/health', healthSchema);
    // Assert
    await expect(call).rejects.toMatchObject({ status: 502, code: 'UNEXPECTED_ERROR' });
  });

  it('should_throw_api_error_when_response_does_not_match_the_schema', async () => {
    // Arrange
    stubFetch(Response.json({ status: 42 }));
    // Act
    const call = apiGet('/health', healthSchema);
    // Assert
    await expect(call).rejects.toBeInstanceOf(ApiError);
  });

  it('should_throw_network_error_when_fetch_fails', async () => {
    // Arrange
    stubFetch(new TypeError('Failed to fetch'));
    // Act
    const call = apiGet('/health', healthSchema);
    // Assert
    await expect(call).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

function lastFetchCall(): [string, RequestInit] {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  if (!call) throw new Error('Teste: fetch não foi chamado');
  return [String(call[0]), call[1] ?? {}];
}

describe('apiPost e apiPut', () => {
  it('should_send_the_body_as_json_with_the_method_when_posting', async () => {
    // Arrange
    stubFetch(Response.json({ status: 'ok' }, { status: 201 }));
    // Act
    await apiPost('/categories', { name: 'Pets' }, healthSchema);
    // Assert
    const [url, init] = lastFetchCall();
    expect({ url, method: init.method, body: init.body, headers: init.headers }).toEqual({
      url: '/api/v1/categories',
      method: 'POST',
      body: '{"name":"Pets"}',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  });

  it('should_not_send_a_body_or_content_type_when_posting_without_body', async () => {
    // Arrange
    stubFetch(Response.json({ status: 'ok' }));
    // Act
    await apiPost('/categories/1/archive', undefined, healthSchema);
    // Assert
    const [, init] = lastFetchCall();
    expect({ body: init.body, headers: init.headers }).toEqual({
      body: undefined,
      headers: { Accept: 'application/json' },
    });
  });

  it('should_use_put_when_updating', async () => {
    // Arrange
    stubFetch(Response.json({ status: 'ok' }));
    // Act
    await apiPut('/categories/1', { name: 'Pets' }, healthSchema);
    // Assert
    expect(lastFetchCall()[1].method).toBe('PUT');
  });

  it('should_throw_api_error_with_code_when_the_api_answers_409', async () => {
    // Arrange
    const body = { error: { code: 'CATEGORY_NAME_TAKEN', message: 'Já existe', details: [] } };
    stubFetch(Response.json(body, { status: 409 }));
    // Act
    const call = apiPost('/categories', { name: 'Lazer' }, healthSchema);
    // Assert
    await expect(call).rejects.toMatchObject({ status: 409, code: 'CATEGORY_NAME_TAKEN' });
  });
});

describe('apiDelete', () => {
  it('should_resolve_without_reading_a_body_when_the_api_answers_204', async () => {
    // Arrange
    stubFetch(new Response(null, { status: 204 }));
    // Act
    const call = apiDelete('/category-rules/1');
    // Assert
    await expect(call).resolves.toBeUndefined();
  });

  it('should_throw_api_error_when_the_rule_does_not_exist', async () => {
    // Arrange
    const body = { error: { code: 'NOT_FOUND', message: 'Regra 1 não existe', details: [] } };
    stubFetch(Response.json(body, { status: 404 }));
    // Act
    const call = apiDelete('/category-rules/1');
    // Assert
    await expect(call).rejects.toBeInstanceOf(ApiError);
  });
});
