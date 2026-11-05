import { cn } from 'cn';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useId } from 'react';
import { Area, AreaChart, Tooltip, type TooltipContentProps, XAxis, YAxis } from 'recharts';

import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import type { BalancePoint, Dashboard } from '@/lib/api/dashboard';
import { formatDate, formatPercent } from '@/lib/format';

import { ChartTooltipCard } from './chart-tooltip';

const SERIES_COLOR = 'var(--color-chart-1)';
const AREA_FILL_OPACITY = 0.15;
const PERCENT_TO_RATIO = 100;
const MIN_POINTS_FOR_CHART = 2;

function BalanceTooltip({ active, payload }: TooltipContentProps) {
  const point: BalancePoint | undefined = payload[0]?.payload;
  if (!active || !point) return null;
  return (
    <ChartTooltipCard
      title={formatDate(point.date)}
      rows={[{ label: 'Saldo', cents: point.balanceCents, color: SERIES_COLOR }]}
    />
  );
}

/** Evolução do saldo no mês, só com os dias que têm foto de saldo. Precisa de 2 pontos para desenhar. */
function BalanceEvolutionChart({ points }: { points: readonly BalancePoint[] }) {
  const gradientId = `balance-fill-${useId().replace(/:/g, '')}`;
  if (points.length < MIN_POINTS_FOR_CHART) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <>
      <ChartContainer className="h-24 lg:h-28" aria-hidden="true">
        <AreaChart data={[...points]} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={AREA_FILL_OPACITY} />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip content={BalanceTooltip} />
          <Area
            type="monotone"
            dataKey="balanceCents"
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
          Evolução do saldo: <Money cents={first.balanceCents} /> em {formatDate(first.date)} e{' '}
          <Money cents={last.balanceCents} /> em {formatDate(last.date)}.
        </p>
      ) : null}
    </>
  );
}

function signedPercent(percent: number): string {
  const text = formatPercent(percent / PERCENT_TO_RATIO);
  return percent > 0 ? `+${text}` : text;
}

function BalanceChange({ change }: { change: NonNullable<Dashboard['balanceChange']> }) {
  const Icon = change.cents < 0 ? TrendingDown : TrendingUp;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
      <Icon
        className={cn('size-4', change.cents > 0 ? 'text-positive' : 'text-muted-foreground')}
        aria-hidden="true"
      />
      <span className={cn('tabular-nums', change.cents > 0 && 'text-positive')}>
        <Money cents={change.cents} isSigned />
        {change.percent === null ? null : ` (${signedPercent(change.percent)})`}
      </span>
      <span className="text-muted-foreground">no mês</span>
    </p>
  );
}

/** Saldo total (corrente e poupança não ocultas), a variação no mês e a evolução em área pequena. */
export function BalanceCard({ dashboard }: { dashboard: Dashboard }) {
  const titleId = useId();
  const { totalBalanceCents, balanceChange, balanceEvolution } = dashboard;
  return (
    <section
      aria-labelledby={titleId}
      className="flex h-full flex-col gap-3 rounded-xl bg-secondary p-5"
    >
      <h2 id={titleId} className="type-label flex items-center gap-2">
        <Wallet className="size-4 text-primary" aria-hidden="true" />
        Saldo total
      </h2>
      <p className={cn('type-display tabular-nums', totalBalanceCents < 0 && 'text-destructive')}>
        <Money cents={totalBalanceCents} />
      </p>
      {balanceChange ? <BalanceChange change={balanceChange} /> : null}
      <BalanceEvolutionChart points={balanceEvolution} />
    </section>
  );
}
