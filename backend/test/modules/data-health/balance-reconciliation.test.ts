import { describe, expect, it } from 'vitest';

import {
  reconcileBalances,
  type ReconciliationTransaction,
} from '../../../src/modules/data-health/balance-reconciliation.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const TODAY = '2026-11-24';

function posted(date: string, amountCents: number): ReconciliationTransaction {
  return { date, amountCents, status: 'posted', source: 'open_finance' };
}

function reconcile(
  snapshots: readonly { date: string; balanceCents: number }[],
  transactions: readonly ReconciliationTransaction[] = [],
) {
  return reconcileBalances({ accountId: ACCOUNT_ID, snapshots, transactions, today: TODAY });
}

describe('reconcileBalances', () => {
  it('should_return_nothing_when_the_balance_change_matches_the_transactions', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 88_000 },
    ];
    // Act
    const divergences = reconcile(snapshots, [posted('2026-11-03', -12_000)]);
    // Assert
    expect(divergences).toEqual([]);
  });

  it('should_return_a_divergence_when_a_transaction_is_missing', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 88_000 },
    ];
    // Act
    const divergences = reconcile(snapshots);
    // Assert
    expect(divergences).toEqual([
      { accountId: ACCOUNT_ID, from: '2026-11-03', to: '2026-11-04', differenceCents: -12_000 },
    ]);
  });

  it('should_count_transactions_from_the_first_day_and_not_from_the_last_day', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 88_000 },
    ];
    // Act
    const divergences = reconcile(snapshots, [posted('2026-11-04', -12_000)]);
    // Assert
    expect(divergences).toHaveLength(1);
  });

  it('should_skip_the_pair_when_the_latest_snapshot_is_less_than_3_days_old', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-22', balanceCents: 100_000 },
      { date: '2026-11-23', balanceCents: 88_000 },
    ];
    // Act
    const divergences = reconcile(snapshots);
    // Assert
    expect(divergences).toEqual([]);
  });

  it('should_check_the_pair_when_the_latest_snapshot_is_exactly_3_days_old', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-20', balanceCents: 100_000 },
      { date: '2026-11-21', balanceCents: 88_000 },
    ];
    // Act
    const divergences = reconcile(snapshots);
    // Assert
    expect(divergences).toHaveLength(1);
  });

  it('should_skip_pairs_older_than_60_days', () => {
    // Arrange
    const snapshots = [
      { date: '2026-09-24', balanceCents: 100_000 },
      { date: '2026-09-25', balanceCents: 88_000 },
    ];
    // Act
    const divergences = reconcile(snapshots);
    // Assert
    expect(divergences).toEqual([]);
  });

  it('should_return_nothing_when_differences_of_consecutive_periods_cancel_out', () => {
    // Arrange: a compra de 03/11 chegou com data de 04/11.
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 95_000 },
      { date: '2026-11-05', balanceCents: 95_000 },
    ];
    // Act
    const divergences = reconcile(snapshots, [posted('2026-11-04', -5_000)]);
    // Assert
    expect(divergences).toEqual([]);
  });

  it('should_join_consecutive_periods_into_one_divergence_when_they_do_not_cancel_out', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 95_000 },
      { date: '2026-11-05', balanceCents: 93_000 },
    ];
    // Act
    const divergences = reconcile(snapshots, [posted('2026-11-04', -4_000)]);
    // Assert
    expect(divergences).toEqual([
      { accountId: ACCOUNT_ID, from: '2026-11-03', to: '2026-11-05', differenceCents: -3_000 },
    ]);
  });

  it('should_keep_divergences_apart_when_a_matching_period_separates_them', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 95_000 },
      { date: '2026-11-05', balanceCents: 95_000 },
      { date: '2026-11-06', balanceCents: 96_000 },
    ];
    // Act
    const divergences = reconcile(snapshots);
    // Assert
    expect(divergences.map(({ from, to }) => `${from}..${to}`)).toEqual([
      '2026-11-03..2026-11-04',
      '2026-11-05..2026-11-06',
    ]);
  });

  it('should_ignore_pending_transactions', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 100_000 },
    ];
    const pending: ReconciliationTransaction = {
      ...posted('2026-11-03', -12_000),
      status: 'pending',
    };
    // Act
    const divergences = reconcile(snapshots, [pending]);
    // Assert
    expect(divergences).toEqual([]);
  });

  it('should_ignore_manual_transactions', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-04', balanceCents: 88_000 },
    ];
    const manual: ReconciliationTransaction = {
      ...posted('2026-11-03', -12_000),
      source: 'manual',
    };
    // Act
    const divergences = reconcile(snapshots, [manual]);
    // Assert
    expect(divergences).toHaveLength(1);
  });

  it('should_compare_the_whole_gap_when_snapshots_are_days_apart', () => {
    // Arrange
    const snapshots = [
      { date: '2026-11-03', balanceCents: 100_000 },
      { date: '2026-11-06', balanceCents: 90_000 },
    ];
    // Act
    const divergences = reconcile(snapshots, [
      posted('2026-11-03', -4_000),
      posted('2026-11-05', -6_000),
    ]);
    // Assert
    expect(divergences).toEqual([]);
  });

  it('should_return_nothing_when_the_account_has_no_snapshots', () => {
    // Arrange & Act
    const divergences = reconcile([], [posted('2026-11-03', -12_000)]);
    // Assert
    expect(divergences).toEqual([]);
  });

  it('should_return_nothing_when_the_account_has_a_single_snapshot', () => {
    // Arrange & Act
    const divergences = reconcile([{ date: '2026-11-03', balanceCents: 100_000 }]);
    // Assert
    expect(divergences).toEqual([]);
  });
});
