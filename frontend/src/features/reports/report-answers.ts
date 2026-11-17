import type { IncomeExpenseMonth, SavingsMonth } from '@/lib/api/reports';

const MIN_MONTHS_TO_COMPARE = 2;

export interface MonthlyAverages {
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly monthsCount: number;
}

/**
 * Média mensal de receitas e despesas só dos meses fechados: o mês em andamento ainda não tem tudo
 * e puxaria a média para baixo. Nulo sem nenhum mês fechado.
 */
export function averageClosedMonths(
  months: readonly IncomeExpenseMonth[],
  partialMonth: string,
): MonthlyAverages | null {
  const closedMonths = months.filter((item) => item.month !== partialMonth);
  if (closedMonths.length === 0) return null;
  const incomeCents = closedMonths.reduce((sum, item) => sum + item.incomeCents, 0);
  const expenseCents = closedMonths.reduce((sum, item) => sum + item.expenseCents, 0);
  return {
    incomeCents: Math.round(incomeCents / closedMonths.length),
    expenseCents: Math.round(expenseCents / closedMonths.length),
    monthsCount: closedMonths.length,
  };
}

export interface SavingsRateComparison {
  /** `AAAA-MM` do último mês fechado com receita. */
  readonly month: string;
  readonly ratePercent: number;
  /** Média da taxa dos outros meses fechados com receita. */
  readonly previousAveragePercent: number;
}

/**
 * A taxa de poupança do último mês fechado contra a média dos anteriores. Nulo quando faltam meses
 * fechados com receita para comparar (menos de dois).
 */
export function compareLastClosedSavingsRate(
  months: readonly SavingsMonth[],
  partialMonth: string,
): SavingsRateComparison | null {
  const ratedMonths = months.flatMap((item) =>
    item.month !== partialMonth && item.savingsRatePercent !== null
      ? [{ month: item.month, ratePercent: item.savingsRatePercent }]
      : [],
  );
  const last = ratedMonths.at(-1);
  const previous = ratedMonths.slice(0, -1);
  if (!last || ratedMonths.length < MIN_MONTHS_TO_COMPARE) return null;
  const previousSum = previous.reduce((sum, item) => sum + item.ratePercent, 0);
  return { ...last, previousAveragePercent: previousSum / previous.length };
}
