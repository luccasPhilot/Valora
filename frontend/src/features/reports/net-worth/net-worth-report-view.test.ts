import { describe, expect, it } from 'vitest';

import { point } from '../../../../test/helpers/net-worth';
import {
  describeCreditBills,
  describeHistoryStart,
  describeShortHistory,
  investmentsShare,
  periodChange,
} from './net-worth-report-view';

function current(accountsCents: number, investmentsCents: number) {
  return {
    date: '2026-11-15',
    accountsCents,
    investmentsCents,
    openBillsCents: 0,
    netWorthCents: accountsCents + investmentsCents,
  };
}

describe('periodChange', () => {
  it('should_return_the_difference_and_the_percent_from_the_first_to_the_last_point', () => {
    // Arrange
    const points = [
      point('2026-09', '2026-09-04', 1000000),
      point('2026-10', '2026-10-31', 1020000),
      point('2026-11', '2026-11-15', 1050000),
    ];
    // Act
    const change = periodChange(points);
    // Assert
    expect(change).toEqual({ cents: 50000, percent: 5, sinceDate: '2026-09-04' });
  });

  it('should_return_a_negative_change_when_the_net_worth_fell', () => {
    // Arrange
    const points = [
      point('2026-10', '2026-10-04', 1000000),
      point('2026-11', '2026-11-15', 900000),
    ];
    // Act
    const change = periodChange(points);
    // Assert
    expect(change).toMatchObject({ cents: -100000, percent: -10 });
  });

  it('should_return_a_null_percent_when_the_first_point_is_zero', () => {
    // Arrange
    const points = [point('2026-10', '2026-10-04', 0), point('2026-11', '2026-11-15', 50000)];
    // Act
    const change = periodChange(points);
    // Assert
    expect(change).toEqual({ cents: 50000, percent: null, sinceDate: '2026-10-04' });
  });

  it('should_use_the_absolute_value_of_a_negative_first_point_as_the_base', () => {
    // Arrange
    const points = [
      point('2026-10', '2026-10-04', -100000),
      point('2026-11', '2026-11-15', -50000),
    ];
    // Act
    const change = periodChange(points);
    // Assert
    expect(change).toMatchObject({ cents: 50000, percent: 50 });
  });

  it('should_round_the_percent_to_one_decimal_place', () => {
    // Arrange
    const points = [point('2026-10', '2026-10-04', 300000), point('2026-11', '2026-11-15', 400000)];
    // Act
    const change = periodChange(points);
    // Assert
    expect(change?.percent).toBe(33.3);
  });

  it('should_return_null_when_there_are_fewer_than_two_points', () => {
    // Arrange
    const points = [point('2026-11', '2026-11-04', 1000000)];
    // Act
    const change = periodChange(points);
    // Assert
    expect(change).toBeNull();
  });

  it('should_return_null_when_there_are_no_points', () => {
    // Arrange
    // Act
    const change = periodChange([]);
    // Assert
    expect(change).toBeNull();
  });
});

describe('investmentsShare', () => {
  it('should_return_the_share_of_investments_in_accounts_plus_investments', () => {
    // Arrange
    // Act
    const share = investmentsShare(current(500000, 1500000));
    // Assert
    expect(share).toBe(0.75);
  });

  it('should_return_null_when_accounts_and_investments_sum_to_zero', () => {
    // Arrange
    // Act
    const share = investmentsShare(current(0, 0));
    // Assert
    expect(share).toBeNull();
  });

  it('should_return_null_when_the_sum_is_negative_because_of_an_overdraft', () => {
    // Arrange
    // Act
    const share = investmentsShare(current(-200000, 100000));
    // Assert
    expect(share).toBeNull();
  });

  it('should_return_zero_when_there_are_no_investments', () => {
    // Arrange
    // Act
    const share = investmentsShare(current(500000, 0));
    // Assert
    expect(share).toBe(0);
  });
});

describe('describeShortHistory', () => {
  it('should_say_since_when_the_history_exists', () => {
    // Arrange
    // Act
    const message = describeShortHistory('2026-11-04');
    // Assert
    expect(message).toBe(
      'O histórico começa em 04/11. Os gráficos aparecem quando houver dois meses de dados.',
    );
  });

  it('should_say_there_is_no_history_when_there_is_no_snapshot', () => {
    // Arrange
    // Act
    const message = describeShortHistory(null);
    // Assert
    expect(message).toBe(
      'Ainda não há histórico de patrimônio. Os gráficos aparecem quando houver dois meses de dados.',
    );
  });
});

describe('describeHistoryStart', () => {
  it('should_return_the_day_and_month_of_the_first_snapshot', () => {
    // Arrange
    // Act
    const note = describeHistoryStart('2026-09-04');
    // Assert
    expect(note).toBe('O histórico começa em 04/09.');
  });

  it('should_return_null_when_there_is_no_snapshot', () => {
    // Arrange
    // Act
    const note = describeHistoryStart(null);
    // Assert
    expect(note).toBeNull();
  });
});

describe('describeCreditBills', () => {
  it('should_explain_the_plus_sign_when_open_bills_are_a_credit', () => {
    // Arrange
    const openBillsCents = -183260;
    // Act
    const note = describeCreditBills(openBillsCents);
    // Assert
    expect(note).toBe(
      'Faturas em aberto com + são crédito no cartão: somam ao patrimônio em vez de descontar.',
    );
  });

  it('should_return_null_when_open_bills_are_a_debt', () => {
    // Arrange
    const openBillsCents = 50000;
    // Act
    const note = describeCreditBills(openBillsCents);
    // Assert
    expect(note).toBeNull();
  });

  it('should_return_null_when_there_are_no_open_bills', () => {
    // Arrange
    const openBillsCents = 0;
    // Act
    const note = describeCreditBills(openBillsCents);
    // Assert
    expect(note).toBeNull();
  });
});
