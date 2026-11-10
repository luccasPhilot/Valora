import { describe, expect, it } from 'vitest';

import {
  projectEndOfMonth,
  type ProjectionBill,
  type ProjectionInput,
  type ProjectionOccurrence,
} from '../../../src/modules/projection/month-projection.js';

const TODAY = '2026-11-05';

function occurrence(overrides: Partial<ProjectionOccurrence> = {}): ProjectionOccurrence {
  return { description: 'Salário', date: '2026-11-15', amountCents: 300000, ...overrides };
}

function bill(overrides: Partial<ProjectionBill> = {}): ProjectionBill {
  return {
    description: 'Fatura Cartão Visa',
    dueDate: '2026-11-10',
    totalCents: 200000,
    paidCents: 0,
    isEstimatedDueDate: false,
    ...overrides,
  };
}

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return { today: TODAY, balanceCents: 500000, occurrences: [], bills: [], ...overrides };
}

describe('projectEndOfMonth', () => {
  it('should_add_income_and_subtract_expenses_and_bills_when_the_projection_is_complete', () => {
    // Arrange
    const complete = input({
      occurrences: [
        occurrence(),
        occurrence({ description: 'Aluguel', date: '2026-11-20', amountCents: -120000 }),
      ],
      bills: [bill()],
    });
    // Act
    const projection = projectEndOfMonth(complete);
    // Assert
    expect(projection).toMatchObject({
      startBalanceCents: 500000,
      plannedIncomeCents: 300000,
      plannedExpenseCents: 120000,
      billsDueCents: 200000,
      projectedBalanceCents: 480000,
    });
  });

  it('should_subtract_only_the_unpaid_part_when_the_bill_is_partially_paid', () => {
    // Arrange
    const partiallyPaid = input({ bills: [bill({ totalCents: 200000, paidCents: 50000 })] });
    // Act
    const projection = projectEndOfMonth(partiallyPaid);
    // Assert
    expect(projection.billsDueCents).toBe(150000);
  });

  it('should_ignore_the_bill_when_it_is_fully_paid', () => {
    // Arrange
    const paid = input({ bills: [bill({ totalCents: 200000, paidCents: 200000 })] });
    // Act
    const projection = projectEndOfMonth(paid);
    // Assert
    expect(projection.events).toEqual([]);
  });

  it('should_ignore_the_bill_when_it_is_due_after_the_last_day_of_the_month', () => {
    // Arrange
    const nextMonth = input({ bills: [bill({ dueDate: '2026-12-01' })] });
    // Act
    const projection = projectEndOfMonth(nextMonth);
    // Assert
    expect(projection.projectedBalanceCents).toBe(500000);
  });

  it('should_include_the_bill_when_it_is_due_on_the_last_day_of_the_month', () => {
    // Arrange
    const lastDay = input({ bills: [bill({ dueDate: '2026-11-30' })] });
    // Act
    const projection = projectEndOfMonth(lastDay);
    // Assert
    expect(projection.projectedBalanceCents).toBe(300000);
  });

  it('should_apply_an_overdue_expense_today_and_mark_it_when_the_date_has_passed', () => {
    // Arrange
    const overdue = input({
      today: '2026-11-12',
      occurrences: [occurrence({ date: '2026-11-05', amountCents: -120000 })],
    });
    // Act
    const [event] = projectEndOfMonth(overdue).events;
    // Assert
    expect(event).toMatchObject({ date: '2026-11-12', isOverdue: true, amountCents: -120000 });
  });

  it('should_apply_an_overdue_bill_today_when_it_was_due_yesterday', () => {
    // Arrange
    const overdue = input({ bills: [bill({ dueDate: '2026-11-04', totalCents: 80000 })] });
    // Act
    const [event] = projectEndOfMonth(overdue).events;
    // Assert
    expect(event).toMatchObject({
      type: 'bill',
      date: TODAY,
      isOverdue: true,
      amountCents: -80000,
    });
  });

  it('should_not_mark_as_overdue_when_the_item_happens_today', () => {
    // Arrange
    const dueToday = input({ occurrences: [occurrence({ date: TODAY })] });
    // Act
    const [event] = projectEndOfMonth(dueToday).events;
    // Assert
    expect(event?.isOverdue).toBe(false);
  });

  it('should_keep_the_estimated_flag_when_the_bill_due_date_is_estimated', () => {
    // Arrange
    const estimated = input({ bills: [bill({ isEstimatedDueDate: true })] });
    // Act
    const [event] = projectEndOfMonth(estimated).events;
    // Assert
    expect(event?.isEstimatedDate).toBe(true);
  });

  it('should_find_the_lowest_point_before_the_income_arrives', () => {
    // Arrange
    const tight = input({
      balanceCents: 100000,
      occurrences: [occurrence({ date: '2026-11-15', amountCents: 400000 })],
      bills: [bill({ dueDate: '2026-11-10', totalCents: 150000 })],
    });
    // Act
    const projection = projectEndOfMonth(tight);
    // Assert
    expect({
      lowest: projection.lowestBalanceCents,
      date: projection.lowestBalanceDate,
      final: projection.projectedBalanceCents,
    }).toEqual({ lowest: -50000, date: '2026-11-10', final: 350000 });
  });

  it('should_apply_the_expense_before_the_income_when_both_happen_on_the_same_day', () => {
    // Arrange
    const sameDay = input({
      balanceCents: 100000,
      occurrences: [
        occurrence({ date: '2026-11-08', amountCents: 150000 }),
        occurrence({ description: 'Aluguel', date: '2026-11-08', amountCents: -150000 }),
      ],
    });
    // Act
    const projection = projectEndOfMonth(sameDay);
    // Assert
    expect(projection.lowestBalanceCents).toBe(-50000);
  });

  it('should_list_the_expense_before_the_income_when_both_happen_on_the_same_day', () => {
    // Arrange
    const sameDay = input({
      occurrences: [
        occurrence({ date: '2026-11-08', amountCents: 150000 }),
        occurrence({ description: 'Aluguel', date: '2026-11-08', amountCents: -150000 }),
      ],
    });
    // Act
    const types = projectEndOfMonth(sameDay).events.map((event) => event.type);
    // Assert
    expect(types).toEqual(['planned_expense', 'planned_income']);
  });

  it('should_keep_the_end_of_day_balance_in_the_daily_series_when_items_share_a_day', () => {
    // Arrange
    const sameDay = input({
      balanceCents: 100000,
      occurrences: [
        occurrence({ date: '2026-11-08', amountCents: 150000 }),
        occurrence({ description: 'Aluguel', date: '2026-11-08', amountCents: -150000 }),
      ],
    });
    // Act
    const day = projectEndOfMonth(sameDay).daily.find((point) => point.date === '2026-11-08');
    // Assert
    expect(day?.balanceCents).toBe(100000);
  });

  it('should_return_the_current_balance_when_nothing_is_planned', () => {
    // Arrange
    const empty = input();
    // Act
    const projection = projectEndOfMonth(empty);
    // Assert
    expect({
      projected: projection.projectedBalanceCents,
      lowest: projection.lowestBalanceCents,
      lowestDate: projection.lowestBalanceDate,
    }).toEqual({ projected: 500000, lowest: 500000, lowestDate: TODAY });
  });

  it('should_keep_the_first_day_as_lowest_when_the_balance_ties_later', () => {
    // Arrange
    const tie = input({
      balanceCents: 100000,
      occurrences: [
        occurrence({ date: '2026-11-08', amountCents: -100000 }),
        occurrence({ description: 'Reembolso', date: '2026-11-09', amountCents: 100000 }),
        occurrence({ description: 'Outra', date: '2026-11-10', amountCents: -100000 }),
      ],
    });
    // Act
    const projection = projectEndOfMonth(tie);
    // Assert
    expect(projection.lowestBalanceDate).toBe('2026-11-08');
  });

  it('should_cover_every_day_from_today_to_the_last_day_of_the_month', () => {
    // Arrange
    const empty = input();
    // Act
    const { daily } = projectEndOfMonth(empty);
    // Assert
    expect({ first: daily[0]?.date, last: daily.at(-1)?.date, length: daily.length }).toEqual({
      first: TODAY,
      last: '2026-11-30',
      length: 26,
    });
  });

  it('should_return_a_single_day_when_today_is_the_last_day_of_a_31_day_month', () => {
    // Arrange
    const lastDay = input({
      today: '2026-12-31',
      occurrences: [occurrence({ date: '2026-12-31' })],
    });
    // Act
    const { daily } = projectEndOfMonth(lastDay);
    // Assert
    expect(daily).toEqual([{ date: '2026-12-31', balanceCents: 800000 }]);
  });

  it('should_end_on_the_28th_when_the_month_has_28_days', () => {
    // Arrange
    const february = input({ today: '2027-02-01' });
    // Act
    const { daily } = projectEndOfMonth(february);
    // Assert
    expect({ last: daily.at(-1)?.date, length: daily.length }).toEqual({
      last: '2027-02-28',
      length: 28,
    });
  });
});
