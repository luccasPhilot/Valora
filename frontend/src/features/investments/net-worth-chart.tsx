import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltipCard } from '@/components/charts/chart-tooltip';
import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import type { NetWorthPoint } from '@/lib/api/net-worth';
import { formatCompactCurrency, formatMonth, formatMonthName } from '@/lib/format';

const SERIES_COLOR = 'var(--color-chart-1)';
const AREA_FILL_OPACITY = 0.15;
const AXIS_WIDTH_PX = 72;
const MIN_TICK_GAP_PX = 8;
const MAX_POINTS_WITHOUT_YEAR = 12;

function monthTitle(month: string): string {
  return formatMonth(`${month}-01`);
}

function NetWorthTooltip({ active, payload }: TooltipContentProps) {
  const point: NetWorthPoint | undefined = payload[0]?.payload;
  if (!active || !point) return null;
  return (
    <ChartTooltipCard
      title={monthTitle(point.month)}
      rows={[{ label: 'Patrimônio', cents: point.netWorthCents, color: SERIES_COLOR }]}
    />
  );
}

function ChartSummary({ first, last }: { first: NetWorthPoint; last: NetWorthPoint }) {
  return (
    <p className="sr-only">
      Evolução do patrimônio: <Money cents={first.netWorthCents} /> em {monthTitle(first.month)} e{' '}
      <Money cents={last.netWorthCents} /> em {monthTitle(last.month)}.
    </p>
  );
}

interface NetWorthChartProps {
  points: readonly NetWorthPoint[];
  className?: string;
}

/**
 * Patrimônio mês a mês, em área. O chamador só o desenha com 2 ou mais pontos. Com mais de 12 meses o
 * ano entra no rótulo ("nov. 25"), para separar meses repetidos.
 */
export function NetWorthChart({ points, className = 'h-52 lg:h-64' }: NetWorthChartProps) {
  const gradientId = `net-worth-fill-${useId().replace(/:/g, '')}`;
  const { areValuesHidden } = useHideValues();
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <>
      <ChartContainer className={className} aria-hidden="true">
        <AreaChart data={[...points]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={AREA_FILL_OPACITY} />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={MIN_TICK_GAP_PX}
            tickFormatter={(month: string) =>
              points.length > MAX_POINTS_WITHOUT_YEAR
                ? `${formatMonthName(month)} ${month.slice(2, 4)}`
                : formatMonthName(month)
            }
          />
          {/* Com os valores ocultos, o eixo também some: ele mostraria os mesmos números. */}
          <YAxis
            hide={areValuesHidden}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            width={AXIS_WIDTH_PX}
            tickFormatter={(cents: number) => formatCompactCurrency(cents)}
          />
          <Tooltip content={NetWorthTooltip} />
          <Area
            type="monotone"
            dataKey="netWorthCents"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      {first && last ? <ChartSummary first={first} last={last} /> : null}
    </>
  );
}
