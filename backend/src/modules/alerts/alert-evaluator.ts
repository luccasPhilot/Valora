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
  consentExpiringSituations,
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
  /** Avisa por push dos alertas novos; sem ele (push desligado nos testes), ninguém é avisado. */
  readonly notifier?: { notifyNewAlerts(types: readonly string[]): Promise<void> };
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
      this.collectBudgets(),
      this.collectConnections(),
      this.collectTransactionPatterns(),
      this.collectYearEndSnapshots(),
    ]);
    // Um push só por avaliação, com tudo que nasceu, mesmo que uma das partes tenha falhado.
    await this.notify(
      results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    );
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
  }

  /** Só o mês atual conta: alertas de meses que já acabaram ficam fora do conjunto e são resolvidos. */
  async evaluateBudgets(): Promise<void> {
    await this.notify(await this.collectBudgets());
  }

  async evaluateConnections(): Promise<void> {
    await this.notify(await this.collectConnections());
  }

  /**
   * Alertas de evento (cobrança duplicada e assinatura): só inserem, pela `dedupe_key`. Nunca resolvem:
   * o alerta fica até o usuário dispensar, e a chave presa no índice parcial impede que ele renasça.
   */
  async evaluateTransactionPatterns(): Promise<void> {
    await this.notify(await this.collectTransactionPatterns());
  }

  /**
   * Foto de 31/12. No próprio dia, o alerta é reconciliado: some quando uma sincronização completa as
   * fotos. Em janeiro, a foto que faltou não pode mais ser gravada, então o alerta é de evento. Fora
   * desses dias, só resolve o alerta do dia que tenha sobrado, sem contar fotos.
   */
  async evaluateYearEndSnapshots(): Promise<void> {
    await this.notify(await this.collectYearEndSnapshots());
  }

  // Cada `collect*` grava e devolve os tipos dos alertas que nasceram agora, sem avisar ninguém.
  private async collectBudgets(): Promise<AlertType[]> {
    const month = firstDayOfMonth(todayInSaoPaulo(this.deps.now()));
    const records = await this.deps.budgets.findForMonth(month);
    return this.reconcile(BUDGET_ALERT_TYPES, budgetSituations(month, records));
  }

  private async collectConnections(): Promise<AlertType[]> {
    const connections = await this.deps.connections.findActive();
    return this.reconcile(CONNECTION_ALERT_TYPES, [
      ...connectionSituations(connections),
      ...consentExpiringSituations(connections, this.deps.now()),
    ]);
  }

  private async collectTransactionPatterns(): Promise<AlertType[]> {
    const today = todayInSaoPaulo(this.deps.now());
    const rows = await this.deps.charges.findOutflowsSince(
      addMonthsKeepingDay(today, -PATTERN_LOOKBACK_MONTHS),
    );
    return this.deps.alerts.createIgnoringConflict([
      ...detectDuplicateCharges(rows, today),
      ...detectSubscriptions(rows, today),
    ]);
  }

  private async collectYearEndSnapshots(): Promise<AlertType[]> {
    const check = yearEndCheckFor(todayInSaoPaulo(this.deps.now()));
    if (check?.kind === 'pending') {
      return this.reconcile(YEAR_END_PENDING_ALERT_TYPES, await this.yearEndSituations(check));
    }
    // O alerta do dia acaba com o dia, mesmo que a primeira avaliação depois dele seja em fevereiro.
    await this.reconcile(YEAR_END_PENDING_ALERT_TYPES, []);
    if (!check) return [];
    return this.deps.alerts.createIgnoringConflict(await this.yearEndSituations(check));
  }

  private async notify(createdTypes: readonly AlertType[]): Promise<void> {
    await this.deps.notifier?.notifyNewAlerts(createdTypes);
  }

  private async yearEndSituations(check: YearEndCheck): Promise<AlertSituation[]> {
    const counts = await this.deps.yearEndSnapshots.countMissingSnapshots(check.date);
    const situation = yearEndSnapshotSituation(check, counts);
    return situation ? [situation] : [];
  }

  private async reconcile(
    types: readonly AlertType[],
    situations: readonly AlertSituation[],
  ): Promise<AlertType[]> {
    const createdTypes = await this.deps.alerts.createIgnoringConflict(situations);
    await this.deps.alerts.resolveActiveExcept(
      types,
      situations.map((situation) => situation.dedupeKey),
    );
    return createdTypes;
  }
}
