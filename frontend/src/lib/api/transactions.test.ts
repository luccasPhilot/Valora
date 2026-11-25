import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api-client';
import {
  changeCategoryOfMany,
  changeTransactionCategory,
  listReviewInbox,
  reviewAllTransactions,
} from './transactions';

const TRANSACTION = {
  id: '00000000-0000-4000-8000-000000000001',
  date: '2026-11-04',
  description: 'UBER *TRIP',
  amountCents: -2350,
  status: 'posted',
  source: 'open_finance',
  category: null,
  categorySource: 'none',
  account: { id: '55555555-5555-4555-8555-555555555555', name: 'Conta', type: 'checking' },
  installmentNumber: null,
  installmentTotal: null,
  possibleDuplicateOfId: null,
};

const SUGGESTION = {
  pattern: 'UBER *TRIP',
  categoryId: '22222222-2222-4222-8222-222222222222',
  categoryName: 'Transporte',
  categoryIcon: 'car',
  correctionCount: 2,
};

const LOADED_AT = '2026-11-04T12:00:00.000Z';

function stubResponse(body: unknown) {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init: RequestInit = {}) =>
    Promise.resolve(Response.json(body)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestOf(fetchMock: ReturnType<typeof stubResponse>) {
  const [input, init] = fetchMock.mock.calls[0] ?? ['', {}];
  return { url: new URL(String(input), 'http://localhost'), body: init?.body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API da caixa Para revisar', () => {
  it('should_ask_for_the_unreviewed_transactions_when_listing_the_inbox', async () => {
    // Arrange
    const fetchMock = stubResponse({
      items: [TRANSACTION],
      pagination: { page: 1, limit: 50, total: 1 },
      loadedAt: LOADED_AT,
    });
    // Act
    await listReviewInbox(1);
    // Assert
    expect(requestOf(fetchMock).url.searchParams.get('reviewed')).toBe('false');
  });

  it('should_reject_a_page_without_loaded_at', async () => {
    // Arrange
    stubResponse({ items: [], pagination: { page: 1, limit: 50, total: 0 } });
    // Act
    const listing = listReviewInbox(1);
    // Assert
    await expect(listing).rejects.toBeInstanceOf(ApiError);
  });

  it('should_send_until_when_marking_everything_as_reviewed', async () => {
    // Arrange
    const fetchMock = stubResponse({ reviewedCount: 3 });
    // Act
    await reviewAllTransactions(LOADED_AT);
    // Assert
    expect(JSON.parse(String(requestOf(fetchMock).body))).toEqual({ until: LOADED_AT });
  });
});

describe('API da troca de categoria', () => {
  it('should_return_the_rule_suggestion_after_changing_one_category', async () => {
    // Arrange
    stubResponse({ ...TRANSACTION, ruleSuggestion: SUGGESTION });
    // Act
    const update = await changeTransactionCategory(TRANSACTION.id, {
      categoryId: SUGGESTION.categoryId,
      applyAlways: false,
    });
    // Assert
    expect(update.ruleSuggestion).toEqual(SUGGESTION);
  });

  it('should_return_the_updated_count_after_changing_in_bulk', async () => {
    // Arrange
    stubResponse({ updatedCount: 5, ruleSuggestion: null });
    // Act
    const result = await changeCategoryOfMany([TRANSACTION.id], SUGGESTION.categoryId);
    // Assert
    expect(result).toEqual({ updatedCount: 5, ruleSuggestion: null });
  });
});
