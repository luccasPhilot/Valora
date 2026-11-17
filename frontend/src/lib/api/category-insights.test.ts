import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCategoryInsights } from './category-insights';

const VALID_RESPONSE = {
  month: '2026-11',
  previousMonth: '2026-10',
  isInProgress: true,
  totals: {
    spentCents: 135000,
    previousSpentCents: 112500,
    variationPercent: 20,
    comparedThroughDay: 17,
  },
  months: ['2026-10', '2026-11'],
  categories: [
    {
      kind: 'category',
      categoryId: 'market',
      name: 'Mercado',
      icon: 'shopping-cart',
      spentCents: 100000,
      percent: 74.1,
      previousSpentCents: 90000,
      variationPercent: 11.1,
      budget: { limitCents: 80000, percent: 125, status: 'exceeded' },
      monthlyCents: [90000, 100000],
      averageCents: 90000,
      peak: { month: '2026-11', cents: 100000 },
    },
  ],
  changes: { increases: [], decreases: [] },
  recurring: { items: [], monthlyTotalCents: 0, yearlyTotalCents: 0 },
  attention: [
    {
      type: 'budget_exceeded',
      categoryId: 'market',
      name: 'Mercado',
      limitCents: 80000,
      spentCents: 100000,
    },
    { type: 'uncategorized_high', spentCents: 20000, percent: 12.5 },
  ],
};

function stubResponse(body: unknown) {
  const fetchMock = vi.fn((_input: RequestInfo | URL) => Promise.resolve(Response.json(body)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCategoryInsights', () => {
  it('should_ask_the_api_for_the_month_and_accept_the_documented_response', async () => {
    // Arrange
    const fetchMock = stubResponse(VALID_RESPONSE);
    // Act
    const insights = await getCategoryInsights('2026-11');
    // Assert
    expect({ url: String(fetchMock.mock.calls[0]?.[0]), month: insights.month }).toEqual({
      url: '/api/v1/category-insights?month=2026-11',
      month: '2026-11',
    });
  });

  it('should_reject_a_response_without_the_recurring_charges', async () => {
    // Arrange
    const { recurring: _recurring, ...withoutRecurring } = VALID_RESPONSE;
    stubResponse(withoutRecurring);
    // Act
    const request = getCategoryInsights('2026-11');
    // Assert
    await expect(request).rejects.toThrow();
  });

  it('should_reject_an_attention_point_of_an_unknown_type', async () => {
    // Arrange
    stubResponse({ ...VALID_RESPONSE, attention: [{ type: 'invented', spentCents: 1 }] });
    // Act
    const request = getCategoryInsights('2026-11');
    // Assert
    await expect(request).rejects.toThrow();
  });

  it('should_reject_money_that_is_not_an_integer_number_of_cents', async () => {
    // Arrange
    stubResponse({ ...VALID_RESPONSE, totals: { ...VALID_RESPONSE.totals, spentCents: 10.5 } });
    // Act
    const request = getCategoryInsights('2026-11');
    // Assert
    await expect(request).rejects.toThrow();
  });
});
