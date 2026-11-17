import { ChartColumn, ChartLine, ChartSpline, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { ErrorState } from '@/components/states/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { SavingsEvolutionReport } from '@/lib/api/reports';
import { todayInSaoPaulo } from '@/lib/dates';
import { formatMonthYear, formatPercent } from '@/lib/format';

import { compareLastClosedSavingsRate } from '../report-answers';
import { ReportEmptyState } from '../report-empty-state';
import { HistoryStartNote, RefreshingReport } from '../report-notes';
import type { ReportPeriod } from '../report-period';
import { ReportViewToggle } from '../report-view-toggle';
import { useSavingsEvolutionReport } from '../reports-queries';
import { type ReportView, useReportFilters } from '../use-report-filters';
import { CumulativeAreaChart } from './cumulative-area-chart';
import { ResultBarsChart } from './result-bars-chart';
import { SavingsEvolutionTable } from './savings-evolution-table';
import { SavingsFigures } from './savings-figures';
import { SavingsRateChart } from './savings-rate-chart';

const PERCENT_SCALE = 100;
const WIDE_CHART_HEIGHT_CLASSES = 'h-60 lg:h-72';
const HALF_CHART_HEIGHT_CLASSES = 'h-52 lg:h-60';

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="space-y-4">
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function describeReportRange(report: SavingsEvolutionReport): string {
  const first = report.months[0];
  const last = report.months.at(-1);
  if (!first || !last) return 'Evolução financeira';
  return `Evolução financeira de ${formatMonthYear(first.month)} a ${formatMonthYear(last.month)}`;
}

interface ChartsProps {
  report: SavingsEvolutionReport;
  partialMonth: string;
}

function Charts({ report, partialMonth }: ChartsProps) {
  return (
    <>
      <DataCard title="Resultado do mês" icon={ChartColumn} action={<ReportViewToggle />}>
        <ResultBarsChart
          months={report.months}
          totalResultCents={report.totals.resultCents}
          partialMonth={partialMonth}
          className={WIDE_CHART_HEIGHT_CLASSES}
        />
      </DataCard>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DataCard title="Taxa de poupança por mês" icon={ChartLine}>
          <SavingsRateChart
            months={report.months}
            partialMonth={partialMonth}
            className={HALF_CHART_HEIGHT_CLASSES}
          />
          <p className="text-xs text-muted-foreground">
            Resultado ÷ receitas de cada mês. Meses sem receita ficam sem ponto.
          </p>
        </DataCard>
        <DataCard title="Sobra acumulada" icon={TrendingUp}>
          <CumulativeAreaChart
            months={report.months}
            partialMonth={partialMonth}
            className={HALF_CHART_HEIGHT_CLASSES}
          />
          <p className="text-xs text-muted-foreground">
            Soma do que sobrou ou faltou desde o primeiro mês. Não é saldo nem patrimônio.
          </p>
        </DataCard>
      </div>
    </>
  );
}

/** A taxa de poupança do último mês fechado contra a média dos anteriores; nulo sem como comparar. */
function describeSavingsRate(report: SavingsEvolutionReport, partialMonth: string): ReactNode {
  const comparison = compareLastClosedSavingsRate(report.months, partialMonth);
  if (comparison === null) return null;
  const { month, ratePercent, previousAveragePercent } = comparison;
  const previousAverage = formatPercent(previousAveragePercent / PERCENT_SCALE);
  const monthText = `${formatMonthYear(month)}, o último mês fechado`;
  if (ratePercent < 0) {
    const overspend = formatPercent(-ratePercent / PERCENT_SCALE);
    return `Em ${monthText}, você gastou ${overspend} a mais do que recebeu; nos meses anteriores a média foi ${previousAverage} da renda guardada.`;
  }
  return `Em ${monthText}, você guardou ${formatPercent(ratePercent / PERCENT_SCALE)} da renda; nos meses anteriores a média foi ${previousAverage}.`;
}

interface ReportContentProps {
  report: SavingsEvolutionReport;
  period: ReportPeriod;
  view: ReportView;
}

function ReportContent({ report, period, view }: ReportContentProps) {
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
      <SavingsFigures totals={report.totals} context={describeSavingsRate(report, partialMonth)} />
      {view === 'tabela' ? (
        <DataCard
          title="Evolução financeira por mês"
          icon={ChartSpline}
          action={<ReportViewToggle />}
        >
          <SavingsEvolutionTable
            report={report}
            caption={describeReportRange(report)}
            partialMonth={partialMonth}
          />
        </DataCard>
      ) : (
        <Charts report={report} partialMonth={partialMonth} />
      )}
    </div>
  );
}

/** Evolução financeira: o resultado do período em destaque e, abaixo, os gráficos ou a tabela. */
export function Component() {
  const { period, view } = useReportFilters();
  const reportQuery = useSavingsEvolutionReport(period);
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
