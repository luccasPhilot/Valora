import { ChartColumn } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { IncomeExpenseBars } from '@/components/charts/income-expense-bars';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { IncomeExpenseReport } from '@/lib/api/reports';
import { todayInSaoPaulo } from '@/lib/dates';
import { formatMonthYear } from '@/lib/format';

import { IncomeExpenseFigures } from './income-expense-figures';
import { IncomeExpenseTable } from './income-expense-table';
import { focusPeriodFilter } from './reports-layout';
import { useIncomeExpenseReport } from './reports-queries';
import { type ReportView, useReportFilters } from './use-report-filters';

const CHART_HEIGHT_CLASSES = 'h-60 lg:h-72';

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function EmptyReport() {
  return (
    <EmptyState
      icon={ChartColumn}
      title="Ainda não há transações neste período"
      description="Escolha um período maior ou espere a próxima sincronização."
      action={
        <Button variant="outline" onClick={focusPeriodFilter}>
          Mudar período
        </Button>
      }
    />
  );
}

function describeReportRange(report: IncomeExpenseReport): string {
  const first = report.months[0];
  const last = report.months[report.months.length - 1];
  if (!first || !last) return 'Receitas e despesas';
  return `Receitas e despesas de ${formatMonthYear(first.month)} a ${formatMonthYear(last.month)}`;
}

interface ReportContentProps {
  report: IncomeExpenseReport;
  view: ReportView;
}

function ReportContent({ report, view }: ReportContentProps) {
  const caption = describeReportRange(report);
  const partialMonth = todayInSaoPaulo().slice(0, 7);
  return (
    <div className="space-y-4">
      <IncomeExpenseFigures totals={report.totals} />
      <DataCard title="Receitas x despesas" icon={ChartColumn}>
        {view === 'tabela' ? (
          <IncomeExpenseTable report={report} caption={caption} partialMonth={partialMonth} />
        ) : (
          <IncomeExpenseBars
            points={report.months}
            summaryCaption={caption}
            partialMonth={partialMonth}
            className={CHART_HEIGHT_CLASSES}
          />
        )}
      </DataCard>
    </div>
  );
}

/** Histórico de receitas e despesas: os três números do período e, abaixo, o gráfico ou a tabela. */
export function Component() {
  const { period, view } = useReportFilters();
  const reportQuery = useIncomeExpenseReport(period);
  if (reportQuery.isPending) return <ReportSkeleton />;
  if (reportQuery.isError) {
    return (
      <ErrorState
        message="Não foi possível carregar o relatório."
        onRetry={() => void reportQuery.refetch()}
      />
    );
  }
  if (reportQuery.data.months.length === 0) return <EmptyReport />;
  return <ReportContent report={reportQuery.data} view={view} />;
}
