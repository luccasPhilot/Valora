import type { ComponentProps } from 'react';
import type { XAxis } from 'recharts';

import { useMediaQuery } from '@/hooks/use-media-query';
import { formatMonth, formatMonthName, formatMonthYear } from '@/lib/format';

// Design System, "Paleta de gráficos": uma série só, então sempre o slot 1.
export const SERIES_COLOR = 'var(--color-chart-1)';
export const ZERO_LINE_STROKE = 'var(--color-muted-foreground)';
export const PARTIAL_MONTH_LABEL = 'em andamento';

const PHONE_QUERY = '(max-width: 767px)';
const AXIS_WIDTH_PX = 72;
const PHONE_AXIS_WIDTH_PX = 60;
const MAX_POINTS_WITH_ALL_LABELS = 12;

// Folga no topo: o rótulo mais alto do eixo é centrado na linha de grade e não pode ser cortado.
export const CHART_MARGIN = { top: 16, right: 4, bottom: 0, left: 0 } as const;

/** O eixo sempre inclui o zero: é a linha que separa o que sobrou do que faltou. */
export const ZERO_INCLUSIVE_DOMAIN: [(min: number) => number, (max: number) => number] = [
  (min) => Math.min(min, 0),
  (max) => Math.max(max, 0),
];

/** Largura do eixo vertical: mais estreita no celular, onde os rótulos quebram em duas linhas. */
export function useValueAxisWidth(): number {
  return useMediaQuery(PHONE_QUERY) ? PHONE_AXIS_WIDTH_PX : AXIS_WIDTH_PX;
}

/** "nov. 2026", com "(em andamento)" no mês parcial. */
export function monthTitle(month: string, partialMonth: string): string {
  const title = formatMonth(`${month}-01`);
  return month === partialMonth ? `${title} (${PARTIAL_MONTH_LABEL})` : title;
}

/**
 * Eixo X abreviado. Com mais de 12 meses o Recharts esconde os rótulos que se sobrepõem, e o ano
 * entra no rótulo ("nov. 25") para separar meses repetidos.
 */
export function monthAxisProps(monthsCount: number): ComponentProps<typeof XAxis> {
  const isLongSeries = monthsCount > MAX_POINTS_WITH_ALL_LABELS;
  return {
    dataKey: 'month',
    tickLine: false,
    axisLine: false,
    interval: isLongSeries ? 'preserveStartEnd' : 0,
    tickFormatter: (month: string) =>
      isLongSeries ? `${formatMonthName(month)} ${month.slice(2, 4)}` : formatMonthName(month),
  };
}

interface PartialMonthNoteProps {
  months: readonly { readonly month: string }[];
  partialMonth: string;
}

/** O mês em andamento marcado em texto, nunca só pela forma ou pela cor. */
export function PartialMonthNote({ months, partialMonth }: PartialMonthNoteProps) {
  if (!months.some((item) => item.month === partialMonth)) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {formatMonthYear(partialMonth)} {PARTIAL_MONTH_LABEL}
    </p>
  );
}
