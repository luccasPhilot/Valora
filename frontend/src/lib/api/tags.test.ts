import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api-client';
import { createTag, listTags, renameTag } from './tags';

const TAG = { id: '66666666-6666-4666-8666-666666666666', name: 'Viagem', transactionCount: 2 };

function stubResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init: RequestInit = {}) =>
    Promise.resolve(Response.json(body, { status })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listTags', () => {
  it('should_return_the_items_when_the_response_is_valid', async () => {
    // Arrange
    stubResponse({ items: [TAG] });
    // Act
    const tags = await listTags();
    // Assert
    expect(tags).toEqual([TAG]);
  });

  it('should_reject_when_a_tag_has_no_transaction_count', async () => {
    // Arrange
    stubResponse({ items: [{ id: TAG.id, name: TAG.name }] });
    // Act
    const result = listTags();
    // Assert
    await expect(result).rejects.toBeInstanceOf(Error);
  });
});

describe('createTag', () => {
  it('should_post_the_name_when_creating', async () => {
    // Arrange
    const fetchMock = stubResponse(TAG, 201);
    // Act
    await createTag('Viagem');
    // Assert
    const [input, init] = fetchMock.mock.calls[0] ?? ['', {}];
    expect({ input: String(input), method: init?.method, body: init?.body }).toEqual({
      input: '/api/v1/tags',
      method: 'POST',
      body: JSON.stringify({ name: 'Viagem' }),
    });
  });

  it('should_throw_an_api_error_with_the_code_when_the_name_is_taken', async () => {
    // Arrange
    stubResponse({ error: { code: 'TAG_ALREADY_EXISTS', message: 'x', details: [] } }, 409);
    // Act
    const result = createTag('viagem');
    // Assert
    await expect(result).rejects.toMatchObject({ code: 'TAG_ALREADY_EXISTS' });
    await expect(result).rejects.toBeInstanceOf(ApiError);
  });
});

describe('renameTag', () => {
  it('should_patch_the_tag_url_when_renaming', async () => {
    // Arrange
    const fetchMock = stubResponse({ ...TAG, name: 'Viagem Chile' });
    // Act
    await renameTag(TAG.id, 'Viagem Chile');
    // Assert
    const [input, init] = fetchMock.mock.calls[0] ?? ['', {}];
    expect({ input: String(input), method: init?.method }).toEqual({
      input: `/api/v1/tags/${TAG.id}`,
      method: 'PATCH',
    });
  });
});
