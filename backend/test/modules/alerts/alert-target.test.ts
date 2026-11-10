import { describe, expect, it } from 'vitest';

import { alertTarget, type AlertTargetSource } from '../../../src/modules/alerts/alert-target.js';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';

describe('alertTarget', () => {
  it('should_point_to_the_budget_month_when_the_alert_is_a_budget_warning', () => {
    // Arrange
    const alert: AlertTargetSource = {
      type: 'budget_warning',
      dedupeKey: `budget_warning:${CATEGORY_ID}:2026-11`,
      categoryId: CATEGORY_ID,
      transaction: null,
    };
    // Act
    const target = alertTarget(alert);
    // Assert
    expect(target).toEqual({ screen: 'budgets', month: '2026-11', categoryId: CATEGORY_ID });
  });

  it('should_point_to_the_budget_month_when_the_alert_is_a_budget_exceeded', () => {
    // Arrange
    const alert: AlertTargetSource = {
      type: 'budget_exceeded',
      dedupeKey: `budget_exceeded:${CATEGORY_ID}:2026-12`,
      categoryId: CATEGORY_ID,
      transaction: null,
    };
    // Act
    const target = alertTarget(alert);
    // Assert
    expect(target).toEqual({ screen: 'budgets', month: '2026-12', categoryId: CATEGORY_ID });
  });

  it('should_point_to_the_accounts_screen_when_the_alert_is_a_connection_error', () => {
    // Arrange
    const alert: AlertTargetSource = {
      type: 'connection_error',
      dedupeKey: 'connection_error:x',
      categoryId: null,
      transaction: null,
    };
    // Act
    const target = alertTarget(alert);
    // Assert
    expect(target).toEqual({ screen: 'accounts' });
  });

  it('should_return_null_when_a_transaction_alert_lost_its_transaction', () => {
    // Arrange
    const alert: AlertTargetSource = {
      type: 'duplicate_charge',
      dedupeKey: 'duplicate_charge:x',
      categoryId: null,
      transaction: null,
    };
    // Act
    const target = alertTarget(alert);
    // Assert
    expect(target).toBeNull();
  });

  it('should_return_null_when_a_budget_alert_has_no_category', () => {
    // Arrange
    const alert: AlertTargetSource = {
      type: 'budget_warning',
      dedupeKey: `budget_warning:${CATEGORY_ID}:2026-11`,
      categoryId: null,
      transaction: null,
    };
    // Act
    const target = alertTarget(alert);
    // Assert
    expect(target).toBeNull();
  });

  it.each(['duplicate_charge', 'subscription_detected'] as const)(
    'should_point_to_the_transaction_day_and_description_when_the_alert_is_%s',
    (type) => {
      // Arrange
      const alert: AlertTargetSource = {
        type,
        dedupeKey: `${type}:x`,
        categoryId: null,
        transaction: { date: '2026-11-09', descriptionNormalized: 'LOJA EXEMPLO' },
      };
      // Act
      const target = alertTarget(alert);
      // Assert
      expect(target).toEqual({
        screen: 'transactions',
        from: '2026-11-09',
        to: '2026-11-09',
        search: 'LOJA EXEMPLO',
      });
    },
  );

  it('should_limit_the_search_to_one_hundred_characters_when_the_description_is_longer', () => {
    // Arrange
    const alert: AlertTargetSource = {
      type: 'duplicate_charge',
      dedupeKey: 'duplicate_charge:x',
      categoryId: null,
      transaction: { date: '2026-11-09', descriptionNormalized: 'A'.repeat(150) },
    };
    // Act
    const target = alertTarget(alert);
    // Assert
    expect(target).toMatchObject({ search: 'A'.repeat(100) });
  });
});
