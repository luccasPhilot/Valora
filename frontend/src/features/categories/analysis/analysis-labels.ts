import { HIDDEN_MONEY_TEXT } from '@/components/money';
import {
  formatCurrency,
  formatMonthLongName,
  formatMonthName,
  formatPercent,
  formatSignedPercent,
} from '@/lib/format';

const FULL_PERCENT = 100;
export const NEW_CATEGORY_LABEL = 'Novo';

export type VariationDirection = 'up' | 'down' | 'flat' | 'none';

export function variationDirection(percent: number | null): VariationDirection {
  if (percent === null) return 'none';
  if (percent > 0) return 'up';
  return percent < 0 ? 'down' : 'flat';
}

/** "+ 50%", "− 10%", "0%" ou "Novo" (a categoria não gastou nada no período de comparação). */
export function formatVariation(percent: number | null): string {
  if (percent === null) return NEW_CATEGORY_LABEL;
  return formatSignedPercent(percent / FULL_PERCENT);
}

/** "20% a mais", "10% a menos" ou "Igual"; nulo quando não há base de comparação. */
export function describeVariation(percent: number | null): string | null {
  const direction = variationDirection(percent);
  if (percent === null || direction === 'none') return null;
  if (direction === 'flat') return 'Igual';
  const share = formatPercent(Math.abs(percent) / FULL_PERCENT);
  return direction === 'up' ? `${share} a mais` : `${share} a menos`;
}

interface ComparedPeriod {
  readonly comparedThroughDay: number | null;
  readonly previousMonth: string;
}

/** "até o dia 17, contra o mesmo trecho de outubro" no mês em andamento; "contra setembro" no encerrado. */
export function describeComparedPeriod({
  comparedThroughDay,
  previousMonth,
}: ComparedPeriod): string {
  const previousName = formatMonthLongName(previousMonth);
  if (comparedThroughDay === null) return `contra ${previousName}`;
  return `até o dia ${comparedThroughDay}, contra o mesmo trecho de ${previousName}`;
}

/**
 * Resumo em texto da tendência de uma categoria para leitor de tela: um valor por mês. Com os valores
 * ocultos, os meses ficam e os valores somem, como no resto do app.
 */
export function describeTrend(
  categoryName: string,
  months: readonly string[],
  monthlyCents: readonly number[],
  areValuesHidden: boolean,
): string {
  const points = months.map((month, index) => {
    const cents = monthlyCents[index] ?? 0;
    const value = areValuesHidden ? HIDDEN_MONEY_TEXT : formatCurrency(cents);
    return `${formatMonthName(month)} ${value}`;
  });
  return `Gasto em ${categoryName} por mês: ${points.join('; ')}.`;
}
