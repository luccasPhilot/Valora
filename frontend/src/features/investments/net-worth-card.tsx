import { Landmark, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { ValueChange } from '@/components/cards/value-change';
import { ValueRow } from '@/components/cards/value-row';
import { Money } from '@/components/money';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { NetWorth } from '@/lib/api/net-worth';

import { NetWorthChart } from './net-worth-chart';
import { useNetWorth } from './net-worth-queries';
import {
  DEFAULT_NET_WORTH_PERIOD,
  describeShortHistory,
  MIN_POINTS_FOR_CHART,
  NET_WORTH_FORMULA_NOTE,
  NET_WORTH_PERIOD_OPTIONS,
  type NetWorthPeriod,
} from './net-worth-view';

function NetWorthSkeleton() {
  return (
    <div role="status" aria-label="Carregando patrimônio" className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-3 xl:col-span-5">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-52 w-full xl:col-span-7 xl:h-64" />
    </div>
  );
}

function NetWorthError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3">
      <TriangleAlert className="size-5 shrink-0 text-destructive" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">Não foi possível carregar o patrimônio.</p>
      <Button variant="outline" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

function NetWorthSummary({ netWorth }: { netWorth: NetWorth }) {
  const { current, monthChange } = netWorth;
  return (
    <div className="min-w-0 space-y-3">
      <Metric
        size="display"
        value={<Money cents={current.netWorthCents} />}
        isNegative={current.netWorthCents < 0}
      />
      {monthChange ? <ValueChange change={monthChange} /> : null}
      <ul>
        <ValueRow title="Contas" value={<Money cents={current.accountsCents} />} />
        <ValueRow title="Investimentos" value={<Money cents={current.investmentsCents} />} />
        <ValueRow
          title="Faturas em aberto"
          value={<Money cents={-current.openBillsCents} isSigned />}
        />
      </ul>
    </div>
  );
}

interface NetWorthHistoryProps {
  netWorth: NetWorth;
  period: NetWorthPeriod;
  onPeriodChange: (period: NetWorthPeriod) => void;
}

// O controle fica visível fora do padrão: sem ele, quem escolheu "6 meses" e ficou sem 2 pontos
// não teria como voltar para "12 meses".
function NetWorthHistory({ netWorth, period, onPeriodChange }: NetWorthHistoryProps) {
  const hasChart = netWorth.points.length >= MIN_POINTS_FOR_CHART;
  const isControlVisible = hasChart || period !== DEFAULT_NET_WORTH_PERIOD;
  return (
    <div className="min-w-0 space-y-3 xl:col-span-7">
      {isControlVisible ? (
        <div className="sm:max-w-xs">
          <SegmentedControl
            label="Período do gráfico"
            options={NET_WORTH_PERIOD_OPTIONS}
            value={period}
            onChange={onPeriodChange}
          />
        </div>
      ) : null}
      {hasChart ? (
        <NetWorthChart points={netWorth.points} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {describeShortHistory(netWorth.firstSnapshotDate)}
        </p>
      )}
    </div>
  );
}

function NetWorthBody({ netWorth, period, onPeriodChange }: NetWorthHistoryProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5">
          <NetWorthSummary netWorth={netWorth} />
        </div>
        <NetWorthHistory netWorth={netWorth} period={period} onPeriodChange={onPeriodChange} />
      </div>
      <p className="text-xs text-muted-foreground">{NET_WORTH_FORMULA_NOTE}</p>
    </>
  );
}

/**
 * Patrimônio no topo de Investimentos: contas + investimentos − faturas em aberto, a variação no mês
 * e a evolução mês a mês. Tem os próprios estados: se falhar, o resto da tela continua.
 */
export function NetWorthCard() {
  const [period, setPeriod] = useState<NetWorthPeriod>(DEFAULT_NET_WORTH_PERIOD);
  const netWorthQuery = useNetWorth(period);
  return (
    <DataCard title="Patrimônio" tier="hero" icon={Landmark} className="gap-5">
      {netWorthQuery.isPending ? <NetWorthSkeleton /> : null}
      {netWorthQuery.isError ? (
        <NetWorthError onRetry={() => void netWorthQuery.refetch()} />
      ) : null}
      {netWorthQuery.isSuccess ? (
        <NetWorthBody netWorth={netWorthQuery.data} period={period} onPeriodChange={setPeriod} />
      ) : null}
    </DataCard>
  );
}
