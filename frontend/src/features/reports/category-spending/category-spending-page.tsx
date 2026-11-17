import { ArrowUpRight, ChartBarBig, ChartColumnStacked } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import { ErrorState } from '@/components/states/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategorySpendingReport } from '@/lib/api/reports';
import { todayInSaoPaulo } from '@/lib/dates';
import { formatMonthYear, formatPercent } from '@/lib/format';

import { ReportEmptyState } from '../report-empty-state';
import { ReportHero } from '../report-hero';
import { HistoryStartNote, RefreshingReport } from '../report-notes';
import type { ReportPeriod } from '../report-period';
import { ReportViewToggle } from '../report-view-toggle';
import { useCategorySpendingReport } from '../reports-queries';
import { type ReportView, useReportFilters } from '../use-report-filters';
import { CategoryRankingList } from './category-ranking-list';
import { CategorySpendingTable } from './category-spending-table';
import { CategoryStackedChart } from './category-stacked-chart';

const CHART_HEIGHT_CLASSES = 'h-60 lg:h-72';
const FULL_PERCENT = 100;

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="space-y-4">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function describeReportRange(report: CategorySpendingReport): string {
  const first = report.months[0];
  const last = report.months.at(-1);
  if (!first || !last) return 'Gasto por categoria';
  return `Gasto por categoria de ${formatMonthYear(first)} a ${formatMonthYear(last)}`;
}

/** Quem ficou com a maior fatia do gasto; nulo sem nenhuma categoria. */
function describeTopCategory(report: CategorySpendingReport): ReactNode {
  const top = report.series[0];
  if (!top) return null;
  const share = formatPercent(top.percent / FULL_PERCENT);
  if (top.kind === 'uncategorized')
    return `A maior parte do gasto, ${share}, ainda está sem categoria.`;
  return (
    <>
      {top.name} é a maior fatia: <Money cents={top.totalCents} />, {share} do gasto do período.
    </>
  );
}

interface ReportContentProps {
  report: CategorySpendingReport;
  period: ReportPeriod;
  view: ReportView;
}

function ReportContent({ report, period, view }: ReportContentProps) {
  const caption = describeReportRange(report);
  const partialMonth = todayInSaoPaulo().slice(0, 7);
  const firstMonth = report.months[0];
  return (
    <div className="space-y-4">
      {firstMonth ? (
        <HistoryStartNote
          firstMonth={firstMonth}
          monthsCount={report.months.length}
          period={period}
        />
      ) : null}
      <ReportHero
        title="Total gasto"
        icon={ArrowUpRight}
        value={<Money cents={-report.totals.totalCents} isSigned />}
        context={describeTopCategory(report)}
      />
      <DataCard
        title="Gasto por categoria e mês"
        icon={ChartColumnStacked}
        action={<ReportViewToggle />}
      >
        {view === 'tabela' ? (
          <CategorySpendingTable report={report} caption={caption} partialMonth={partialMonth} />
        ) : (
          <CategoryStackedChart
            report={report}
            partialMonth={partialMonth}
            className={CHART_HEIGHT_CLASSES}
          />
        )}
      </DataCard>
      <DataCard title="Ranking do período" icon={ChartBarBig}>
        <CategoryRankingList series={report.series} from={report.from} to={report.to} />
      </DataCard>
    </div>
  );
}

/** Gasto líquido por categoria ao longo dos meses: o total em destaque, o gráfico ou a tabela e, abaixo, o ranking. */
export function Component() {
  const { period, view } = useReportFilters();
  const reportQuery = useCategorySpendingReport(period);
  if (reportQuery.isPending) return <ReportSkeleton />;
  if (reportQuery.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar o relatório."
        onRetry={() => void reportQuery.refetch()}
      />
    );
  }
  if (reportQuery.data.series.length === 0) {
    return (
      <ReportEmptyState
        icon={ChartColumnStacked}
        title="Nenhum gasto neste período"
        period={period}
      />
    );
  }
  return (
    <RefreshingReport isRefreshing={reportQuery.isPlaceholderData}>
      <ReportContent report={reportQuery.data} period={period} view={view} />
    </RefreshingReport>
  );
}
