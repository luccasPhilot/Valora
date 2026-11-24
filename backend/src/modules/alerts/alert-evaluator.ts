import { addMonthsKeepingDay, firstDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import type { BudgetsRepository } from '../budgets/budgets.repository.js';
import type { ConnectionsRepository } from '../connections/connections.repository.js';
import type { AlertChargesRepository } from './alert-charges.repository.js';
import {
  type AlertSituation,
  type AlertType,
  BUDGET_ALERT_TYPES,
  budgetSituations,
  CONNECTION_ALERT_TYPES,
  connectionSituations,
  YEAR_END_PENDING_ALERT_TYPES,
  type YearEndCheck,
  yearEndCheckFor,
  yearEndSnapshotSituation,
} from './alert-situations.js';
import type { AlertsRepository } from './alerts.repository.js';
import { PATTERN_LOOKBACK_MONTHS } from './detectors/charge-row.js';
import { detectDuplicateCharges } from './detectors/duplicate-charges.js';
import { detectSubscriptions } from './detectors/subscriptions.js';
import type { YearEndSnapshotsRepository } from './year-end-snapshots.repository.js';

export interface AlertEvaluatorDependencies {
  readonly alerts: AlertsRepository;
  readonly budgets: Pick<BudgetsRepository, 'findForMonth'>;
  readonly connections: Pick<ConnectionsRepository, 'findActive'>;
  readonly charges: Pick<AlertChargesRepository, 'findOutflowsSince'>;
  readonly yearEndSnapshots: Pick<YearEndSnapshotsRepository, 'countMissingSnapshots'>;
  readonly now: () => Date;
}

/**
 * Calcula as situações que merecem alerta agora e reconcilia com o que existe: cria o que falta e
 * resolve o que acabou. É idempotente: rodar duas vezes seguidas não muda nada. Lança em caso de
 * falha; quem chama decide como isolar o erro (a sincronização e as gravações do usuário nunca falham por isso).
 */
export class AlertEvaluator {
  constructor(private readonly deps: AlertEvaluatorDependencies) {}

  async evaluateAll(): Promise<void> {
    const results = await Promise.allSettled([
      this.evaluateBudgets(),
      this.evaluateConnections(),
      this.evaluateTransactionPatterns(),
      this.evaluateYearEndSnapshots(),
    ]);
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
  }

  /** Só o mês atual conta: alertas de meses que já acabaram ficam fora do conjunto e são resolvidos. */
  async evaluateBudgets(): Promise<void> {
    const month = firstDayOfMonth(todayInSaoPaulo(this.deps.now()));
    const records = await this.deps.budgets.findForMonth(month);
    await this.reconcile(BUDGET_ALERT_TYPES, budgetSituations(month, records));
  }

  async evaluateConnections(): Promise<void> {
    const connections = await this.deps.connections.findActive();
    await this.reconcile(CONNECTION_ALERT_TYPES, connectionSituations(connections));
  }

  /**
   * Alertas de evento (cobrança duplicada e assinatura): só inserem, pela `dedupe_key`. Nunca resolvem:
   * o alerta fica até o usuário dispensar, e a chave presa no índice parcial impede que ele renasça.
   */
  async evaluateTransactionPatterns(): Promise<void> {
    const today = todayInSaoPaulo(this.deps.now());
    const rows = await this.deps.charges.findOutflowsSince(
      addMonthsKeepingDay(today, -PATTERN_LOOKBACK_MONTHS),
    );
    await this.deps.alerts.createIgnoringConflict([
      ...detectDuplicateCharges(rows, today),
      ...detectSubscriptions(rows, today),
    ]);
  }

  /**
   * Foto de 31/12. No próprio dia, o alerta é reconciliado: some quando uma sincronização completa as
   * fotos. Em janeiro, a foto que faltou não pode mais ser gravada, então o alerta é de evento. Fora
   * desses dias, só resolve o alerta do dia que tenha sobrado, sem contar fotos.
   */
  async evaluateYearEndSnapshots(): Promise<void> {
    const check = yearEndCheckFor(todayInSaoPaulo(this.deps.now()));
    if (check?.kind === 'pending') {
      await this.reconcile(YEAR_END_PENDING_ALERT_TYPES, await this.yearEndSituations(check));
      return;
    }
    // O alerta do dia acaba com o dia, mesmo que a primeira avaliação depois dele seja em fevereiro.
    await this.reconcile(YEAR_END_PENDING_ALERT_TYPES, []);
    if (check) await this.deps.alerts.createIgnoringConflict(await this.yearEndSituations(check));
  }

  private async yearEndSituations(check: YearEndCheck): Promise<AlertSituation[]> {
    const counts = await this.deps.yearEndSnapshots.countMissingSnapshots(check.date);
    const situation = yearEndSnapshotSituation(check, counts);
    return situation ? [situation] : [];
  }

  private async reconcile(
    types: readonly AlertType[],
    situations: readonly AlertSituation[],
  ): Promise<void> {
    await this.deps.alerts.createIgnoringConflict(situations);
    await this.deps.alerts.resolveActiveExcept(
      types,
      situations.map((situation) => situation.dedupeKey),
    );
  }
}
