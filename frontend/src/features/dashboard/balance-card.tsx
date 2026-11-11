import { Wallet } from 'lucide-react';
import { useId } from 'react';
import { Area, AreaChart, Tooltip, type TooltipContentProps, XAxis, YAxis } from 'recharts';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { ValueChange } from '@/components/cards/value-change';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import type { BalancePoint, Dashboard } from '@/lib/api/dashboard';
import { formatDate } from '@/lib/format';

import { ChartTooltipCard } from './chart-tooltip';
import { hasNetWorthToShow, NetWorthLine } from './net-worth-line';

const SERIES_COLOR = 'var(--color-chart-1)';
const AREA_FILL_OPACITY = 0.15;
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

/** Saldo total (corrente e poupança não ocultas), a variação no mês e a evolução em área pequena. */
export function BalanceCard({ dashboard }: { dashboard: Dashboard }) {
  const { totalBalanceCents, balanceChange, balanceEvolution, netWorth } = dashboard;
  return (
    <DataCard title="Saldo total" tier="hero" icon={Wallet} className="gap-3">
      <Metric
        size="display"
        value={<Money cents={totalBalanceCents} />}
        isNegative={totalBalanceCents < 0}
      />
      {balanceChange ? <ValueChange change={balanceChange} /> : null}
      {hasNetWorthToShow(netWorth) ? <NetWorthLine netWorth={netWorth} /> : null}
      <BalanceEvolutionChart points={balanceEvolution} />
    </DataCard>
  );
}
