import { describe, expect, it } from 'vitest';

import { buildIncomeExpenseReport } from '../../../src/modules/reports/reports-calculations.js';

const RANGE = { from: '2026-07-01', to: '2026-09-01' };

describe('buildIncomeExpenseReport', () => {
  it('should_compute_the_result_as_income_minus_expense_when_the_month_has_movement', () => {
    // Arrange
    const found = [{ month: '2026-07', incomeCents: 500000, expenseCents: 320000 }];
    // Act
    const { months } = buildIncomeExpenseReport(found, RANGE, '2026-01-10');
    // Assert
    expect(months[0]).toEqual({
      month: '2026-07',
      incomeCents: 500000,
      expenseCents: 320000,
      resultCents: 180000,
    });
  });

  it('should_return_a_negative_result_when_expenses_pass_income', () => {
    // Arrange
    const found = [{ month: '2026-07', incomeCents: 100000, expenseCents: 250000 }];
    // Act
    const { months } = buildIncomeExpenseReport(found, RANGE, '2026-01-10');
    // Assert
    expect(months[0]?.resultCents).toBe(-150000);
  });

  it('should_fill_a_month_without_movement_with_zeros_when_it_is_inside_the_period', () => {
    // Arrange
    const found = [
      { month: '2026-07', incomeCents: 100, expenseCents: 50 },
      { month: '2026-09', incomeCents: 200, expenseCents: 80 },
    ];
    // Act
    const { months } = buildIncomeExpenseReport(found, RANGE, '2026-01-10');
    // Assert
    expect(months[1]).toEqual({
      month: '2026-08',
      incomeCents: 0,
      expenseCents: 0,
      resultCents: 0,
    });
  });

  it('should_list_months_from_oldest_to_newest', () => {
    // Arrange
    // Act
    const { months } = buildIncomeExpenseReport([], RANGE, '2026-01-10');
    // Assert
    expect(months.map(({ month }) => month)).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('should_start_at_the_first_transaction_month_when_it_is_after_the_period_start', () => {
    // Arrange
    const found = [{ month: '2026-08', incomeCents: 100, expenseCents: 50 }];
    // Act
    const { months } = buildIncomeExpenseReport(found, RANGE, '2026-08-20');
    // Assert
    expect(months.map(({ month }) => month)).toEqual(['2026-08', '2026-09']);
  });

  it('should_start_at_the_period_start_when_the_first_transaction_is_before_it', () => {
    // Arrange
    // Act
    const { months } = buildIncomeExpenseReport([], RANGE, '2025-03-05');
    // Assert
    expect(months[0]?.month).toBe('2026-07');
  });

  it('should_sum_the_months_into_the_period_totals', () => {
    // Arrange
    const found = [
      { month: '2026-07', incomeCents: 500000, expenseCents: 320000 },
      { month: '2026-09', incomeCents: 100000, expenseCents: 250000 },
    ];
    // Act
    const { totals } = buildIncomeExpenseReport(found, RANGE, '2026-01-10');
    // Assert
    expect(totals).toEqual({ incomeCents: 600000, expenseCents: 570000, resultCents: 30000 });
  });

  it('should_return_no_months_and_zero_totals_when_there_is_no_transaction', () => {
    // Arrange
    // Act
    const report = buildIncomeExpenseReport([], RANGE, null);
    // Assert
    expect(report).toEqual({
      months: [],
      totals: { incomeCents: 0, expenseCents: 0, resultCents: 0 },
    });
  });

  it('should_return_no_months_when_the_first_transaction_is_after_the_period_end', () => {
    // Arrange
    // Act
    const { months } = buildIncomeExpenseReport([], RANGE, '2026-11-02');
    // Assert
    expect(months).toEqual([]);
  });
});
