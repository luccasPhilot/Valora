import { daysBetween } from '../../shared/dates.js';
import type { ConnectionStatus } from '../connections/connections.repository.js';

const STALE_AFTER_DAYS = 10;
// Poupança parada é normal; só conta corrente e cartão costumam ter movimento toda semana.
const WATCHED_ACCOUNT_TYPES: readonly string[] = ['checking', 'credit_card'];

export interface StaleAccountCandidate {
  readonly accountId: string;
  readonly accountName: string;
  readonly type: 'checking' | 'savings' | 'credit_card' | 'cash';
  readonly isHidden: boolean;
  readonly connectionStatus: ConnectionStatus;
  /** Transação do Open Finance mais recente, AAAA-MM-DD. */
  readonly lastTransactionDate: string | null;
  /** A conta não tem data de criação: a primeira foto de saldo é o dia em que ela apareceu. */
  readonly firstSnapshotDate: string | null;
}

export interface StaleAccount {
  readonly accountId: string;
  readonly accountName: string;
  readonly lastTransactionDate: string | null;
  readonly daysWithoutTransactions: number;
}

function isWatched(candidate: StaleAccountCandidate): boolean {
  return (
    WATCHED_ACCOUNT_TYPES.includes(candidate.type) &&
    !candidate.isHidden &&
    candidate.connectionStatus === 'ok'
  );
}

function toStaleAccount(candidate: StaleAccountCandidate, today: string): StaleAccount | null {
  const since = candidate.lastTransactionDate ?? candidate.firstSnapshotDate;
  if (!since) return null;
  const daysWithoutTransactions = daysBetween(since, today);
  if (daysWithoutTransactions < STALE_AFTER_DAYS) return null;
  return {
    accountId: candidate.accountId,
    accountName: candidate.accountName,
    lastTransactionDate: candidate.lastTransactionDate,
    daysWithoutTransactions,
  };
}

/** Contas correntes e cartões de bancos sincronizando sem transação há 10 dias ou mais; a mais parada primeiro. */
export function findStaleAccounts(
  candidates: readonly StaleAccountCandidate[],
  today: string,
): StaleAccount[] {
  return candidates
    .filter(isWatched)
    .flatMap((candidate) => toStaleAccount(candidate, today) ?? [])
    .sort((left, right) => right.daysWithoutTransactions - left.daysWithoutTransactions);
}
