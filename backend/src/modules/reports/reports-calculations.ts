import type { MonthRange } from '../../shared/month-range.js';
import { fillMonthTotals, monthsBetween, type MonthTotals } from '../../shared/months.js';

export interface IncomeExpenseMonth extends MonthTotals {
  /** Receitas menos despesas; negativo quando as despesas passam das receitas. */
  readonly resultCents: number;
}

export interface IncomeExpenseTotals {
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly resultCents: number;
}

export interface IncomeExpenseReport {
  readonly months: readonly IncomeExpenseMonth[];
  readonly totals: IncomeExpenseTotals;
}

function toMonthWithResult(totals: MonthTotals): IncomeExpenseMonth {
  return { ...totals, resultCents: totals.incomeCents - totals.expenseCents };
}

/**
 * Os meses (dia 1) do relatório, do mais antigo ao mais recente. A lista começa na primeira
 * transação guardada quando ela é posterior ao início do período, para um período longo não vir com
 * meses vazios de antes de o app existir. `firstTransactionDay` é o dia (`AAAA-MM-DD`) da transação
 * mais antiga; sem nenhuma transação não há meses.
 */
export function listReportMonths(range: MonthRange, firstTransactionDay: string | null): string[] {
  if (firstTransactionDay === null) return [];
  const firstMonth = `${firstTransactionDay.slice(0, 7)}-01`;
  const start = firstMonth > range.from ? firstMonth : range.from;
  return start > range.to ? [] : monthsBetween(start, range.to);
}

/** Um item por mês do período, com zero nos meses sem movimento. */
export function buildIncomeExpenseReport(
  found: readonly MonthTotals[],
  range: MonthRange,
  firstTransactionDay: string | null,
): IncomeExpenseReport {
  const months = fillMonthTotals(listReportMonths(range, firstTransactionDay), found).map(
    toMonthWithResult,
  );
  return { months, totals: sumMonths(months) };
}

function sumMonths(months: readonly IncomeExpenseMonth[]): IncomeExpenseTotals {
  const incomeCents = months.reduce((sum, month) => sum + month.incomeCents, 0);
  const expenseCents = months.reduce((sum, month) => sum + month.expenseCents, 0);
  return { incomeCents, expenseCents, resultCents: incomeCents - expenseCents };
}
