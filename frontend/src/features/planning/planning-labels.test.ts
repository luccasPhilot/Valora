import { describe, expect, it } from 'vitest';

import type { PlannedEntry } from '@/lib/api/planned-entries';

import { describeRecurrence, expectedTotals, parseRecurrence } from './planning-labels';

function entry(overrides: Partial<PlannedEntry> = {}): PlannedEntry {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    description: 'Aluguel',
    amountCents: -180000,
    categoryId: '22222222-2222-4222-8222-222222222222',
    categoryName: 'Moradia',
    categoryIcon: 'house',
    dayOfMonth: 5,
    recurrence: 'monthly',
    startMonth: '2026-12',
    endMonth: null,
    isActive: true,
    ...overrides,
  };
}

describe('describeRecurrence', () => {
  it('should_say_every_month_with_the_day_when_the_entry_is_monthly', () => {
    // Arrange & Act
    const text = describeRecurrence(entry());
    // Assert
    expect(text).toBe('Todo mês, dia 5');
  });

  it('should_add_the_end_month_when_the_monthly_entry_has_an_end', () => {
    // Arrange & Act
    const text = describeRecurrence(entry({ endMonth: '2027-02' }));
    // Assert
    expect(text).toBe('Todo mês, dia 5, até fevereiro de 2027');
  });

  it('should_say_every_year_with_the_month_when_the_entry_is_yearly', () => {
    // Arrange & Act
    const text = describeRecurrence(entry({ recurrence: 'yearly', startMonth: '2026-03' }));
    // Assert
    expect(text).toBe('Todo ano, em mar., dia 5');
  });

  it('should_say_once_when_the_entry_does_not_repeat', () => {
    // Arrange & Act
    const text = describeRecurrence(entry({ recurrence: 'none' }));
    // Assert
    expect(text).toBe('Uma vez, dia 5');
  });
});

describe('expectedTotals', () => {
  it('should_sum_pending_and_realized_and_leave_skipped_out_when_totals_are_given', () => {
    // Arrange
    const totals = {
      pending: { incomeCents: 100, expenseCents: 10 },
      realized: { incomeCents: 200, expenseCents: 20 },
      skipped: { incomeCents: 9000, expenseCents: 9000 },
    };
    // Act
    const expected = expectedTotals(totals);
    // Assert
    expect(expected).toEqual({ incomeCents: 300, expenseCents: 30 });
  });
});

describe('parseRecurrence', () => {
  it('should_return_the_value_when_it_is_a_known_recurrence', () => {
    // Arrange & Act
    const recurrence = parseRecurrence('yearly');
    // Assert
    expect(recurrence).toBe('yearly');
  });

  it('should_return_nothing_when_the_value_is_unknown', () => {
    // Arrange & Act
    const recurrence = parseRecurrence('weekly');
    // Assert
    expect(recurrence).toBeUndefined();
  });
});
