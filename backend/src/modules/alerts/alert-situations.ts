import { budgetStatus } from '../budgets/budget-status.js';
import type { BudgetRecord } from '../budgets/budgets.repository.js';
import type { ConnectionRecord } from '../connections/connections.repository.js';

export const ALERT_TYPES = [
  'duplicate_charge',
  'subscription_detected',
  'budget_warning',
  'budget_exceeded',
  'connection_error',
  'year_end_snapshot_pending',
  'year_end_snapshot_missing',
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

type BudgetAlertType = 'budget_warning' | 'budget_exceeded';

/** Tipos que o avaliador de orçamento gerencia: o que ele não recalcular como ativo é resolvido. */
export const BUDGET_ALERT_TYPES: readonly BudgetAlertType[] = ['budget_warning', 'budget_exceeded'];

export const CONNECTION_ALERT_TYPES: readonly AlertType[] = ['connection_error'];

/** Só o alerta do próprio dia 31/12 é reconciliado; o de depois da virada é de evento. */
export const YEAR_END_PENDING_ALERT_TYPES: readonly AlertType[] = ['year_end_snapshot_pending'];

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

/**
 * Qual foto de 31/12 conferir hoje: a do próprio dia em 31/12 (ainda dá para sincronizar) ou a do ano
 * anterior em janeiro (não dá mais). No resto do ano, nenhuma.
 */
export type YearEndCheck =
  | { readonly kind: 'pending'; readonly date: string }
  | { readonly kind: 'missing'; readonly date: string };

/** Quantas contas e posições deveriam ter foto no dia e não têm. */
export interface MissingSnapshotCounts {
  readonly accounts: number;
  readonly investments: number;
}

const YEAR_END_MONTH_DAY = '12-31';
const JANUARY = '01';

/** `today` em AAAA-MM-DD, no fuso de São Paulo. */
export function yearEndCheckFor(today: string): YearEndCheck | null {
  if (today.slice(5) === YEAR_END_MONTH_DAY) return { kind: 'pending', date: today };
  if (today.slice(5, 7) !== JANUARY) return null;
  const previousYear = Number(today.slice(0, 4)) - 1;
  return { kind: 'missing', date: `${previousYear}-${YEAR_END_MONTH_DAY}` };
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "2 contas e 1 investimento"; só os itens que faltam. */
function missingItemsLabel(counts: MissingSnapshotCounts): string {
  const labels = [
    counts.accounts > 0 ? countLabel(counts.accounts, 'conta', 'contas') : null,
    counts.investments > 0 ? countLabel(counts.investments, 'investimento', 'investimentos') : null,
  ];
  return labels.filter((label) => label !== null).join(' e ');
}

/** A situação de alerta da foto de 31/12, ou `null` quando nada falta. Só contagens, nunca valores. */
export function yearEndSnapshotSituation(
  check: YearEndCheck,
  counts: MissingSnapshotCounts,
): AlertSituation | null {
  if (counts.accounts + counts.investments === 0) return null;
  const year = check.date.slice(0, 4);
  const items = missingItemsLabel(counts);
  const isPending = check.kind === 'pending';
  const type = isPending ? 'year_end_snapshot_pending' : 'year_end_snapshot_missing';
  const message = isPending
    ? `Ainda falta a foto de 31/12 de ${items}. Sincronize hoje: ela é a base dos bens e direitos no IR.`
    : `31/12/${year} terminou sem a foto de ${items}. Confira esses saldos nos informes de rendimentos dos bancos.`;
  return {
    type,
    dedupeKey: `${type}:${year}`,
    message,
    categoryId: null,
    connectionId: null,
    transactionId: null,
  };
}
