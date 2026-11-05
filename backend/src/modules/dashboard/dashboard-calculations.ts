import { firstDayOfPreviousMonth } from '../../shared/dates.js';
import type { BalancePoint, CategorySpending, MonthTotals } from './dashboard.repository.js';

export const INCOME_VS_EXPENSE_MONTHS = 6;
export const MAX_LISTED_CATEGORIES = 5;
const OTHER_CATEGORIES_NAME = 'Outros';
const UNCATEGORIZED_NAME = 'Sem categoria';
const PERCENT_SCALE = 100;
const TWO_DECIMALS = 100;

export interface BalanceChange {
  readonly cents: number;
  /** Nulo quando o saldo da primeira foto é zero (não há base para a porcentagem). */
  readonly percent: number | null;
}

export type SpendingItem =
  | {
      readonly kind: 'category';
      readonly categoryId: string;
      readonly name: string;
      readonly icon: string;
      readonly amountCents: number;
      readonly percent: number;
    }
  | {
      readonly kind: 'uncategorized' | 'other';
      readonly name: string;
      readonly amountCents: number;
      readonly percent: number;
    };

/**
 * Diferença entre o saldo de hoje e o da primeira foto do mês. Sem foto de um dia anterior a hoje,
 * a variação seria sempre zero e enganosa; por isso vem nula.
 */
export function buildBalanceChange(
  currentBalanceCents: number,
  evolution: readonly BalancePoint[],
  today: string,
): BalanceChange | null {
  const [firstPoint] = evolution;
  if (!firstPoint || firstPoint.date >= today) return null;
  const cents = currentBalanceCents - firstPoint.balanceCents;
  if (firstPoint.balanceCents === 0) return { cents, percent: null };
  const ratio = (cents / Math.abs(firstPoint.balanceCents)) * PERCENT_SCALE;
  return { cents, percent: Math.round(ratio * TWO_DECIMALS) / TWO_DECIMALS };
}

/** Os `count` meses (dia 1) que terminam em `month`, do mais antigo ao mais recente. */
export function monthsEndingAt(month: string, count: number): string[] {
  const months = [month];
  while (months.length < count) {
    months.unshift(firstDayOfPreviousMonth(months[0] ?? month));
  }
  return months;
}

/** Um item por mês pedido, com zero nos meses sem transações. */
export function fillMonthTotals(
  months: readonly string[],
  found: readonly MonthTotals[],
): MonthTotals[] {
  const foundByMonth = new Map(found.map((totals) => [totals.month, totals]));
  return months.map((firstDay) => {
    const month = firstDay.slice(0, 7);
    return foundByMonth.get(month) ?? { month, incomeCents: 0, expenseCents: 0 };
  });
}

function percentOf(amountCents: number, totalCents: number): number {
  return Math.round((amountCents * PERCENT_SCALE) / totalCents);
}

function toSpendingItem(spending: CategorySpending, totalCents: number): SpendingItem {
  const amountCents = spending.spentCents;
  const percent = percentOf(amountCents, totalCents);
  if (spending.categoryId === null || spending.categoryName === null) {
    return { kind: 'uncategorized', name: UNCATEGORIZED_NAME, amountCents, percent };
  }
  return {
    kind: 'category',
    categoryId: spending.categoryId,
    name: spending.categoryName,
    icon: spending.categoryIcon ?? '',
    amountCents,
    percent,
  };
}

function compareBySpending(first: CategorySpending, second: CategorySpending): number {
  return (
    second.spentCents - first.spentCents ||
    (first.categoryName ?? UNCATEGORIZED_NAME).localeCompare(
      second.categoryName ?? UNCATEGORIZED_NAME,
      'pt-BR',
    )
  );
}

/**
 * As 5 maiores categorias e um "Outros" com o resto. "Sem categoria" disputa as 5 vagas como as
 * demais. O percentual é sobre o gasto líquido total, para as barras fecharem em 100%.
 */
export function buildSpendingBreakdown(spending: readonly CategorySpending[]): SpendingItem[] {
  const totalCents = spending.reduce((sum, item) => sum + item.spentCents, 0);
  if (totalCents === 0) return [];
  const sorted = [...spending].sort(compareBySpending);
  const items = sorted
    .slice(0, MAX_LISTED_CATEGORIES)
    .map((item) => toSpendingItem(item, totalCents));
  const others = sorted.slice(MAX_LISTED_CATEGORIES);
  if (others.length === 0) return items;
  const othersCents = others.reduce((sum, item) => sum + item.spentCents, 0);
  const otherItem: SpendingItem = {
    kind: 'other',
    name: OTHER_CATEGORIES_NAME,
    amountCents: othersCents,
    percent: percentOf(othersCents, totalCents),
  };
  return [...items, otherItem];
}
