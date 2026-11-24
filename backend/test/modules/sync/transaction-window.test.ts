import { describe, expect, it } from 'vitest';

import { transactionWindowFor } from '../../../src/modules/sync/transaction-window.js';

// 09:00 em São Paulo de 18/11/2026.
const NOW = new Date('2026-11-18T12:00:00Z');
const TODAY = '2026-11-18';

describe('transactionWindowFor', () => {
  it('should_start_365_days_ago_when_the_bank_was_never_synced', () => {
    // Arrange
    const lastSyncedAt = null;
    // Act
    const window = transactionWindowFor(lastSyncedAt, NOW);
    // Assert
    expect(window).toEqual({ from: '2025-11-18', to: TODAY });
  });

  it('should_start_30_days_ago_when_the_last_sync_was_yesterday', () => {
    // Arrange
    const lastSyncedAt = new Date('2026-11-17T10:00:00Z');
    // Act
    const window = transactionWindowFor(lastSyncedAt, NOW);
    // Assert
    expect(window).toEqual({ from: '2026-10-19', to: TODAY });
  });

  it('should_start_30_days_ago_when_the_bank_was_down_for_10_days', () => {
    // Arrange
    const lastSyncedAt = new Date('2026-11-08T10:00:00Z');
    // Act
    const window = transactionWindowFor(lastSyncedAt, NOW);
    // Assert
    expect(window).toEqual({ from: '2026-10-19', to: TODAY });
  });

  it('should_start_7_days_before_the_last_sync_when_the_bank_was_down_for_70_days', () => {
    // Arrange
    const lastSyncedAt = new Date('2026-09-09T10:00:00Z');
    // Act
    const window = transactionWindowFor(lastSyncedAt, NOW);
    // Assert
    expect(window).toEqual({ from: '2026-09-02', to: TODAY });
  });

  it('should_start_365_days_ago_when_the_bank_was_down_for_400_days', () => {
    // Arrange
    const lastSyncedAt = new Date('2025-10-14T10:00:00Z');
    // Act
    const window = transactionWindowFor(lastSyncedAt, NOW);
    // Assert
    expect(window).toEqual({ from: '2025-11-18', to: TODAY });
  });

  it('should_use_the_sao_paulo_day_when_the_last_sync_was_at_23_30', () => {
    // Arrange: 02:30 UTC de 10/09 = 23:30 de 09/09 em São Paulo.
    const lastSyncedAt = new Date('2026-09-10T02:30:00Z');
    // Act
    const window = transactionWindowFor(lastSyncedAt, NOW);
    // Assert
    expect(window.from).toBe('2026-09-02');
  });
});
