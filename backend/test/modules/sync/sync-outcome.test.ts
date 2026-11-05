import { describe, expect, it } from 'vitest';

import {
  EMPTY_STATS,
  type ItemOutcome,
  summarizeRun,
} from '../../../src/modules/sync/sync-outcome.js';

const SYNCED: ItemOutcome = {
  status: 'synced',
  stats: { ...EMPTY_STATS, accounts: 2, transactionsInserted: 10, investments: 1 },
};
const FAILED: ItemOutcome = { status: 'failed' };

describe('summarizeRun', () => {
  it('should_finish_as_success_without_message_when_every_bank_synced', () => {
    // Arrange
    const outcomes = [SYNCED, SYNCED];
    // Act
    const run = summarizeRun(outcomes);
    // Assert
    expect(run).toEqual({
      status: 'success',
      stats: { ...EMPTY_STATS, accounts: 4, transactionsInserted: 20, investments: 2 },
      errorMessage: null,
    });
  });

  it('should_finish_as_partial_when_one_of_three_banks_failed', () => {
    // Arrange
    const outcomes = [SYNCED, FAILED, SYNCED];
    // Act
    const run = summarizeRun(outcomes);
    // Assert
    expect(run.status).toBe('partial');
  });

  it('should_use_singular_message_when_one_bank_failed', () => {
    // Arrange
    const outcomes = [SYNCED, FAILED, SYNCED];
    // Act
    const run = summarizeRun(outcomes);
    // Assert
    expect(run.errorMessage).toBe('1 de 3 bancos não sincronizou. Veja o status de cada conexão.');
  });

  it('should_use_plural_message_when_two_banks_failed', () => {
    // Arrange
    const outcomes = [FAILED, FAILED, SYNCED];
    // Act
    const run = summarizeRun(outcomes);
    // Assert
    expect(run.errorMessage).toBe(
      '2 de 3 bancos não sincronizaram. Veja o status de cada conexão.',
    );
  });

  it('should_count_only_synced_banks_when_some_failed', () => {
    // Arrange
    const outcomes = [SYNCED, FAILED];
    // Act
    const run = summarizeRun(outcomes);
    // Assert
    expect(run.stats.transactionsInserted).toBe(10);
  });

  it('should_finish_as_failed_when_no_bank_synced', () => {
    // Arrange
    const outcomes = [FAILED, FAILED];
    // Act
    const run = summarizeRun(outcomes);
    // Assert
    expect(run).toEqual({
      status: 'failed',
      stats: EMPTY_STATS,
      errorMessage: 'Nenhum banco sincronizou. Veja o status de cada conexão.',
    });
  });
});
