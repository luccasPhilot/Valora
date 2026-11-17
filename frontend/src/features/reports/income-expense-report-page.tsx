import { ChartColumn } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { IncomeExpenseBars } from '@/components/charts/income-expense-bars';
import { Money } from '@/components/money';
import { ErrorState } from '@/components/states/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { IncomeExpenseReport } from '@/lib/api/reports';
import { todayInSaoPaulo } from '@/lib/dates';
import { formatMonthYear } from '@/lib/format';

import { IncomeExpenseFigures } from './income-expense-figures';
import { IncomeExpenseTable } from './income-expense-table';
import { averageClosedMonths } from './report-answers';
import { ReportEmptyState } from './report-empty-state';
import { HistoryStartNote, RefreshingReport } from './report-notes';
import type { ReportPeriod } from './report-period';
import { ReportViewToggle } from './report-view-toggle';
import { useIncomeExpenseReport } from './reports-queries';
import { type ReportView, useReportFilters } from './use-report-filters';

const CHART_HEIGHT_CLASSES = 'h-60 lg:h-72';

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="space-y-4">
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

function describeReportRange(report: IncomeExpenseReport): string {
  const first = report.months[0];
  const last = report.months[report.months.length - 1];
  if (!first || !last) return 'Receitas e despesas';
  return `Receitas e despesas de ${formatMonthYear(first.month)} a ${formatMonthYear(last.month)}`;
}

/** "Nos 7 meses fechados, entram em média R$ X e saem R$ Y por mês."; nulo sem mês fechado. */
function describeMonthlyAverages(report: IncomeExpenseReport, partialMonth: string): ReactNode {
  const averages = averageClosedMonths(report.months, partialMonth);
  if (averages === null) return null;
  const monthsText =
    averages.monthsCount === 1
      ? 'No único mês fechado'
      : `Nos ${averages.monthsCount} meses fechados`;
  return (
    <>
      {monthsText}, entram em média <Money cents={averages.incomeCents} /> e saem{' '}
      <Money cents={averages.expenseCents} /> por mês.
    </>
  );
}

interface ReportContentProps {
  report: IncomeExpenseReport;
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
          firstMonth={firstMonth.month}
          monthsCount={report.months.length}
          period={period}
        />
      ) : null}
      <IncomeExpenseFigures
        totals={report.totals}
        context={describeMonthlyAverages(report, partialMonth)}
      />
      <DataCard title="Receitas x despesas" icon={ChartColumn} action={<ReportViewToggle />}>
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

/** Histórico de receitas e despesas: o resultado do período em destaque e, abaixo, o gráfico ou a tabela. */
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
  if (reportQuery.data.months.length === 0) {
    return (
      <ReportEmptyState
        icon={ChartColumn}
        title="Ainda não há transações neste período"
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
