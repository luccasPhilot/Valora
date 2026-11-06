import type { Projection, ProjectionEvent } from '@/lib/api/projection';
import { formatIsoDayMonth } from '@/lib/format';

export const PROJECTION_NOT_COVERED_TEXT =
  'Considera só o que está previsto e as faturas. Gastos do dia a dia não entram.';

const EVENT_KIND_LABELS: Readonly<Record<ProjectionEvent['type'], string>> = {
  planned_income: 'Receita prevista',
  planned_expense: 'Despesa prevista',
  bill: 'Fatura do cartão',
};

export function describeEventKind(event: ProjectionEvent): string {
  return EVENT_KIND_LABELS[event.type];
}

/** O último dia coberto pela projeção (o fim do mês). */
export function projectionEndDate(projection: Projection): string {
  return projection.daily.at(-1)?.date ?? projection.date;
}

/** Aviso do saldo que fica abaixo de zero em algum dia; nulo se o saldo nunca passa de zero. */
export function describeNegativeBalance(projection: Projection): string | null {
  if (projection.lowestBalanceCents >= 0) return null;
  return `Saldo negativo em ${formatIsoDayMonth(projection.lowestBalanceDate)}`;
}
