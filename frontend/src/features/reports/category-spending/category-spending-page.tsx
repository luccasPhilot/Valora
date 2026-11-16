import { ChartBarBig, ChartColumnStacked } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategorySpendingReport } from '@/lib/api/reports';
import { todayInSaoPaulo } from '@/lib/dates';
import { formatMonthYear } from '@/lib/format';

import { focusPeriodFilter } from '../reports-layout';
import { useCategorySpendingReport } from '../reports-queries';
import { type ReportView, useReportFilters } from '../use-report-filters';
import { CategoryRankingList } from './category-ranking-list';
import { CategorySpendingTable } from './category-spending-table';
import { CategoryStackedChart } from './category-stacked-chart';

const CHART_HEIGHT_CLASSES = 'h-60 lg:h-72';

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="space-y-4">
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function EmptyReport() {
  return (
    <EmptyState
      icon={ChartColumnStacked}
      title="Nenhum gasto neste período"
      description="Escolha um período maior ou espere a próxima sincronização."
      action={
        <Button variant="outline" onClick={focusPeriodFilter}>
          Mudar período
        </Button>
      }
    />
  );
}

function describeReportRange(report: CategorySpendingReport): string {
  const first = report.months[0];
  const last = report.months.at(-1);
  if (!first || !last) return 'Gasto por categoria';
  return `Gasto por categoria de ${formatMonthYear(first)} a ${formatMonthYear(last)}`;
}

function ReportContent({ report, view }: { report: CategorySpendingReport; view: ReportView }) {
  const caption = describeReportRange(report);
  const partialMonth = todayInSaoPaulo().slice(0, 7);
  return (
    <div className="space-y-4">
      <DataCard title="Gasto por categoria e mês" icon={ChartColumnStacked}>
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
      <DataCard
        title="Ranking do período"
        icon={ChartBarBig}
        action={
          <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
            <Money cents={report.totals.totalCents} />
          </span>
        }
      >
        <CategoryRankingList series={report.series} />
      </DataCard>
    </div>
  );
}

/** Gasto líquido por categoria ao longo dos meses: o gráfico ou a tabela e, abaixo, o ranking. */
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
  if (reportQuery.data.series.length === 0) return <EmptyReport />;
  return <ReportContent report={reportQuery.data} view={view} />;
}
