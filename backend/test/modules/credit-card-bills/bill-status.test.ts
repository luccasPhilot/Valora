import { describe, expect, it } from 'vitest';

import { billStatus } from '../../../src/modules/credit-card-bills/bill-status.js';

const TODAY = '2026-11-06';

describe('billStatus', () => {
  it('should_be_paid_when_the_paid_amount_covers_the_total', () => {
    // Arrange
    const bill = { totalCents: 100000, paidCents: 100000, dueDate: '2026-11-10' };
    // Act
    const status = billStatus(bill, TODAY);
    // Assert
    expect(status).toBe('paid');
  });

  it('should_be_open_when_the_payment_is_partial_and_the_due_date_is_tomorrow', () => {
    // Arrange
    const bill = { totalCents: 100000, paidCents: 30000, dueDate: '2026-11-07' };
    // Act
    const status = billStatus(bill, TODAY);
    // Assert
    expect(status).toBe('open');
  });

  it('should_be_open_when_the_unpaid_bill_is_due_today', () => {
    // Arrange
    const bill = { totalCents: 100000, paidCents: 0, dueDate: TODAY };
    // Act
    const status = billStatus(bill, TODAY);
    // Assert
    expect(status).toBe('open');
  });

  it('should_be_overdue_when_the_unpaid_bill_was_due_yesterday', () => {
    // Arrange
    const bill = { totalCents: 100000, paidCents: 0, dueDate: '2026-11-05' };
    // Act
    const status = billStatus(bill, TODAY);
    // Assert
    expect(status).toBe('overdue');
  });

  it('should_be_paid_when_the_total_is_zero_even_if_the_due_date_passed', () => {
    // Arrange
    const bill = { totalCents: 0, paidCents: 0, dueDate: '2026-10-10' };
    // Act
    const status = billStatus(bill, TODAY);
    // Assert
    expect(status).toBe('paid');
  });

  it('should_be_paid_when_the_total_is_negative_because_of_a_credit', () => {
    // Arrange
    const bill = { totalCents: -5000, paidCents: 0, dueDate: '2026-10-10' };
    // Act
    const status = billStatus(bill, TODAY);
    // Assert
    expect(status).toBe('paid');
  });

  it('should_be_open_when_the_bank_gave_no_due_date', () => {
    // Arrange
    const bill = { totalCents: 85973, paidCents: 0, dueDate: null };
    // Act
    const status = billStatus(bill, TODAY);
    // Assert
    expect(status).toBe('open');
  });
});
