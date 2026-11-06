import { describe, expect, it } from 'vitest';

import {
  fallbackCurrentBill,
  selectBills,
  type StoredBill,
} from '../../../src/modules/credit-card-bills/bill-selection.js';

const TODAY = '2026-11-05';

function storedBill(dueDate: string, overrides: Partial<StoredBill> = {}): StoredBill {
  return {
    id: `bill-${dueDate}`,
    dueDate,
    closingDate: null,
    totalCents: 100000,
    paidCents: 0,
    ...overrides,
  };
}

describe('selectBills', () => {
  it('should_pick_the_first_bill_due_today_or_later_as_current_when_the_card_has_three_bills', () => {
    // Arrange
    const bills = [storedBill('2027-01-10'), storedBill('2026-11-10'), storedBill('2026-12-10')];
    // Act
    const { current } = selectBills(bills, TODAY);
    // Assert
    expect(current?.dueDate).toBe('2026-11-10');
  });

  it('should_list_the_following_bills_in_due_date_order_when_the_card_has_three_bills', () => {
    // Arrange
    const bills = [storedBill('2027-01-10'), storedBill('2026-11-10'), storedBill('2026-12-10')];
    // Act
    const { upcoming } = selectBills(bills, TODAY);
    // Assert
    expect(upcoming.map((bill) => bill.dueDate)).toEqual(['2026-12-10', '2027-01-10']);
  });

  it('should_skip_the_bill_due_today_when_it_is_already_paid', () => {
    // Arrange
    const bills = [storedBill(TODAY, { paidCents: 100000 }), storedBill('2026-12-10')];
    // Act
    const { current } = selectBills(bills, TODAY);
    // Assert
    expect(current?.dueDate).toBe('2026-12-10');
  });

  it('should_pick_the_latest_bill_as_current_when_it_is_overdue_and_unpaid', () => {
    // Arrange
    const bills = [storedBill('2026-09-10', { paidCents: 100000 }), storedBill('2026-10-10')];
    // Act
    const { current } = selectBills(bills, TODAY);
    // Assert
    expect(current).toMatchObject({ dueDate: '2026-10-10', status: 'overdue' });
  });

  it('should_ignore_an_old_partially_paid_bill_when_the_latest_bill_is_paid', () => {
    // Arrange
    const bills = [
      storedBill('2026-08-10', { paidCents: 50000 }),
      storedBill('2026-10-10', { paidCents: 100000 }),
    ];
    // Act
    const { current } = selectBills(bills, TODAY);
    // Assert
    expect(current).toBeNull();
  });

  it('should_have_no_current_bill_when_every_bill_is_paid', () => {
    // Arrange
    const bills = [storedBill('2026-10-10', { paidCents: 100000 })];
    // Act
    const { current } = selectBills(bills, TODAY);
    // Assert
    expect(current).toBeNull();
  });

  it('should_return_at_most_three_upcoming_bills_when_the_card_has_more', () => {
    // Arrange
    const bills = ['2026-11-10', '2026-12-10', '2027-01-10', '2027-02-10', '2027-03-10'].map(
      (dueDate) => storedBill(dueDate),
    );
    // Act
    const { upcoming } = selectBills(bills, TODAY);
    // Assert
    expect(upcoming).toHaveLength(3);
  });

  it('should_mark_the_current_bill_as_open_when_it_is_partially_paid_and_not_due_yet', () => {
    // Arrange
    const bills = [storedBill('2026-11-10', { paidCents: 30000 })];
    // Act
    const { current } = selectBills(bills, TODAY);
    // Assert
    expect(current?.status).toBe('open');
  });
});

describe('fallbackCurrentBill', () => {
  it('should_use_the_account_due_date_as_is_when_it_is_today_or_later', () => {
    // Arrange
    const fallback = {
      balanceCents: 250000,
      accountDueDate: '2026-11-15',
      latestBillDueDate: null,
    };
    // Act
    const bill = fallbackCurrentBill(fallback, TODAY);
    // Assert
    expect(bill).toMatchObject({
      totalCents: 250000,
      dueDate: '2026-11-15',
      isEstimatedDueDate: false,
    });
  });

  it('should_estimate_the_due_date_on_the_next_occurrence_when_the_account_due_date_is_stale', () => {
    // Arrange
    const fallback = {
      balanceCents: 250000,
      accountDueDate: '2026-10-10',
      latestBillDueDate: null,
    };
    // Act
    const bill = fallbackCurrentBill(fallback, '2026-11-06');
    // Assert
    expect(bill).toMatchObject({ dueDate: '2026-11-10', isEstimatedDueDate: true });
  });

  it('should_have_no_due_date_when_the_bank_gave_none', () => {
    // Arrange
    const fallback = { balanceCents: 250000, accountDueDate: null, latestBillDueDate: null };
    // Act
    const bill = fallbackCurrentBill(fallback, TODAY);
    // Assert
    expect(bill).toMatchObject({ dueDate: null, isEstimatedDueDate: false, status: 'open' });
  });

  it('should_have_no_due_date_when_the_balance_is_zero', () => {
    // Arrange
    const fallback = { balanceCents: 0, accountDueDate: '2026-10-10', latestBillDueDate: null };
    // Act
    const bill = fallbackCurrentBill(fallback, TODAY);
    // Assert
    expect(bill).toMatchObject({ totalCents: 0, dueDate: null, status: 'paid' });
  });

  it('should_return_nothing_when_the_card_has_no_balance', () => {
    // Arrange
    const fallback = { balanceCents: null, accountDueDate: '2026-11-15', latestBillDueDate: null };
    // Act
    const bill = fallbackCurrentBill(fallback, TODAY);
    // Assert
    expect(bill).toBeNull();
  });

  it('should_estimate_the_due_date_one_month_after_the_latest_bill_when_the_card_has_bills', () => {
    // Arrange
    const fallback = {
      balanceCents: 250000,
      accountDueDate: null,
      latestBillDueDate: '2026-10-10',
    };
    // Act
    const bill = fallbackCurrentBill(fallback, '2026-11-06');
    // Assert
    expect(bill).toMatchObject({ dueDate: '2026-11-10', isEstimatedDueDate: true });
  });

  it('should_not_reuse_the_date_of_a_bill_paid_ahead_of_time_when_it_is_still_in_the_future', () => {
    // Arrange
    const fallback = {
      balanceCents: 250000,
      accountDueDate: null,
      latestBillDueDate: '2026-11-10',
    };
    // Act
    const bill = fallbackCurrentBill(fallback, '2026-11-06');
    // Assert
    expect(bill).toMatchObject({ dueDate: '2026-12-10', isEstimatedDueDate: true });
  });

  it('should_roll_to_the_next_occurrence_when_the_latest_bill_is_older_than_a_month', () => {
    // Arrange
    const fallback = {
      balanceCents: 250000,
      accountDueDate: null,
      latestBillDueDate: '2026-09-10',
    };
    // Act
    const bill = fallbackCurrentBill(fallback, '2026-11-20');
    // Assert
    expect(bill).toMatchObject({ dueDate: '2026-12-10', isEstimatedDueDate: true });
  });
});
