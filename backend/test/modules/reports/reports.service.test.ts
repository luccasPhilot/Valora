import { describe, expect, it, vi } from 'vitest';

import { ReportsService } from '../../../src/modules/reports/reports.service.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');

function buildService(firstTransactionDay: string | null) {
  const findMonthTotals = vi.fn().mockResolvedValue([]);
  const findCategorySpendingByMonth = vi.fn().mockResolvedValue([]);
  const service = new ReportsService({
    totals: {
      findMonthTotals,
      findCategorySpendingByMonth,
      findFirstTransactionDay: async () => firstTransactionDay,
    },
    now: () => NOW,
  });
  return { service, findMonthTotals, findCategorySpendingByMonth };
}

describe('ReportsService.incomeExpense', () => {
  it('should_cover_the_twelve_months_ending_at_the_current_month_when_no_range_is_given', async () => {
    // Arrange
    const { service } = buildService('2020-01-01');
    // Act
    const report = await service.incomeExpense({});
    // Assert
    expect({ from: report.from, to: report.to, count: report.months.length }).toEqual({
      from: '2025-12',
      to: '2026-11',
      count: 12,
    });
  });

  it('should_query_the_totals_up_to_the_last_day_of_the_last_month', async () => {
    // Arrange
    const { service, findMonthTotals } = buildService('2020-01-01');
    // Act
    await service.incomeExpense({});
    // Assert
    expect(findMonthTotals).toHaveBeenCalledWith('2025-12-01', '2026-11-30');
  });

  it('should_reject_the_range_when_from_is_after_to', async () => {
    // Arrange
    const { service } = buildService(null);
    // Act
    const act = service.incomeExpense({ from: '2026-08-01', to: '2026-03-01' });
    // Assert
    await expect(act).rejects.toThrow('vem depois do mês final');
  });
});

describe('ReportsService.categorySpending', () => {
  it('should_start_at_the_month_of_the_first_transaction_when_the_period_begins_before_it', async () => {
    // Arrange
    const { service } = buildService('2026-08-20');
    // Act
    const report = await service.categorySpending({});
    // Assert
    expect(report.months).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
  });

  it('should_query_the_spending_up_to_the_last_day_of_the_last_month', async () => {
    // Arrange
    const { service, findCategorySpendingByMonth } = buildService('2020-01-01');
    // Act
    await service.categorySpending({});
    // Assert
    expect(findCategorySpendingByMonth).toHaveBeenCalledWith('2025-12-01', '2026-11-30');
  });

  it('should_return_no_months_when_there_is_no_transaction', async () => {
    // Arrange
    const { service } = buildService(null);
    // Act
    const report = await service.categorySpending({});
    // Assert
    expect({ months: report.months, series: report.series }).toEqual({ months: [], series: [] });
  });

  it('should_reject_the_range_when_from_is_after_to', async () => {
    // Arrange
    const { service } = buildService(null);
    // Act
    const act = service.categorySpending({ from: '2026-08-01', to: '2026-03-01' });
    // Assert
    await expect(act).rejects.toThrow('vem depois do mês final');
  });
});

describe('ReportsService.savingsEvolution', () => {
  it('should_fill_the_months_without_movement_with_zeros_and_a_null_rate', async () => {
    // Arrange
    const { service, findMonthTotals } = buildService('2026-09-05');
    findMonthTotals.mockResolvedValue([
      { month: '2026-09', incomeCents: 100000, expenseCents: 40000 },
    ]);
    // Act
    const report = await service.savingsEvolution({ from: '2026-09-01', to: '2026-10-01' });
    // Assert
    expect(
      report.months.map((item) => [item.month, item.resultCents, item.savingsRatePercent]),
    ).toEqual([
      ['2026-09', 60000, 60],
      ['2026-10', 0, null],
    ]);
  });

  it('should_not_count_the_current_month_as_closed', async () => {
    // Arrange
    const { service } = buildService('2020-01-01');
    // Act
    const report = await service.savingsEvolution({});
    // Assert
    expect(report.totals.closedMonths).toBe(11);
  });

  it('should_return_no_months_when_there_is_no_transaction', async () => {
    // Arrange
    const { service } = buildService(null);
    // Act
    const report = await service.savingsEvolution({});
    // Assert
    expect(report.months).toEqual([]);
  });

  it('should_reject_the_range_when_from_is_after_to', async () => {
    // Arrange
    const { service } = buildService(null);
    // Act
    const act = service.savingsEvolution({ from: '2026-08-01', to: '2026-03-01' });
    // Assert
    await expect(act).rejects.toThrow('vem depois do mês final');
  });
});
