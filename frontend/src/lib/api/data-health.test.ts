import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDataHealth } from './data-health';
import { listRecentSyncRuns } from './sync';

const VALID_RESPONSE = {
  consents: [
    {
      connectionId: '11111111-1111-4111-8111-111111111111',
      institutionName: 'Itaú',
      expiresAt: '2026-12-28T15:00:00.000Z',
      daysLeft: 34,
    },
  ],
  divergences: [
    {
      accountId: '22222222-2222-4222-8222-222222222222',
      accountName: 'Conta corrente',
      from: '2026-11-03',
      to: '2026-11-04',
      differenceCents: -12000,
    },
  ],
  staleAccounts: [
    {
      accountId: '33333333-3333-4333-8333-333333333333',
      accountName: 'Cartão',
      lastTransactionDate: '2026-11-10',
      daysWithoutTransactions: 14,
    },
  ],
};

const SYNC_RUN = {
  id: '99999999-9999-4999-8999-999999999999',
  trigger: 'schedule',
  status: 'success',
  startedAt: '2026-11-24T10:00:00.000Z',
  finishedAt: '2026-11-24T10:02:00.000Z',
  stats: {
    accounts: 4,
    transactionsInserted: 12,
    transactionsUpdated: 3,
    transactionsRemoved: 0,
    investments: 2,
  },
  errorMessage: null,
};

function stubResponse(body: unknown) {
  const fetchMock = vi.fn((_input: RequestInfo | URL) => Promise.resolve(Response.json(body)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getDataHealth', () => {
  it('should_accept_the_documented_response', async () => {
    // Arrange
    stubResponse(VALID_RESPONSE);
    // Act
    const dataHealth = await getDataHealth();
    // Assert
    expect(dataHealth).toEqual(VALID_RESPONSE);
  });

  it('should_accept_a_consent_without_expiry', async () => {
    // Arrange
    const consent = { ...VALID_RESPONSE.consents[0], expiresAt: null, daysLeft: null };
    stubResponse({ ...VALID_RESPONSE, consents: [consent] });
    // Act
    const dataHealth = await getDataHealth();
    // Assert
    expect(dataHealth.consents[0]?.expiresAt).toBeNull();
  });

  it('should_reject_a_difference_that_is_not_an_integer_number_of_cents', async () => {
    // Arrange
    const divergence = { ...VALID_RESPONSE.divergences[0], differenceCents: 120.5 };
    stubResponse({ ...VALID_RESPONSE, divergences: [divergence] });
    // Act
    const request = getDataHealth();
    // Assert
    await expect(request).rejects.toThrow();
  });

  it('should_reject_a_response_without_the_stale_accounts', async () => {
    // Arrange
    const { staleAccounts: _staleAccounts, ...withoutStale } = VALID_RESPONSE;
    stubResponse(withoutStale);
    // Act
    const request = getDataHealth();
    // Assert
    await expect(request).rejects.toThrow();
  });
});

describe('listRecentSyncRuns', () => {
  it('should_ask_for_the_30_most_recent_runs', async () => {
    // Arrange
    const fetchMock = stubResponse({
      items: [SYNC_RUN],
      pagination: { page: 1, limit: 30, total: 1 },
    });
    // Act
    await listRecentSyncRuns();
    // Assert
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/v1/sync-runs?limit=30');
  });

  it('should_return_the_counts_of_each_run', async () => {
    // Arrange
    stubResponse({ items: [SYNC_RUN], pagination: { page: 1, limit: 30, total: 1 } });
    // Act
    const [run] = await listRecentSyncRuns();
    // Assert
    expect(run?.stats).toEqual({ transactionsInserted: 12, transactionsUpdated: 3 });
  });
});
