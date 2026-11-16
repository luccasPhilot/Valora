import type { CategorySeries } from '@/lib/api/reports';

const OTHER_COLOR = 'var(--color-chart-other)';

/**
 * Design System, "Paleta de gráficos": a série da posição N usa o slot N, sem pular; "Outros" usa o
 * cinza. A cor é a do ranking do período, então uma categoria pode mudar de cor entre períodos: a
 * legenda e a lista sempre dizem o nome.
 */
export function seriesColor(series: CategorySeries, position: number): string {
  if (series.kind === 'other') return OTHER_COLOR;
  return `var(--color-chart-${position + 1})`;
}
