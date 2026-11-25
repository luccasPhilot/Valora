import { subtractDays, todayInSaoPaulo } from '../../shared/dates.js';
import type { ConnectionsRepository } from '../connections/connections.repository.js';
import { consentDaysLeft } from '../connections/consent-expiry.js';
import {
  type BalanceDivergence,
  reconcileBalances,
  RECONCILIATION_LOOKBACK_DAYS,
} from './balance-reconciliation.js';
import type { DataHealthRepository, ReconciliationAccount } from './data-health.repository.js';
import { findStaleAccounts, type StaleAccount } from './stale-accounts.js';

const MAX_DIVERGENCES = 50;

export interface ConsentStatus {
  readonly connectionId: string;
  readonly institutionName: string;
  /** Nulo quando o banco não informou o vencimento. */
  readonly expiresAt: Date | null;
  readonly daysLeft: number | null;
}

export interface AccountDivergence extends BalanceDivergence {
  readonly accountName: string;
}

export interface DataHealthReport {
  readonly consents: readonly ConsentStatus[];
  readonly divergences: readonly AccountDivergence[];
  readonly staleAccounts: readonly StaleAccount[];
}

export interface DataHealthServiceDependencies {
  readonly repository: DataHealthRepository;
  readonly connections: Pick<ConnectionsRepository, 'findActive'>;
  readonly now: () => Date;
}

/** Só lê: nada aqui cria, altera ou apaga transação. */
export class DataHealthService {
  constructor(private readonly deps: DataHealthServiceDependencies) {}

  async getReport(): Promise<DataHealthReport> {
    const today = todayInSaoPaulo(this.deps.now());
    const [consents, divergences, staleAccounts] = await Promise.all([
      this.consents(),
      this.divergences(today),
      this.staleAccounts(today),
    ]);
    return { consents, divergences, staleAccounts };
  }

  private async consents(): Promise<ConsentStatus[]> {
    const now = this.deps.now();
    const connections = await this.deps.connections.findActive();
    return connections.map((connection) => ({
      connectionId: connection.id,
      institutionName: connection.institutionName,
      expiresAt: connection.consentExpiresAt,
      daysLeft: connection.consentExpiresAt
        ? consentDaysLeft(connection.consentExpiresAt, now)
        : null,
    }));
  }

  /** As 50 mais recentes, pelo fim do período. */
  private async divergences(today: string): Promise<AccountDivergence[]> {
    const since = subtractDays(today, RECONCILIATION_LOOKBACK_DAYS);
    const reconciliationAccounts = await this.deps.repository.findReconciliationAccounts(since);
    return reconciliationAccounts
      .flatMap((account) => divergencesOf(account, today))
      .sort((left, right) => right.to.localeCompare(left.to))
      .slice(0, MAX_DIVERGENCES);
  }

  private async staleAccounts(today: string): Promise<StaleAccount[]> {
    const candidates = await this.deps.repository.findStaleAccountCandidates();
    return findStaleAccounts(candidates, today);
  }
}

function divergencesOf(account: ReconciliationAccount, today: string): AccountDivergence[] {
  return reconcileBalances({ ...account, today }).map((divergence) => ({
    ...divergence,
    accountName: account.accountName,
  }));
}
