import { describe, expect, it } from 'vitest';

import {
  findStaleAccounts,
  type StaleAccountCandidate,
} from '../../../src/modules/data-health/stale-accounts.js';

const TODAY = '2026-11-24';

function candidate(overrides: Partial<StaleAccountCandidate> = {}): StaleAccountCandidate {
  return {
    accountId: '11111111-1111-4111-8111-111111111111',
    accountName: 'Cartão Azul',
    type: 'credit_card',
    isHidden: false,
    connectionStatus: 'ok',
    lastTransactionDate: '2026-11-10',
    firstSnapshotDate: '2026-10-01',
    ...overrides,
  };
}

describe('findStaleAccounts', () => {
  it('should_list_the_card_when_its_latest_transaction_is_14_days_old', () => {
    // Arrange
    const candidates = [candidate()];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([
      {
        accountId: '11111111-1111-4111-8111-111111111111',
        accountName: 'Cartão Azul',
        lastTransactionDate: '2026-11-10',
        daysWithoutTransactions: 14,
      },
    ]);
  });

  it('should_not_list_the_account_when_its_latest_transaction_is_9_days_old', () => {
    // Arrange
    const candidates = [candidate({ lastTransactionDate: '2026-11-15' })];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([]);
  });

  it('should_list_the_account_when_its_latest_transaction_is_10_days_old', () => {
    // Arrange
    const candidates = [candidate({ type: 'checking', lastTransactionDate: '2026-11-14' })];
    // Act
    const [stale] = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale?.daysWithoutTransactions).toBe(10);
  });

  it('should_list_the_account_when_it_has_no_transactions_and_was_first_seen_10_days_ago', () => {
    // Arrange
    const candidates = [candidate({ lastTransactionDate: null, firstSnapshotDate: '2026-11-14' })];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([
      expect.objectContaining({ lastTransactionDate: null, daysWithoutTransactions: 10 }),
    ]);
  });

  it('should_not_list_the_account_when_it_has_no_transactions_and_was_first_seen_9_days_ago', () => {
    // Arrange
    const candidates = [candidate({ lastTransactionDate: null, firstSnapshotDate: '2026-11-15' })];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([]);
  });

  it('should_not_list_the_account_when_it_has_no_transactions_and_no_snapshots', () => {
    // Arrange
    const candidates = [candidate({ lastTransactionDate: null, firstSnapshotDate: null })];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([]);
  });

  it('should_not_list_savings_accounts', () => {
    // Arrange
    const candidates = [candidate({ type: 'savings', lastTransactionDate: '2026-09-25' })];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([]);
  });

  it('should_not_list_hidden_accounts', () => {
    // Arrange
    const candidates = [candidate({ isHidden: true })];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([]);
  });

  it('should_not_list_accounts_of_a_bank_that_is_not_syncing', () => {
    // Arrange
    const candidates = [candidate({ connectionStatus: 'error' })];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale).toEqual([]);
  });

  it('should_list_the_longest_stale_account_first', () => {
    // Arrange
    const candidates = [
      candidate({ accountId: 'a', lastTransactionDate: '2026-11-12' }),
      candidate({ accountId: 'b', lastTransactionDate: '2026-11-01' }),
    ];
    // Act
    const stale = findStaleAccounts(candidates, TODAY);
    // Assert
    expect(stale.map(({ accountId }) => accountId)).toEqual(['b', 'a']);
  });
});
