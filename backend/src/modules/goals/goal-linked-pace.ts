import { daysBetween, subtractDays } from '../../shared/dates.js';
import {
  estimateFromRate,
  type GoalPaceEstimate,
  MIN_PACE_WINDOW_DAYS,
  PACE_WINDOW_DAYS,
} from './goal-pace.js';

const DAYS_PER_MONTH = 30;

export interface LinkedBalanceSnapshot {
  readonly date: string;
  readonly balanceCents: number;
}

/** Item vinculado de banco ativo, com as fotos diárias dele. */
export interface LinkedPaceItem {
  readonly balanceCents: number;
  readonly snapshots: readonly LinkedBalanceSnapshot[];
}

export interface LinkedBalance {
  readonly balanceCents: number;
  readonly isArchived: boolean;
}

/** Valor acumulado de uma meta vinculada: soma dos saldos de bancos ativos, nunca abaixo de zero. */
export function linkedSavedCents(items: readonly LinkedBalance[]): number {
  const totalCents = items
    .filter(({ isArchived }) => !isArchived)
    .reduce((sum, { balanceCents }) => sum + balanceCents, 0);
  return Math.max(0, totalCents);
}

// A foto mais antiga do item entre os últimos 90 dias e ontem; a de hoje é o próprio saldo atual.
function firstSnapshot(
  snapshots: readonly LinkedBalanceSnapshot[],
  today: string,
): LinkedBalanceSnapshot | null {
  const windowStart = subtractDays(today, PACE_WINDOW_DAYS);
  const inWindow = snapshots.filter(({ date }) => date >= windowStart && date < today);
  return inWindow.reduce<LinkedBalanceSnapshot | null>(
    (oldest, snapshot) => (oldest === null || snapshot.date < oldest.date ? snapshot : oldest),
    null,
  );
}

/**
 * Ritmo = variação dos saldos vinculados desde a primeira foto de cada item na janela, por mês.
 * Item sem foto anterior a hoje soma zero: dinheiro novo não vira ritmo sem histórico.
 */
export function estimateLinkedPace(
  items: readonly LinkedPaceItem[],
  remainingCents: number,
  today: string,
): GoalPaceEstimate {
  const firsts = items.map((item) => ({ item, first: firstSnapshot(item.snapshots, today) }));
  const variationCents = firsts.reduce(
    (sum, { item, first }) => (first === null ? sum : sum + item.balanceCents - first.balanceCents),
    0,
  );
  const oldestDate = firsts.reduce<string | null>(
    (oldest, { first }) =>
      first !== null && (oldest === null || first.date < oldest) ? first.date : oldest,
    null,
  );
  const ageDays = oldestDate === null ? 0 : daysBetween(oldestDate, today);
  const windowDays = Math.min(PACE_WINDOW_DAYS, Math.max(MIN_PACE_WINDOW_DAYS, ageDays));
  const monthlyRateCents = Math.max(0, Math.floor((variationCents * DAYS_PER_MONTH) / windowDays));
  return estimateFromRate(remainingCents, { monthlyRateCents, windowDays }, today);
}
