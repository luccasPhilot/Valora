import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError, apiGet } from './api-client';

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
