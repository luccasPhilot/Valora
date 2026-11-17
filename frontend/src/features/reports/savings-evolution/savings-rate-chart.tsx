import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltipCard } from '@/components/charts/chart-tooltip';
import { ChartContainer } from '@/components/ui/chart';
import type { SavingsMonth } from '@/lib/api/reports';
import { formatMonthYear, formatPercent } from '@/lib/format';

import {
  CHART_MARGIN,
  monthAxisProps,
  monthTitle,
  PartialMonthNote,
  SERIES_COLOR,
  ZERO_INCLUSIVE_DOMAIN,
  ZERO_LINE_STROKE,
} from '../chart-parts';

const PERCENT_SCALE = 100;
const RATE_AXIS_WIDTH_PX = 56;
const NO_RATE_TEXT = 'sem receita';
const POINT_RADIUS_PX = 2;

function toRatio(percent: number): number {
  return percent / PERCENT_SCALE;
}

function buildTooltip(partialMonth: string) {
  return function RateTooltip({ active, payload }: TooltipContentProps) {
    const point: SavingsMonth | undefined = payload[0]?.payload;
    if (!active || !point) return null;
    const rate = point.savingsRatePercent;
    return (
      <ChartTooltipCard
        title={monthTitle(point.month, partialMonth)}
        rows={[
          {
            label: 'Taxa de poupança',
            cents: 0,
            color: SERIES_COLOR,
            valueText: rate === null ? NO_RATE_TEXT : formatPercent(toRatio(rate)),
          },
        ]}
      />
    );
  };
}

function describeRates(months: readonly SavingsMonth[]): string {
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last) return 'Taxa de poupança';
  const rates = months.flatMap((item) =>
    item.savingsRatePercent === null ? [] : [item.savingsRatePercent],
  );
  const range =
    rates.length === 0
      ? 'nenhum mês com receita'
      : `de ${formatPercent(toRatio(Math.min(...rates)))} a ${formatPercent(toRatio(Math.max(...rates)))}`;
  return `Taxa de poupança mensal de ${formatMonthYear(first.month)} a ${formatMonthYear(last.month)}: ${range}.`;
}

interface SavingsRateChartProps {
  months: readonly SavingsMonth[];
  /** Mês (`AAAA-MM`) ainda em andamento, marcado em texto. */
  partialMonth: string;
  className?: string;
}

/** Taxa de poupança de cada mês, em linha. Os meses sem receita interrompem a linha. */
export function SavingsRateChart({ months, partialMonth, className }: SavingsRateChartProps) {
  return (
    <>
      <PartialMonthNote months={months} partialMonth={partialMonth} />
      <ChartContainer className={className} aria-hidden="true">
        <LineChart accessibilityLayer={false} data={[...months]} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis {...monthAxisProps(months.length)} />
          {/* Percentuais não são valores em reais: o eixo continua com "Ocultar valores". */}
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={ZERO_INCLUSIVE_DOMAIN}
            width={RATE_AXIS_WIDTH_PX}
            tickFormatter={(percent: number) => formatPercent(toRatio(percent))}
          />
          <ReferenceLine y={0} stroke={ZERO_LINE_STROKE} strokeOpacity={0.6} />
          <Tooltip content={buildTooltip(partialMonth)} />
          <Line
            type="monotone"
            dataKey="savingsRatePercent"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            // Um mês isolado entre dois sem receita não teria linha para ser visto: o ponto o mostra.
            dot={{ r: POINT_RADIUS_PX, fill: SERIES_COLOR, stroke: SERIES_COLOR }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <p className="sr-only">{describeRates(months)}</p>
    </>
  );
}
