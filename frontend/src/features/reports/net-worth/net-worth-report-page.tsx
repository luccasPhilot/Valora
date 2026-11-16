import { ChartColumnStacked, Landmark, Table2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

import { DataCard } from '@/components/cards/data-card';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { NetWorth } from '@/lib/api/net-worth';
import { todayInSaoPaulo } from '@/lib/dates';
import { formatMonthYear } from '@/lib/format';

import { NetWorthChart } from '../../investments/net-worth-chart';
import { PartialMonthNote } from '../chart-parts';
import { useNetWorthReport } from '../reports-queries';
import { type ReportView, useReportFilters } from '../use-report-filters';
import { CompositionChart } from './composition-chart';
import { NetWorthFigures } from './net-worth-figures';
import {
  describeHistoryStart,
  describeShortHistory,
  MIN_POINTS_FOR_CHARTS,
  NET_WORTH_REPORT_FORMULA_NOTE,
} from './net-worth-report-view';
import { NetWorthTable } from './net-worth-table';

const CHART_HEIGHT_CLASSES = 'h-60 lg:h-72';
const ACCOUNTS_PATH = '/contas';

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function EmptyReport() {
  return (
    <EmptyState
      icon={Landmark}
      title="O patrimônio aparece depois da primeira sincronização"
      description="O Valora guarda uma foto dos saldos a cada dia. Quando a primeira chegar, o patrimônio e a sua evolução aparecem aqui."
      action={
        <Button asChild variant="outline">
          <Link to={ACCOUNTS_PATH}>Ver contas</Link>
        </Button>
      }
    />
  );
}

function describeReportRange(netWorth: NetWorth): string {
  const first = netWorth.points[0];
  const last = netWorth.points.at(-1);
  if (!first || !last) return 'Patrimônio';
  return `Patrimônio de ${formatMonthYear(first.month)} a ${formatMonthYear(last.month)}`;
}

function TableCard({ netWorth, partialMonth }: { netWorth: NetWorth; partialMonth: string }) {
  return (
    <DataCard title="Patrimônio por mês" icon={Table2}>
      <NetWorthTable
        points={netWorth.points}
        caption={describeReportRange(netWorth)}
        partialMonth={partialMonth}
      />
    </DataCard>
  );
}

function Charts({ netWorth, partialMonth }: { netWorth: NetWorth; partialMonth: string }) {
  return (
    <>
      <DataCard title="Patrimônio ao longo do tempo" icon={TrendingUp}>
        <PartialMonthNote months={netWorth.points} partialMonth={partialMonth} />
        <NetWorthChart points={netWorth.points} className={CHART_HEIGHT_CLASSES} />
      </DataCard>
      <DataCard title="Composição do patrimônio" icon={ChartColumnStacked}>
        <CompositionChart
          points={netWorth.points}
          partialMonth={partialMonth}
          className={CHART_HEIGHT_CLASSES}
        />
      </DataCard>
    </>
  );
}

/** Com menos de 2 pontos não há curva: o texto diz desde quando há histórico e a tabela mostra o que existe. */
function ShortHistory({ netWorth, partialMonth }: { netWorth: NetWorth; partialMonth: string }) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {describeShortHistory(netWorth.firstSnapshotDate)}
      </p>
      {netWorth.points.length > 0 ? (
        <TableCard netWorth={netWorth} partialMonth={partialMonth} />
      ) : null}
    </>
  );
}

function ReportNote({ netWorth }: { netWorth: NetWorth }) {
  const historyStart = describeHistoryStart(netWorth.firstSnapshotDate);
  return (
    <p className="text-xs text-muted-foreground">
      {NET_WORTH_REPORT_FORMULA_NOTE}
      {historyStart === null ? null : ` ${historyStart}`}
    </p>
  );
}

function ReportContent({ netWorth, view }: { netWorth: NetWorth; view: ReportView }) {
  const partialMonth = todayInSaoPaulo().slice(0, 7);
  const hasCharts = netWorth.points.length >= MIN_POINTS_FOR_CHARTS;
  return (
    <div className="space-y-4">
      <NetWorthFigures netWorth={netWorth} />
      {!hasCharts ? <ShortHistory netWorth={netWorth} partialMonth={partialMonth} /> : null}
      {hasCharts && view === 'tabela' ? (
        <TableCard netWorth={netWorth} partialMonth={partialMonth} />
      ) : null}
      {hasCharts && view === 'grafico' ? (
        <Charts netWorth={netWorth} partialMonth={partialMonth} />
      ) : null}
      <ReportNote netWorth={netWorth} />
    </div>
  );
}

/** Evolução do patrimônio: três números e, abaixo, os gráficos (área e composição) ou a tabela. */
export function Component() {
  const { period, view } = useReportFilters();
  const reportQuery = useNetWorthReport(period);
  if (reportQuery.isPending) return <ReportSkeleton />;
  if (reportQuery.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar o relatório."
        onRetry={() => void reportQuery.refetch()}
      />
    );
  }
  if (reportQuery.data.firstSnapshotDate === null) return <EmptyReport />;
  return <ReportContent netWorth={reportQuery.data} view={view} />;
}
