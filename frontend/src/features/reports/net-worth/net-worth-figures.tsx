import { cn } from 'cn';
import { Landmark, PiggyBank, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { ValueChange } from '@/components/cards/value-change';
import { Money } from '@/components/money';
import type { NetWorth, NetWorthPoint } from '@/lib/api/net-worth';
import { formatIsoDayMonth, formatPercent } from '@/lib/format';

import { investmentsShare, periodChange } from './net-worth-report-view';

const NO_VALUE_TEXT = '—';

interface FigureProps {
  title: string;
  icon: typeof Landmark;
  children: ReactNode;
}

function Figure({ title, icon, children }: FigureProps) {
  return (
    <DataCard title={title} icon={icon} className="min-w-0 gap-2">
      {children}
    </DataCard>
  );
}

// O valor nunca quebra nem é cortado: se faltar espaço, é o rótulo que encolhe.
const VALUE_CLASSES = 'text-xl font-bold tracking-tight whitespace-nowrap tabular-nums';

function PeriodChangeFigure({ points }: { points: readonly NetWorthPoint[] }) {
  const change = periodChange(points);
  if (change === null) return <p className={VALUE_CLASSES}>{NO_VALUE_TEXT}</p>;
  return (
    <ValueChange
      change={{ cents: change.cents, percent: change.percent }}
      label={`desde ${formatIsoDayMonth(change.sinceDate)}`}
    />
  );
}

function InvestmentsFigure({ current }: { current: NetWorth['current'] }) {
  const share = investmentsShare(current);
  return (
    <>
      {/* O percentual não é valor em reais: continua visível com "Ocultar valores". */}
      <p className={VALUE_CLASSES}>{share === null ? NO_VALUE_TEXT : formatPercent(share)}</p>
      <p className="text-sm text-muted-foreground tabular-nums">
        <Money cents={current.investmentsCents} />
      </p>
    </>
  );
}

interface NetWorthFiguresProps {
  netWorth: NetWorth;
}

/** Os três números do topo: patrimônio hoje, variação no período e a parte em investimentos. */
export function NetWorthFigures({ netWorth }: NetWorthFiguresProps) {
  const { current, points } = netWorth;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Figure title="Patrimônio hoje" icon={Landmark}>
        <p className={cn(VALUE_CLASSES, current.netWorthCents < 0 && 'text-destructive')}>
          <Money cents={current.netWorthCents} />
        </p>
      </Figure>
      <Figure title="Variação no período" icon={TrendingUp}>
        <PeriodChangeFigure points={points} />
      </Figure>
      <Figure title="Em investimentos" icon={PiggyBank}>
        <InvestmentsFigure current={current} />
      </Figure>
    </div>
  );
}
