import { describe, expect, it } from 'vitest';

import { buildSavingsReport } from '../../../src/modules/reports/savings-evolution-report.js';
import type { MonthTotals } from '../../../src/shared/months.js';

// 15 de novembro de 2026: novembro é o mês em andamento.
const TODAY = '2026-11-15';

function month(label: string, incomeCents: number, expenseCents: number): MonthTotals {
  return { month: label, incomeCents, expenseCents };
}

describe('buildSavingsReport', () => {
  it('should_compute_result_and_rate_when_the_month_has_income_and_expense', () => {
    // Arrange
    const months = [month('2026-10', 500000, 350000)];
    // Act
    const [october] = buildSavingsReport(months, TODAY).months;
    // Assert
    expect({ resultCents: october?.resultCents, rate: october?.savingsRatePercent }).toEqual({
      resultCents: 150000,
      rate: 30,
    });
  });

  it('should_return_a_negative_rate_when_the_expense_is_higher_than_the_income', () => {
    // Arrange
    const months = [month('2026-10', 400000, 450000)];
    // Act
    const [october] = buildSavingsReport(months, TODAY).months;
    // Assert
    expect({ resultCents: october?.resultCents, rate: october?.savingsRatePercent }).toEqual({
      resultCents: -50000,
      rate: -12.5,
    });
  });

  it('should_return_a_null_rate_when_the_month_has_expense_but_no_income', () => {
    // Arrange
    const months = [month('2026-10', 0, 80000)];
    // Act
    const [october] = buildSavingsReport(months, TODAY).months;
    // Assert
    expect({ resultCents: october?.resultCents, rate: october?.savingsRatePercent }).toEqual({
      resultCents: -80000,
      rate: null,
    });
  });

  it('should_return_zero_result_and_null_rate_when_the_month_has_no_movement', () => {
    // Arrange
    const months = [month('2026-10', 0, 0)];
    // Act
    const [october] = buildSavingsReport(months, TODAY).months;
    // Assert
    expect({ resultCents: october?.resultCents, rate: october?.savingsRatePercent }).toEqual({
      resultCents: 0,
      rate: null,
    });
  });

  it('should_round_the_rate_to_one_decimal_place', () => {
    // Arrange
    const months = [month('2026-10', 300000, 200000)];
    // Act
    const [october] = buildSavingsReport(months, TODAY).months;
    // Assert
    expect(october?.savingsRatePercent).toBe(33.3);
  });

  it('should_accumulate_the_results_from_the_first_month_of_the_list', () => {
    // Arrange
    const months = [
      month('2026-07', 200000, 100000),
      month('2026-08', 100000, 130000),
      month('2026-09', 150000, 100000),
    ];
    // Act
    const cumulative = buildSavingsReport(months, TODAY).months.map(
      (item) => item.cumulativeResultCents,
    );
    // Assert
    expect(cumulative).toEqual([100000, 70000, 120000]);
  });

  it('should_compute_the_period_rate_over_the_sums_and_not_as_the_average_of_the_monthly_rates', () => {
    // Arrange: taxas mensais de 50% e 0%, mas o período guardou 20 mil de 100 mil.
    const months = [month('2026-09', 20000, 10000), month('2026-10', 80000, 80000)];
    // Act
    const { totals } = buildSavingsReport(months, TODAY);
    // Assert
    expect(totals.savingsRatePercent).toBe(10);
  });

  it('should_return_a_null_period_rate_when_the_period_has_no_income', () => {
    // Arrange
    const months = [month('2026-09', 0, 1000), month('2026-10', 0, 2000)];
    // Act
    const { totals } = buildSavingsReport(months, TODAY);
    // Assert
    expect(totals.savingsRatePercent).toBeNull();
  });

  it('should_count_surplus_months_among_closed_months_only', () => {
    // Arrange
    const months = [
      month('2026-08', 100000, 50000),
      month('2026-09', 100000, 100000),
      month('2026-10', 100000, 150000),
      month('2026-11', 100000, 10000),
    ];
    // Act
    const { totals } = buildSavingsReport(months, TODAY);
    // Assert
    expect({ surplusMonths: totals.surplusMonths, closedMonths: totals.closedMonths }).toEqual({
      surplusMonths: 1,
      closedMonths: 3,
    });
  });

  it('should_leave_the_current_month_out_of_the_closed_count_but_inside_the_totals', () => {
    // Arrange
    const months = [month('2026-11', 100000, 40000)];
    // Act
    const { totals } = buildSavingsReport(months, TODAY);
    // Assert
    expect({
      closedMonths: totals.closedMonths,
      surplusMonths: totals.surplusMonths,
      resultCents: totals.resultCents,
    }).toEqual({ closedMonths: 0, surplusMonths: 0, resultCents: 60000 });
  });

  it('should_return_empty_months_and_zero_totals_when_there_are_no_months', () => {
    // Arrange
    // Act
    const report = buildSavingsReport([], TODAY);
    // Assert
    expect(report).toEqual({
      months: [],
      totals: {
        incomeCents: 0,
        expenseCents: 0,
        resultCents: 0,
        savingsRatePercent: null,
        surplusMonths: 0,
        closedMonths: 0,
      },
    });
  });
});
