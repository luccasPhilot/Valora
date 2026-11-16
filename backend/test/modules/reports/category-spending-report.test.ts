import { describe, expect, it } from 'vitest';

import { buildCategoryReport } from '../../../src/modules/reports/category-spending-report.js';
import type { MonthCategorySpending } from '../../../src/modules/transactions/transaction-totals.repository.js';

const MONTHS = ['2026-01', '2026-02', '2026-03'];

function spending(month: string, name: string | null, spentCents: number): MonthCategorySpending {
  return {
    month,
    categoryId: name === null ? null : `id-${name}`,
    categoryName: name,
    categoryIcon: name === null ? null : 'tag',
    spentCents,
  };
}

describe('buildCategoryReport', () => {
  it('should_return_no_series_and_zero_totals_when_there_is_no_spending', () => {
    // Arrange
    // Act
    const report = buildCategoryReport([], MONTHS);
    // Assert
    expect({ series: report.series, totals: report.totals }).toEqual({
      series: [],
      totals: { totalCents: 0, monthlyCents: [0, 0, 0] },
    });
  });

  it('should_sum_the_months_of_a_category_into_its_period_total', () => {
    // Arrange
    const rows = [spending('2026-01', 'Mercado', 20000), spending('2026-03', 'Mercado', 5000)];
    // Act
    const [mercado] = buildCategoryReport(rows, MONTHS).series;
    // Assert
    expect({ totalCents: mercado?.totalCents, monthlyCents: mercado?.monthlyCents }).toEqual({
      totalCents: 25000,
      monthlyCents: [20000, 0, 5000],
    });
  });

  it('should_keep_a_refund_in_another_month_from_erasing_the_original_spending', () => {
    // Arrange: a compra de janeiro vale 20000; em março o estorno já foi limitado a zero pela consulta.
    const rows = [spending('2026-01', 'Compras', 20000)];
    // Act
    const [compras] = buildCategoryReport(rows, MONTHS).series;
    // Assert
    expect({ totalCents: compras?.totalCents, monthlyCents: compras?.monthlyCents }).toEqual({
      totalCents: 20000,
      monthlyCents: [20000, 0, 0],
    });
  });

  it('should_order_categories_by_period_total_with_ties_broken_by_name', () => {
    // Arrange
    const rows = [
      spending('2026-01', 'Transporte', 1000),
      spending('2026-01', 'Lazer', 1000),
      spending('2026-01', 'Mercado', 3000),
    ];
    // Act
    const names = buildCategoryReport(rows, MONTHS).series.map((item) => item.name);
    // Assert
    expect(names).toEqual(['Mercado', 'Lazer', 'Transporte']);
  });

  it('should_group_the_categories_after_the_fifth_into_others_month_by_month', () => {
    // Arrange
    const rows = [
      spending('2026-01', 'A', 9000),
      spending('2026-01', 'B', 8000),
      spending('2026-01', 'C', 7000),
      spending('2026-01', 'D', 6000),
      spending('2026-01', 'E', 5000),
      spending('2026-01', 'F', 400),
      spending('2026-02', 'G', 300),
      spending('2026-02', 'H', 200),
    ];
    // Act
    const { series } = buildCategoryReport(rows, MONTHS);
    const others = series.at(-1);
    // Assert
    expect({
      count: series.length,
      kind: others?.kind,
      monthlyCents: others?.monthlyCents,
    }).toEqual({ count: 6, kind: 'other', monthlyCents: [400, 500, 0] });
  });

  it('should_let_uncategorized_spending_compete_for_a_slot_with_a_null_category_id', () => {
    // Arrange
    const rows = [
      spending('2026-01', 'Mercado', 9000),
      spending('2026-01', null, 5000),
      spending('2026-01', 'Lazer', 1000),
    ];
    // Act
    const second = buildCategoryReport(rows, MONTHS).series[1];
    // Assert
    expect({ kind: second?.kind, categoryId: second?.categoryId, icon: second?.icon }).toEqual({
      kind: 'uncategorized',
      categoryId: null,
      icon: null,
    });
  });

  it('should_compute_percentages_with_one_decimal_over_the_period_total', () => {
    // Arrange
    const rows = [spending('2026-01', 'Mercado', 2000), spending('2026-01', 'Lazer', 1000)];
    // Act
    const percents = buildCategoryReport(rows, MONTHS).series.map((item) => item.percent);
    // Assert
    expect(percents).toEqual([66.7, 33.3]);
  });

  it('should_total_each_month_across_all_series_including_others', () => {
    // Arrange
    const rows = [
      spending('2026-01', 'A', 9000),
      spending('2026-01', 'B', 8000),
      spending('2026-01', 'C', 7000),
      spending('2026-01', 'D', 6000),
      spending('2026-01', 'E', 5000),
      spending('2026-01', 'F', 400),
      spending('2026-03', 'F', 100),
    ];
    // Act
    const { totals } = buildCategoryReport(rows, MONTHS);
    // Assert
    expect(totals).toEqual({ totalCents: 35500, monthlyCents: [35400, 0, 100] });
  });
});
