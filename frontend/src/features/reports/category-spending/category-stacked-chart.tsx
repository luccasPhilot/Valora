import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltipCard, type TooltipRow } from '@/components/charts/chart-tooltip';
import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { CategorySpendingReport } from '@/lib/api/reports';
import { formatCompactCurrency, formatMonth, formatMonthName, formatMonthYear } from '@/lib/format';

import { seriesColor } from './series-color';

const PHONE_QUERY = '(max-width: 767px)';
const MAX_BAR_WIDTH_PX = 36;
const AXIS_WIDTH_PX = 72;
const PHONE_AXIS_WIDTH_PX = 60;
const MAX_POINTS_WITH_ALL_LABELS = 12;
const PARTIAL_MONTH_LABEL = 'em andamento';
const STACK_ID = 'category-spending';

interface StackedPoint {
  /** `AAAA-MM`. */
  readonly month: string;
  readonly totalCents: number;
  /** Um valor por série, na ordem de `report.series`. */
  readonly values: readonly number[];
}

function toPoints(report: CategorySpendingReport): StackedPoint[] {
  return report.months.map((month, monthIndex) => ({
    month,
    totalCents: report.totals.monthlyCents[monthIndex] ?? 0,
    values: report.series.map((series) => series.monthlyCents[monthIndex] ?? 0),
  }));
}

function buildTooltip(report: CategorySpendingReport, partialMonth: string) {
  return function CategoryTooltip({ active, payload }: TooltipContentProps) {
    const point: StackedPoint | undefined = payload[0]?.payload;
    if (!active || !point) return null;
    const suffix = point.month === partialMonth ? ` (${PARTIAL_MONTH_LABEL})` : '';
    const categoryRows: TooltipRow[] = report.series.flatMap((series, position) => {
      const cents = point.values[position] ?? 0;
      return cents > 0 ? [{ label: series.name, cents, color: seriesColor(series, position) }] : [];
    });
    const rows = [{ label: 'Total', cents: point.totalCents }, ...categoryRows];
    return <ChartTooltipCard title={`${formatMonth(`${point.month}-01`)}${suffix}`} rows={rows} />;
  };
}

function Legend({ report }: { report: CategorySpendingReport }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {report.series.map((series, position) => (
        <li key={series.categoryId ?? series.kind} className="flex min-w-0 items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-[2px]"
            style={{ backgroundColor: seriesColor(series, position) }}
            aria-hidden="true"
          />
          <span className="max-w-40 truncate" title={series.name}>
            {series.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Os mesmos dados do gráfico em texto, só para leitor de tela: o período e o total de cada série. */
function ChartSummary({ report }: { report: CategorySpendingReport }) {
  const [first] = report.months;
  const last = report.months.at(-1);
  return (
    <p className="sr-only">
      Gasto por categoria
      {first && last ? ` de ${formatMonthYear(first)} a ${formatMonthYear(last)}` : ''}:{' '}
      {report.series.map((series) => (
        <span key={series.categoryId ?? series.kind}>
          {series.name}, <Money cents={series.totalCents} />;{' '}
        </span>
      ))}
    </p>
  );
}

interface CategoryStackedChartProps {
  report: CategorySpendingReport;
  /** Mês (`AAAA-MM`) ainda em andamento, marcado em texto abaixo da legenda e no tooltip. */
  partialMonth: string;
  className?: string;
}

/** Colunas empilhadas por mês: uma série por categoria, nos slots da paleta em ordem. */
export function CategoryStackedChart({
  report,
  partialMonth,
  className,
}: CategoryStackedChartProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { areValuesHidden } = useHideValues();
  const isLongSeries = report.months.length > MAX_POINTS_WITH_ALL_LABELS;
  const hasPartialMonth = report.months.includes(partialMonth);
  return (
    <>
      <Legend report={report} />
      {hasPartialMonth ? (
        <p className="text-xs text-muted-foreground">
          {formatMonthYear(partialMonth)} {PARTIAL_MONTH_LABEL}
        </p>
      ) : null}
      <ChartContainer className={className} aria-hidden="true">
        <BarChart data={toPoints(report)} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            interval={isLongSeries ? 'preserveStartEnd' : 0}
            tickFormatter={(month: string) =>
              isLongSeries
                ? `${formatMonthName(month)} ${month.slice(2, 4)}`
                : formatMonthName(month)
            }
          />
          {/* Com os valores ocultos, o eixo também some: ele mostraria os mesmos números. */}
          <YAxis
            hide={areValuesHidden}
            tickLine={false}
            axisLine={false}
            width={isPhone ? PHONE_AXIS_WIDTH_PX : AXIS_WIDTH_PX}
            tickFormatter={(cents: number) => formatCompactCurrency(cents)}
          />
          <Tooltip
            content={buildTooltip(report, partialMonth)}
            cursor={{ fill: 'var(--color-accent)' }}
          />
          {report.series.map((series, position) => (
            <Bar
              key={series.categoryId ?? series.kind}
              dataKey={(point: StackedPoint) => point.values[position] ?? 0}
              stackId={STACK_ID}
              fill={seriesColor(series, position)}
              // O traço na cor do cartão separa os segmentos vizinhos sem depender só da cor.
              stroke="var(--color-card)"
              maxBarSize={MAX_BAR_WIDTH_PX}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <ChartSummary report={report} />
    </>
  );
}
