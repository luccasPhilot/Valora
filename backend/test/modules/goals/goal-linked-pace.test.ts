import { describe, expect, it } from 'vitest';

import {
  estimateLinkedPace,
  type LinkedPaceItem,
  linkedSavedCents,
} from '../../../src/modules/goals/goal-linked-pace.js';

const TODAY = '2026-11-15';
const REMAINING_CENTS = 1_000_000;

function item(balanceCents: number, snapshots: LinkedPaceItem['snapshots']): LinkedPaceItem {
  return { balanceCents, snapshots };
}

describe('estimateLinkedPace', () => {
  it('should_use_the_variation_since_the_first_snapshot_when_the_history_is_90_days_long', () => {
    // Arrange
    const items = [item(990_000, [{ date: '2026-08-17', balanceCents: 900_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(30_000);
  });

  it('should_use_the_minimum_30_day_window_when_the_first_snapshot_is_6_days_old', () => {
    // Arrange
    const items = [item(530_000, [{ date: '2026-11-09', balanceCents: 500_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.windowDays).toBe(30);
  });

  it('should_return_the_variation_as_monthly_rate_when_the_window_is_the_minimum', () => {
    // Arrange
    const items = [item(530_000, [{ date: '2026-11-09', balanceCents: 500_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(30_000);
  });

  it('should_use_a_window_of_exactly_30_days_when_the_first_snapshot_is_30_days_old', () => {
    // Arrange
    const items = [item(530_000, [{ date: '2026-10-16', balanceCents: 500_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.windowDays).toBe(30);
  });

  it('should_cap_the_window_at_90_days_when_the_snapshot_is_exactly_90_days_old', () => {
    // Arrange
    const items = [item(530_000, [{ date: '2026-08-17', balanceCents: 500_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.windowDays).toBe(90);
  });

  it('should_ignore_snapshots_older_than_90_days_when_looking_for_the_first_one', () => {
    // Arrange
    const items = [
      item(990_000, [
        { date: '2026-08-16', balanceCents: 100_000 },
        { date: '2026-08-17', balanceCents: 900_000 },
      ]),
    ];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(30_000);
  });

  it('should_return_zero_rate_when_the_balance_dropped', () => {
    // Arrange
    const items = [item(400_000, [{ date: '2026-10-01', balanceCents: 500_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(0);
  });

  it('should_return_zero_rate_when_the_only_snapshot_is_from_today', () => {
    // Arrange
    const items = [item(500_000, [{ date: TODAY, balanceCents: 500_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(0);
  });

  it('should_return_zero_rate_when_there_are_no_items', () => {
    // Arrange
    const items: LinkedPaceItem[] = [];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(0);
  });

  it('should_not_count_the_whole_balance_as_pace_when_an_item_has_only_recent_snapshots', () => {
    // Arrange
    const items = [
      item(500_000, [{ date: '2026-08-17', balanceCents: 500_000 }]),
      item(2_000_000, [{ date: '2026-11-10', balanceCents: 2_000_000 }]),
    ];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(0);
  });

  it('should_sum_the_variations_of_all_items_when_there_are_several', () => {
    // Arrange
    const items = [
      item(1_000_000, [{ date: '2026-08-17', balanceCents: 940_000 }]),
      item(260_000, [{ date: '2026-08-17', balanceCents: 200_000 }]),
    ];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(40_000);
  });

  it('should_floor_the_rate_in_integer_cents_when_the_division_is_not_exact', () => {
    // Arrange
    const items = [item(100_100, [{ date: '2026-08-17', balanceCents: 100_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(33);
  });

  it('should_estimate_the_months_with_the_shared_rule_when_there_is_pace', () => {
    // Arrange
    const items = [item(530_000, [{ date: '2026-11-09', balanceCents: 500_000 }])];
    // Act
    const pace = estimateLinkedPace(items, REMAINING_CENTS, TODAY);
    // Assert
    expect(pace.monthsToGo).toBe(34);
  });
});

describe('linkedSavedCents', () => {
  it('should_sum_the_balances_when_all_items_are_from_active_banks', () => {
    // Arrange
    const items = [
      { balanceCents: 1_000_000, isArchived: false },
      { balanceCents: 250_000, isArchived: false },
    ];
    // Act
    const savedCents = linkedSavedCents(items);
    // Assert
    expect(savedCents).toBe(1_250_000);
  });

  it('should_count_zero_for_an_item_of_an_archived_bank', () => {
    // Arrange
    const items = [
      { balanceCents: 1_000_000, isArchived: true },
      { balanceCents: 250_000, isArchived: false },
    ];
    // Act
    const savedCents = linkedSavedCents(items);
    // Assert
    expect(savedCents).toBe(250_000);
  });

  it('should_floor_at_zero_when_the_sum_is_negative', () => {
    // Arrange
    const items = [{ balanceCents: -20_000, isArchived: false }];
    // Act
    const savedCents = linkedSavedCents(items);
    // Assert
    expect(savedCents).toBe(0);
  });

  it('should_return_zero_when_there_are_no_items', () => {
    // Arrange
    const items: { balanceCents: number; isArchived: boolean }[] = [];
    // Act
    const savedCents = linkedSavedCents(items);
    // Assert
    expect(savedCents).toBe(0);
  });
});
