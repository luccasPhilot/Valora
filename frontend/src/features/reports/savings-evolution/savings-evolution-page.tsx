import { ChartColumn, ChartLine, ChartSpline, TrendingUp } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SavingsEvolutionReport } from '@/lib/api/reports';
import { todayInSaoPaulo } from '@/lib/dates';
import { formatMonthYear } from '@/lib/format';

import { focusPeriodFilter } from '../reports-layout';
import { useSavingsEvolutionReport } from '../reports-queries';
import { type ReportView, useReportFilters } from '../use-report-filters';
import { CumulativeAreaChart } from './cumulative-area-chart';
import { ResultBarsChart } from './result-bars-chart';
import { SavingsEvolutionTable } from './savings-evolution-table';
import { SavingsFigures } from './savings-figures';
import { SavingsRateChart } from './savings-rate-chart';

const WIDE_CHART_HEIGHT_CLASSES = 'h-60 lg:h-72';
const HALF_CHART_HEIGHT_CLASSES = 'h-52 lg:h-60';

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Carregando relatório" className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
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
      <DataCard title="Resultado do mês" icon={ChartColumn}>
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

function ReportContent({ report, view }: { report: SavingsEvolutionReport; view: ReportView }) {
  const partialMonth = todayInSaoPaulo().slice(0, 7);
  return (
    <div className="space-y-4">
      <SavingsFigures totals={report.totals} />
      {view === 'tabela' ? (
        <DataCard title="Evolução financeira por mês" icon={ChartSpline}>
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

/** Evolução financeira: os três números do período e, abaixo, os gráficos ou a tabela. */
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
  if (reportQuery.data.months.length === 0) return <EmptyReport />;
  return <ReportContent report={reportQuery.data} view={view} />;
}
