import { describe, expect, it } from 'vitest';

import type { IncomeExpenseMonth, SavingsMonth } from '@/lib/api/reports';

import { averageClosedMonths, compareLastClosedSavingsRate } from './report-answers';

const PARTIAL_MONTH = '2026-11';

function incomeExpenseMonth(
  month: string,
  incomeCents: number,
  expenseCents: number,
): IncomeExpenseMonth {
  return { month, incomeCents, expenseCents, resultCents: incomeCents - expenseCents };
}

function savingsMonth(month: string, savingsRatePercent: number | null): SavingsMonth {
  return {
    month,
    incomeCents: 0,
    expenseCents: 0,
    resultCents: 0,
    savingsRatePercent,
    cumulativeResultCents: 0,
  };
}

describe('averageClosedMonths', () => {
  it('should_average_only_closed_months_when_the_current_month_is_in_the_list', () => {
    // Arrange
    const months = [
      incomeExpenseMonth('2026-09', 400000, 200000),
      incomeExpenseMonth('2026-10', 600000, 400000),
      incomeExpenseMonth(PARTIAL_MONTH, 100000, 900000),
    ];
    // Act
    const averages = averageClosedMonths(months, PARTIAL_MONTH);
    // Assert
    expect(averages).toEqual({ incomeCents: 500000, expenseCents: 300000, monthsCount: 2 });
  });

  it('should_return_null_when_there_is_no_closed_month', () => {
    // Arrange
    const months = [incomeExpenseMonth(PARTIAL_MONTH, 100000, 50000)];
    // Act
    const averages = averageClosedMonths(months, PARTIAL_MONTH);
    // Assert
    expect(averages).toBeNull();
  });

  it('should_round_the_average_to_whole_cents_when_the_division_is_not_exact', () => {
    // Arrange
    const months = [
      incomeExpenseMonth('2026-08', 100001, 0),
      incomeExpenseMonth('2026-09', 100000, 0),
    ];
    // Act
    const averages = averageClosedMonths(months, PARTIAL_MONTH);
    // Assert
    expect(averages?.incomeCents).toBe(100001);
  });
});

describe('compareLastClosedSavingsRate', () => {
  it('should_compare_the_last_closed_month_with_the_average_of_the_previous_ones', () => {
    // Arrange
    const months = [
      savingsMonth('2026-08', 80),
      savingsMonth('2026-09', 90),
      savingsMonth('2026-10', 70),
      savingsMonth(PARTIAL_MONTH, 99),
    ];
    // Act
    const comparison = compareLastClosedSavingsRate(months, PARTIAL_MONTH);
    // Assert
    expect(comparison).toEqual({ month: '2026-10', ratePercent: 70, previousAveragePercent: 85 });
  });

  it('should_skip_months_without_income_when_looking_for_the_last_closed_month', () => {
    // Arrange
    const months = [
      savingsMonth('2026-08', 60),
      savingsMonth('2026-09', 80),
      savingsMonth('2026-10', null),
    ];
    // Act
    const comparison = compareLastClosedSavingsRate(months, PARTIAL_MONTH);
    // Assert
    expect(comparison?.month).toBe('2026-09');
  });

  it('should_return_null_when_there_is_only_one_closed_month_with_income', () => {
    // Arrange
    const months = [savingsMonth('2026-10', 50), savingsMonth(PARTIAL_MONTH, 40)];
    // Act
    const comparison = compareLastClosedSavingsRate(months, PARTIAL_MONTH);
    // Assert
    expect(comparison).toBeNull();
  });
});
