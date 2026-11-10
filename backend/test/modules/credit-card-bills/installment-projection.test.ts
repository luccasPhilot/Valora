import { describe, expect, it } from 'vitest';

import {
  type InstallmentTransaction,
  projectFutureInstallments,
} from '../../../src/modules/credit-card-bills/installment-projection.js';

const TODAY = '2026-11-20';

function installment(overrides: Partial<InstallmentTransaction> = {}): InstallmentTransaction {
  return {
    descriptionNormalized: 'LOJA X',
    date: '2026-11-15',
    amountCents: -10000,
    installmentNumber: 1,
    installmentTotal: 3,
    ...overrides,
  };
}

describe('projectFutureInstallments', () => {
  it('should_project_the_remaining_installments_one_per_month_when_the_purchase_is_on_installment_1_of_3', () => {
    // Arrange
    const transactions = [installment()];
    // Act
    const months = projectFutureInstallments(transactions, TODAY);
    // Assert
    expect(months).toEqual([
      { month: '2026-12-01', totalCents: 10000 },
      { month: '2027-01-01', totalCents: 10000 },
    ]);
  });

  it('should_project_nothing_when_the_latest_installment_is_the_last_one', () => {
    // Arrange
    const transactions = [installment({ installmentNumber: 3 })];
    // Act
    const months = projectFutureInstallments(transactions, TODAY);
    // Assert
    expect(months).toEqual([]);
  });

  it('should_fall_on_the_last_day_of_the_month_when_the_purchase_day_does_not_exist_there', () => {
    // Arrange
    const transactions = [installment({ date: '2027-01-31' })];
    // Act
    const months = projectFutureInstallments(transactions, '2027-01-31');
    // Assert
    expect(months.map((entry) => entry.month)).toEqual(['2027-02-01', '2027-03-01']);
  });

  it('should_ignore_the_purchase_when_it_is_paid_in_full_upfront', () => {
    // Arrange
    const transactions = [installment({ installmentTotal: 1, installmentNumber: 1 })];
    // Act
    const months = projectFutureInstallments(transactions, TODAY);
    // Assert
    expect(months).toEqual([]);
  });

  it('should_group_installments_of_one_purchase_when_the_cents_differ_between_them', () => {
    // Arrange
    const transactions = [
      installment({ installmentNumber: 1, date: '2026-09-15', amountCents: -6000 }),
      installment({ installmentNumber: 2, date: '2026-10-15', amountCents: -5998 }),
    ];
    // Act
    const months = projectFutureInstallments(transactions, '2026-10-20');
    // Assert
    expect(months).toEqual([{ month: '2026-11-01', totalCents: 5998 }]);
  });

  it('should_sum_the_months_of_different_purchases_when_they_fall_in_the_same_month', () => {
    // Arrange
    const transactions = [
      installment(),
      installment({ descriptionNormalized: 'LOJA Y', amountCents: -2500 }),
    ];
    // Act
    const months = projectFutureInstallments(transactions, TODAY);
    // Assert
    expect(months[0]).toEqual({ month: '2026-12-01', totalCents: 12500 });
  });

  it('should_skip_projected_months_that_already_passed_when_the_installment_never_arrived', () => {
    // Arrange
    const transactions = [installment({ date: '2026-07-15' })];
    // Act
    const months = projectFutureInstallments(transactions, TODAY);
    // Assert
    expect(months).toEqual([]);
  });

  it('should_stop_at_twelve_months_when_the_plan_is_longer', () => {
    // Arrange
    const transactions = [installment({ installmentTotal: 24, date: '2026-10-15' })];
    // Act
    const months = projectFutureInstallments(transactions, TODAY);
    // Assert
    expect(months).toHaveLength(12);
  });

  it('should_ignore_refunds_when_the_amount_is_positive', () => {
    // Arrange
    const transactions = [installment({ amountCents: 10000 })];
    // Act
    const months = projectFutureInstallments(transactions, TODAY);
    // Assert
    expect(months).toEqual([]);
  });
});
