import { budgetStatus } from '../budgets/budget-status.js';
import type { BudgetRecord } from '../budgets/budgets.repository.js';
import type { ConnectionRecord } from '../connections/connections.repository.js';

export const ALERT_TYPES = [
  'duplicate_charge',
  'subscription_detected',
  'budget_warning',
  'budget_exceeded',
  'connection_error',
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

type BudgetAlertType = 'budget_warning' | 'budget_exceeded';

/** Tipos que o avaliador de orçamento gerencia: o que ele não recalcular como ativo é resolvido. */
export const BUDGET_ALERT_TYPES: readonly BudgetAlertType[] = ['budget_warning', 'budget_exceeded'];

export const CONNECTION_ALERT_TYPES: readonly AlertType[] = ['connection_error'];

/** Uma situação que merece alerta agora. A `dedupeKey` a identifica entre uma avaliação e outra. */
export interface AlertSituation {
  readonly type: AlertType;
  readonly dedupeKey: string;
  readonly message: string;
  readonly categoryId: string | null;
  readonly connectionId: string | null;
  readonly transactionId: string | null;
}

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const DEFAULT_CONNECTION_MESSAGE = 'Este banco não está sincronizando.';

/** `month` é o dia 1 (AAAA-MM-01). */
export function budgetDedupeKey(type: BudgetAlertType, categoryId: string, month: string): string {
  return `${type}:${categoryId}:${month.slice(0, 7)}`;
}

export function connectionDedupeKey(connectionId: string): string {
  return `connection_error:${connectionId}`;
}

function monthName(month: string): string {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  if (!name) throw new RangeError(`Mês inválido, esperado AAAA-MM-DD: ${month}`);
  return name;
}

function budgetSituation(month: string, record: BudgetRecord): AlertSituation | null {
  const status = budgetStatus(record.spentCents, record.limitCents);
  if (status === 'ok') return null;
  const isExceeded = status === 'exceeded';
  const type = isExceeded ? 'budget_exceeded' : 'budget_warning';
  // Mensagem estática: nunca leva valores.
  const message = isExceeded
    ? `${record.categoryName} estourou o orçamento de ${monthName(month)}`
    : `${record.categoryName} chegou a 80% do orçamento de ${monthName(month)}`;
  return {
    type,
    dedupeKey: budgetDedupeKey(type, record.categoryId, month),
    message,
    categoryId: record.categoryId,
    connectionId: null,
    transactionId: null,
  };
}

/** Uma situação por orçamento do mês em `warning` ou `exceeded`. `exceeded` já exclui o `warning`. */
export function budgetSituations(
  month: string,
  records: readonly BudgetRecord[],
): AlertSituation[] {
  return records.flatMap((record) => budgetSituation(month, record) ?? []);
}

const BROKEN_CONNECTION_STATUSES: readonly string[] = [
  'error',
  'consent_expired',
  'item_not_found',
];

/** Uma situação por conexão com erro, consentimento expirado ou banco removido do Meu Pluggy. */
export function connectionSituations(connections: readonly ConnectionRecord[]): AlertSituation[] {
  return connections
    .filter((connection) => BROKEN_CONNECTION_STATUSES.includes(connection.status))
    .map((connection) => ({
      type: 'connection_error',
      dedupeKey: connectionDedupeKey(connection.id),
      message: `${connection.institutionName}: ${connection.statusDetail ?? DEFAULT_CONNECTION_MESSAGE}`,
      categoryId: null,
      connectionId: connection.id,
      transactionId: null,
    }));
}
