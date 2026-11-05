import type { SyncRunOutcome, SyncStats } from './sync-runs.repository.js';

export type ItemOutcome =
  { readonly status: 'synced'; readonly stats: SyncStats } | { readonly status: 'failed' };

export const EMPTY_STATS: SyncStats = {
  accounts: 0,
  transactionsInserted: 0,
  transactionsUpdated: 0,
  transactionsRemoved: 0,
  investments: 0,
};

const NO_BANK_SYNCED_MESSAGE = 'Nenhum banco sincronizou. Veja o status de cada conexão.';

export function addStats(left: SyncStats, right: SyncStats): SyncStats {
  return {
    accounts: left.accounts + right.accounts,
    transactionsInserted: left.transactionsInserted + right.transactionsInserted,
    transactionsUpdated: left.transactionsUpdated + right.transactionsUpdated,
    transactionsRemoved: left.transactionsRemoved + right.transactionsRemoved,
    investments: left.investments + right.investments,
  };
}

function partialMessage(failedCount: number, totalCount: number): string {
  const verb = failedCount === 1 ? 'não sincronizou' : 'não sincronizaram';
  return `${failedCount} de ${totalCount} bancos ${verb}. Veja o status de cada conexão.`;
}

/** Junta o resultado de cada banco. A mensagem é do Valora e nunca leva valores ou descrições. */
export function summarizeRun(itemOutcomes: readonly ItemOutcome[]): SyncRunOutcome {
  const syncedStats = itemOutcomes.flatMap((outcome) =>
    outcome.status === 'synced' ? [outcome.stats] : [],
  );
  const stats = syncedStats.reduce(addStats, EMPTY_STATS);
  const failedCount = itemOutcomes.length - syncedStats.length;
  if (failedCount === 0) return { status: 'success', stats, errorMessage: null };
  if (syncedStats.length === 0) {
    return { status: 'failed', stats, errorMessage: NO_BANK_SYNCED_MESSAGE };
  }
  return {
    status: 'partial',
    stats,
    errorMessage: partialMessage(failedCount, itemOutcomes.length),
  };
}
