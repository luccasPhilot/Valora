import { describe, expect, it } from 'vitest';

import type { ChargeRow } from '../../../src/modules/alerts/detectors/charge-row.js';
import { CategoryInsightsService } from '../../../src/modules/category-insights/category-insights.service.js';
import type {
  CategorySpending,
  MonthCategorySpending,
} from '../../../src/modules/transactions/transaction-totals.repository.js';
import { ValidationError } from '../../../src/shared/errors.js';
import { chargeRow } from '../alerts/detectors/charge-row-builder.js';

// 14h em São Paulo, 17 de novembro de 2026.
const NOW = new Date('2026-11-17T17:00:00Z');

interface Stubs {
  readonly rows?: readonly MonthCategorySpending[];
  readonly previous?: readonly CategorySpending[];
  readonly firstTransactionDay?: string | null;
  readonly charges?: readonly ChargeRow[];
  readonly limits?: readonly { categoryId: string; limitCents: number }[];
  readonly now?: Date;
}

function buildService(stubs: Stubs = {}) {
  const comparisonRanges: { from: string; to: string }[] = [];
  const service = new CategoryInsightsService({
    totals: {
      findCategorySpendingByMonth: async () => [...(stubs.rows ?? [])],
      findCategorySpending: async (from, to) => {
        comparisonRanges.push({ from, to });
        return [...(stubs.previous ?? [])];
      },
      findFirstTransactionDay: async () =>
        stubs.firstTransactionDay === undefined ? '2025-01-10' : stubs.firstTransactionDay,
    },
    budgets: {
      findForMonth: async () =>
        (stubs.limits ?? []).map((limit) => ({
          ...limit,
          categoryName: '',
          categoryIcon: '',
          spentCents: 0,
        })),
    },
    charges: { findOutflowsSince: async () => [...(stubs.charges ?? [])] },
    now: () => stubs.now ?? NOW,
  });
  return { service, comparisonRanges };
}

function marketRow(month: string, spentCents: number): MonthCategorySpending {
  return {
    month,
    categoryId: 'market',
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    spentCents,
  };
}

describe('CategoryInsightsService.analyze', () => {
  it('should_use_the_current_month_when_no_month_is_given', async () => {
    // Arrange
    const { service } = buildService();
    // Act
    const insights = await service.analyze();
    // Assert
    expect(insights).toMatchObject({
      month: '2026-11',
      previousMonth: '2026-10',
      isInProgress: true,
    });
  });

  it('should_compare_with_the_same_stretch_of_the_previous_month_when_the_month_is_in_progress', async () => {
    // Arrange
    const { service, comparisonRanges } = buildService();
    // Act
    const insights = await service.analyze('2026-11-01');
    // Assert
    expect({ range: comparisonRanges[0], day: insights.totals.comparedThroughDay }).toEqual({
      range: { from: '2026-10-01', to: '2026-10-17' },
      day: 17,
    });
  });

  it('should_compare_with_the_whole_previous_month_when_the_month_has_ended', async () => {
    // Arrange
    const { service, comparisonRanges } = buildService();
    // Act
    const insights = await service.analyze('2026-09-01');
    // Assert
    expect({ range: comparisonRanges[0], day: insights.totals.comparedThroughDay }).toEqual({
      range: { from: '2026-08-01', to: '2026-08-31' },
      day: null,
    });
  });

  it('should_clamp_the_compared_day_to_the_last_day_of_a_shorter_previous_month', async () => {
    // Arrange
    const { service, comparisonRanges } = buildService({ now: new Date('2026-10-31T15:00:00Z') });
    // Act
    const insights = await service.analyze();
    // Assert
    expect({ range: comparisonRanges[0], day: insights.totals.comparedThroughDay }).toEqual({
      range: { from: '2026-09-01', to: '2026-09-30' },
      day: 30,
    });
  });

  it('should_reject_a_month_after_the_current_one', async () => {
    // Arrange
    const { service } = buildService();
    // Act
    const analysis = service.analyze('2026-12-01');
    // Assert
    await expect(analysis).rejects.toBeInstanceOf(ValidationError);
  });

  it('should_leave_the_variation_null_when_the_previous_month_had_no_spending', async () => {
    // Arrange
    const { service } = buildService({ rows: [marketRow('2026-11', 50000)] });
    // Act
    const insights = await service.analyze();
    // Assert
    expect(insights.totals.variationPercent).toBeNull();
  });

  it('should_return_an_empty_month_with_zero_totals_when_nothing_was_spent', async () => {
    // Arrange
    const { service } = buildService();
    // Act
    const insights = await service.analyze();
    // Assert
    expect({ categories: insights.categories, spent: insights.totals.spentCents }).toEqual({
      categories: [],
      spent: 0,
    });
  });

  it('should_return_six_months_ending_in_the_requested_month', async () => {
    // Arrange
    const { service } = buildService();
    // Act
    const insights = await service.analyze();
    // Assert
    expect(insights.months).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  it('should_start_the_months_at_the_first_stored_transaction_when_the_history_is_short', async () => {
    // Arrange
    const { service } = buildService({ firstTransactionDay: '2026-09-12' });
    // Act
    const insights = await service.analyze();
    // Assert
    expect(insights.months).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('should_keep_only_the_requested_month_when_there_are_no_transactions_at_all', async () => {
    // Arrange
    const { service } = buildService({ firstTransactionDay: null });
    // Act
    const insights = await service.analyze();
    // Assert
    expect(insights.months).toEqual(['2026-11']);
  });

  it('should_attach_the_budget_limit_of_the_month_to_the_category', async () => {
    // Arrange
    const { service } = buildService({
      rows: [marketRow('2026-11', 90000)],
      limits: [{ categoryId: 'market', limitCents: 100000 }],
    });
    // Act
    const insights = await service.analyze();
    // Assert
    expect(insights.categories[0]?.budget).toEqual({
      limitCents: 100000,
      percent: 90,
      status: 'warning',
    });
  });

  it('should_list_the_active_subscriptions_with_monthly_and_yearly_totals', async () => {
    // Arrange
    const monthly = (date: string, amountCents: number, name: string) =>
      chargeRow({ date, description: name, descriptionNormalized: name, amountCents });
    const charges = [
      ...['2026-08-05', '2026-09-04', '2026-10-05'].map((date) =>
        monthly(date, -3990, 'STREAMING'),
      ),
      ...['2026-08-10', '2026-09-09', '2026-10-10'].map((date) => monthly(date, -2010, 'MUSICA')),
    ];
    const { service } = buildService({ charges });
    // Act
    const { recurring } = await service.analyze();
    // Assert
    expect({
      names: recurring.items.map((item) => item.description),
      monthly: recurring.monthlyTotalCents,
      yearly: recurring.yearlyTotalCents,
    }).toEqual({ names: ['STREAMING', 'MUSICA'], monthly: 6000, yearly: 72000 });
  });

  it('should_show_the_same_recurring_charges_for_any_requested_month', async () => {
    // Arrange
    const charges = ['2026-08-05', '2026-09-04', '2026-10-05'].map((date) =>
      chargeRow({ date, amountCents: -3990 }),
    );
    const { service } = buildService({ charges });
    // Act
    const [past, current] = await Promise.all([service.analyze('2026-03-01'), service.analyze()]);
    // Assert
    expect(past.recurring).toEqual(current.recurring);
  });

  it('should_return_no_recurring_charges_when_none_matches_the_rule', async () => {
    // Arrange
    const { service } = buildService();
    // Act
    const { recurring } = await service.analyze();
    // Assert
    expect(recurring).toEqual({ items: [], monthlyTotalCents: 0, yearlyTotalCents: 0 });
  });
});
