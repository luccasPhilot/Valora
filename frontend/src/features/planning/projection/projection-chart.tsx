import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { DailyBalance, Projection } from '@/lib/api/projection';
import { formatCompactCurrency, formatDate, formatIsoDayMonth } from '@/lib/format';

import { ChartTooltipCard } from '../../dashboard/chart-tooltip';
import { projectionEndDate } from './projection-labels';

const PHONE_QUERY = '(max-width: 767px)';
const AXIS_WIDTH_PX = 96;
const PHONE_AXIS_WIDTH_PX = 92;
const MIN_TICK_GAP_PX = 28;
const LOWEST_DOT_RADIUS_PX = 5;
const ZERO_LINE_DASH = '4 4';

// Design System, "Paleta de gráficos": uma série só usa o slot 1.
const SERIES_COLOR = 'var(--color-chart-1)';

function BalanceTooltip({ active, payload }: TooltipContentProps) {
  const point: DailyBalance | undefined = payload[0]?.payload;
  if (!active || !point) return null;
  return (
    <ChartTooltipCard
      title={formatDate(point.date)}
      rows={[{ label: 'Saldo', cents: point.balanceCents, color: SERIES_COLOR }]}
    />
  );
}

function ChartSummary({ projection }: { projection: Projection }) {
  return (
    <p className="sr-only">
      Saldo de <Money cents={projection.startBalanceCents} /> hoje e{' '}
      <Money cents={projection.projectedBalanceCents} /> em{' '}
      {formatDate(projectionEndDate(projection))}. Menor saldo:{' '}
      <Money cents={projection.lowestBalanceCents} /> em {formatDate(projection.lowestBalanceDate)}.
    </p>
  );
}

/**
 * Saldo dia a dia até o fim do mês. Em degraus, porque o saldo só muda no dia de cada lançamento.
 * O ponto mais baixo vem marcado; o eixo inclui esse ponto mesmo quando ele cai no meio do dia.
 */
export function ProjectionChart({ projection }: { projection: Projection }) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { areValuesHidden } = useHideValues();
  const { lowestBalanceCents, lowestBalanceDate } = projection;
  return (
    <>
      <ChartContainer className="h-52 lg:h-64" aria-hidden="true">
        <LineChart data={[...projection.daily]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={MIN_TICK_GAP_PX}
            tickFormatter={(date: string) => formatIsoDayMonth(date)}
          />
          {/* Com os valores ocultos, o eixo também some: ele mostraria os mesmos números. */}
          <YAxis
            hide={areValuesHidden}
            tickLine={false}
            axisLine={false}
            width={isPhone ? PHONE_AXIS_WIDTH_PX : AXIS_WIDTH_PX}
            domain={[(dataMin: number) => Math.min(dataMin, lowestBalanceCents), 'dataMax']}
            tickFormatter={(cents: number) => formatCompactCurrency(cents)}
          />
          {lowestBalanceCents < 0 ? (
            <ReferenceLine
              y={0}
              stroke="var(--color-muted-foreground)"
              strokeDasharray={ZERO_LINE_DASH}
            />
          ) : null}
          <Tooltip content={BalanceTooltip} />
          <Line
            type="stepAfter"
            dataKey="balanceCents"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={lowestBalanceDate}
            y={lowestBalanceCents}
            r={LOWEST_DOT_RADIUS_PX}
            fill="var(--color-card)"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            ifOverflow="extendDomain"
          />
        </LineChart>
      </ChartContainer>
      <ChartSummary projection={projection} />
    </>
  );
}
