import type { MonthTotals } from '../../shared/months.js';

const RATE_SCALE = 1000;
const RATE_DECIMALS_DIVISOR = 10;

export interface SavingsMonth extends MonthTotals {
  /** Receitas menos despesas; negativo quando as despesas passam das receitas. */
  readonly resultCents: number;
  /** Resultado ÷ receitas, em %, com uma casa decimal; nulo quando o mês não tem receita. */
  readonly savingsRatePercent: number | null;
  /** Soma dos resultados do primeiro mês da lista até este mês. Não é saldo nem patrimônio. */
  readonly cumulativeResultCents: number;
}

export interface SavingsTotals {
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly resultCents: number;
  /** Soma dos resultados ÷ soma das receitas (não a média das taxas mensais); nulo sem receita. */
  readonly savingsRatePercent: number | null;
  /** Meses fechados com resultado maior que zero. */
  readonly surplusMonths: number;
  /** Meses anteriores ao mês atual; o mês em andamento fica de fora. */
  readonly closedMonths: number;
}

export interface SavingsReport {
  readonly months: readonly SavingsMonth[];
  readonly totals: SavingsTotals;
}

function savingsRateOf(resultCents: number, incomeCents: number): number | null {
  if (incomeCents === 0) return null;
  return Math.round((resultCents * RATE_SCALE) / incomeCents) / RATE_DECIMALS_DIVISOR;
}

function withResults(months: readonly MonthTotals[]): SavingsMonth[] {
  let cumulativeResultCents = 0;
  return months.map((totals) => {
    const resultCents = totals.incomeCents - totals.expenseCents;
    cumulativeResultCents += resultCents;
    return {
      ...totals,
      resultCents,
      savingsRatePercent: savingsRateOf(resultCents, totals.incomeCents),
      cumulativeResultCents,
    };
  });
}

function sumTotals(months: readonly SavingsMonth[], currentMonth: string): SavingsTotals {
  const incomeCents = months.reduce((sum, month) => sum + month.incomeCents, 0);
  const expenseCents = months.reduce((sum, month) => sum + month.expenseCents, 0);
  const resultCents = incomeCents - expenseCents;
  const closedMonths = months.filter((month) => month.month < currentMonth);
  return {
    incomeCents,
    expenseCents,
    resultCents,
    savingsRatePercent: savingsRateOf(resultCents, incomeCents),
    surplusMonths: closedMonths.filter((month) => month.resultCents > 0).length,
    closedMonths: closedMonths.length,
  };
}

/**
 * Evolução financeira sobre os totais mensais (os mesmos do Início e do histórico de receitas e
 * despesas). `today` é o dia (`AAAA-MM-DD`) de hoje em São Paulo: o mês dele ainda não fechou e não
 * entra na contagem de meses com sobra.
 */
export function buildSavingsReport(months: readonly MonthTotals[], today: string): SavingsReport {
  const savingsMonths = withResults(months);
  return { months: savingsMonths, totals: sumTotals(savingsMonths, today.slice(0, 7)) };
}
