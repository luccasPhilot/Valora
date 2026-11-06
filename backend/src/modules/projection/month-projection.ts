import { addDays, daysBetween, lastDayOfMonth } from '../../shared/dates.js';

export type ProjectionEventType = 'planned_income' | 'planned_expense' | 'bill';

/** Ocorrência prevista ainda pendente. O valor tem sinal: negativo = despesa. */
export interface ProjectionOccurrence {
  readonly description: string;
  readonly date: string;
  readonly amountCents: number;
}

/** Fatura em aberto ou vencida, com vencimento conhecido (real ou estimado). */
export interface ProjectionBill {
  readonly description: string;
  readonly dueDate: string;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly isEstimatedDueDate: boolean;
}

export interface ProjectionInput {
  /** AAAA-MM-DD em São Paulo. */
  readonly today: string;
  readonly balanceCents: number;
  readonly occurrences: readonly ProjectionOccurrence[];
  readonly bills: readonly ProjectionBill[];
}

export interface ProjectionEvent {
  readonly type: ProjectionEventType;
  /** Dia em que o valor é aplicado: hoje, se a data prevista já passou. */
  readonly date: string;
  readonly description: string;
  /** Com sinal: negativo = sai dinheiro. */
  readonly amountCents: number;
  readonly isOverdue: boolean;
  /** Só nas faturas: o vencimento foi estimado, não informado pelo banco. */
  readonly isEstimatedDate: boolean;
}

export interface DailyBalance {
  readonly date: string;
  /** Saldo no fim do dia. */
  readonly balanceCents: number;
}

export interface MonthProjection {
  readonly date: string;
  readonly startBalanceCents: number;
  readonly plannedIncomeCents: number;
  /** Positivo: é o quanto vai sair. */
  readonly plannedExpenseCents: number;
  /** Positivo: é o quanto vai sair. */
  readonly billsDueCents: number;
  readonly projectedBalanceCents: number;
  readonly lowestBalanceCents: number;
  readonly lowestBalanceDate: string;
  readonly daily: readonly DailyBalance[];
  readonly events: readonly ProjectionEvent[];
}

interface LowestPoint {
  readonly balanceCents: number;
  readonly date: string;
}

function toOccurrenceEvent(occurrence: ProjectionOccurrence, today: string): ProjectionEvent {
  return {
    type: occurrence.amountCents > 0 ? 'planned_income' : 'planned_expense',
    date: occurrence.date < today ? today : occurrence.date,
    description: occurrence.description,
    amountCents: occurrence.amountCents,
    isOverdue: occurrence.date < today,
    isEstimatedDate: false,
  };
}

function toBillEvent(bill: ProjectionBill, today: string): ProjectionEvent {
  const unpaidCents = Math.max(bill.totalCents - bill.paidCents, 0);
  return {
    type: 'bill',
    date: bill.dueDate < today ? today : bill.dueDate,
    description: bill.description,
    amountCents: -unpaidCents,
    isOverdue: bill.dueDate < today,
    isEstimatedDate: bill.isEstimatedDueDate,
  };
}

// No mesmo dia, as saídas (valores mais negativos) vêm antes das entradas: a convenção é
// conservadora e é ela que faz o ponto mais baixo do dia aparecer.
function byDateThenOutflowsFirst(first: ProjectionEvent, second: ProjectionEvent): number {
  return (
    first.date.localeCompare(second.date) ||
    first.amountCents - second.amountCents ||
    first.description.localeCompare(second.description, 'pt-BR')
  );
}

function sumCents(events: readonly ProjectionEvent[]): number {
  return events.reduce((sum, event) => sum + event.amountCents, 0);
}

function findLowestPoint(
  startBalanceCents: number,
  today: string,
  events: readonly ProjectionEvent[],
): LowestPoint {
  let running = startBalanceCents;
  let lowest: LowestPoint = { balanceCents: running, date: today };
  for (const event of events) {
    running += event.amountCents;
    if (running < lowest.balanceCents) lowest = { balanceCents: running, date: event.date };
  }
  return lowest;
}

function buildDailyBalances(
  startBalanceCents: number,
  today: string,
  events: readonly ProjectionEvent[],
): DailyBalance[] {
  const dayCount = daysBetween(today, lastDayOfMonth(today)) + 1;
  return Array.from({ length: dayCount }, (_, offset) => {
    const date = addDays(today, offset);
    const happened = events.filter((event) => event.date <= date);
    return { date, balanceCents: startBalanceCents + sumCents(happened) };
  });
}

/**
 * Projeção de hoje até o último dia do mês: `saldo + receitas previstas − despesas previstas −
 * parte não paga das faturas`. Itens atrasados caem em hoje; fatura que vence depois do fim do mês
 * ou já paga fica de fora. No mesmo dia, as saídas são aplicadas antes das entradas.
 */
export function projectEndOfMonth(input: ProjectionInput): MonthProjection {
  const { today, balanceCents } = input;
  const monthEnd = lastDayOfMonth(today);
  const occurrenceEvents = input.occurrences.map((occurrence) =>
    toOccurrenceEvent(occurrence, today),
  );
  const billEvents = input.bills
    .map((bill) => toBillEvent(bill, today))
    .filter((event) => event.amountCents < 0);
  const events = [...occurrenceEvents, ...billEvents]
    .filter((event) => event.date <= monthEnd)
    .sort(byDateThenOutflowsFirst);
  const eventsOfType = (type: ProjectionEventType) => events.filter((event) => event.type === type);
  const lowest = findLowestPoint(balanceCents, today, events);
  return {
    date: today,
    startBalanceCents: balanceCents,
    plannedIncomeCents: sumCents(eventsOfType('planned_income')),
    plannedExpenseCents: -sumCents(eventsOfType('planned_expense')),
    billsDueCents: -sumCents(eventsOfType('bill')),
    projectedBalanceCents: balanceCents + sumCents(events),
    lowestBalanceCents: lowest.balanceCents,
    lowestBalanceDate: lowest.date,
    daily: buildDailyBalances(balanceCents, today, events),
    events,
  };
}
