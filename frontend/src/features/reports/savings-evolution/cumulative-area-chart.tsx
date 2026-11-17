import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { niceValueAxis } from '@/components/charts/axis-scale';
import { ChartTooltipCard } from '@/components/charts/chart-tooltip';
import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import type { SavingsMonth } from '@/lib/api/reports';
import { formatAxisCurrency, formatMonthYear } from '@/lib/format';

import {
  CHART_MARGIN,
  monthAxisProps,
  monthTitle,
  PartialMonthNote,
  SERIES_COLOR,
  useValueAxisWidth,
  ZERO_LINE_STROKE,
} from '../chart-parts';

const AREA_FILL_OPACITY = 0.15;

function buildTooltip(partialMonth: string) {
  return function CumulativeTooltip({ active, payload }: TooltipContentProps) {
    const point: SavingsMonth | undefined = payload[0]?.payload;
    if (!active || !point) return null;
    return (
      <ChartTooltipCard
        title={monthTitle(point.month, partialMonth)}
        rows={[
          {
            label: 'Sobra acumulada',
            cents: point.cumulativeResultCents,
            color: SERIES_COLOR,
            isSigned: true,
          },
        ]}
      />
    );
  };
}

interface CumulativeAreaChartProps {
  months: readonly SavingsMonth[];
  /** Mês (`AAAA-MM`) ainda em andamento, marcado em texto. */
  partialMonth: string;
  className?: string;
}

/** Soma dos resultados desde o primeiro mês, em área; pode descer abaixo da linha do zero. */
export function CumulativeAreaChart({ months, partialMonth, className }: CumulativeAreaChartProps) {
  const gradientId = `cumulative-fill-${useId().replace(/:/g, '')}`;
  const { areValuesHidden } = useHideValues();
  const axisWidth = useValueAxisWidth();
  const scale = niceValueAxis(months.map((month) => month.cumulativeResultCents));
  const first = months[0];
  const last = months.at(-1);
  return (
    <>
      <PartialMonthNote months={months} partialMonth={partialMonth} />
      <ChartContainer className={className} aria-hidden="true">
        <AreaChart accessibilityLayer={false} data={[...months]} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={AREA_FILL_OPACITY} />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis {...monthAxisProps(months.length)} />
          {/* Com os valores ocultos, o eixo também some: ele mostraria os mesmos números. */}
          <YAxis
            hide={areValuesHidden}
            tickLine={false}
            axisLine={false}
            domain={scale.domain}
            ticks={scale.ticks}
            width={axisWidth}
            tickFormatter={(cents: number) => formatAxisCurrency(cents)}
          />
          <ReferenceLine y={0} stroke={ZERO_LINE_STROKE} strokeOpacity={0.6} />
          <Tooltip content={buildTooltip(partialMonth)} />
          <Area
            type="monotone"
            dataKey="cumulativeResultCents"
            baseValue={0}
            stroke={SERIES_COLOR}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      {first && last ? (
        <p className="sr-only">
          Sobra acumulada: <Money cents={first.cumulativeResultCents} isSigned /> em{' '}
          {formatMonthYear(first.month)} e <Money cents={last.cumulativeResultCents} isSigned /> em{' '}
          {formatMonthYear(last.month)}.
        </p>
      ) : null}
    </>
  );
}
