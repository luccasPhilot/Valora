import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { niceValueAxis } from '@/components/charts/axis-scale';
import { ChartTooltipCard, type TooltipRow } from '@/components/charts/chart-tooltip';
import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import type { SavingsMonth } from '@/lib/api/reports';
import { formatAxisCurrency, formatMonthYear, formatPercent } from '@/lib/format';

import {
  CHART_MARGIN,
  monthAxisProps,
  monthTitle,
  PartialMonthNote,
  SERIES_COLOR,
  useValueAxisWidth,
  ZERO_LINE_STROKE,
} from '../chart-parts';

const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const MAX_BAR_WIDTH_PX = 28;
const PERCENT_SCALE = 100;
const NO_RATE_TEXT = '—';

function buildTooltip(partialMonth: string) {
  return function ResultTooltip({ active, payload }: TooltipContentProps) {
    const point: SavingsMonth | undefined = payload[0]?.payload;
    if (!active || !point) return null;
    const rate = point.savingsRatePercent;
    const rows: TooltipRow[] = [
      { label: 'Receitas', cents: point.incomeCents },
      { label: 'Despesas', cents: point.expenseCents },
      { label: 'Resultado', cents: point.resultCents, color: SERIES_COLOR, isSigned: true },
      {
        label: 'Taxa de poupança',
        cents: 0,
        valueText: rate === null ? NO_RATE_TEXT : formatPercent(rate / PERCENT_SCALE),
      },
    ];
    return <ChartTooltipCard title={monthTitle(point.month, partialMonth)} rows={rows} />;
  };
}

interface ResultBarsChartProps {
  months: readonly SavingsMonth[];
  totalResultCents: number;
  /** Mês (`AAAA-MM`) ainda em andamento, marcado em texto. */
  partialMonth: string;
  className?: string;
}

/** Resultado de cada mês em barras de uma série só; os meses negativos descem da linha do zero. */
export function ResultBarsChart({
  months,
  totalResultCents,
  partialMonth,
  className,
}: ResultBarsChartProps) {
  const { areValuesHidden } = useHideValues();
  const axisWidth = useValueAxisWidth();
  const scale = niceValueAxis(months.map((month) => month.resultCents));
  const first = months[0];
  const last = months.at(-1);
  return (
    <>
      <PartialMonthNote months={months} partialMonth={partialMonth} />
      <ChartContainer className={className} aria-hidden="true">
        <BarChart accessibilityLayer={false} data={[...months]} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis {...monthAxisProps(months.length)} />
          {/* Com os valores ocultos, o eixo também some: ele mostraria os mesmos números. */}
          <YAxis
            hide={areValuesHidden}
            tickLine={false}
            axisLine={false}
            width={axisWidth}
            domain={scale.domain}
            ticks={scale.ticks}
            tickFormatter={(cents: number) => formatAxisCurrency(cents)}
          />
          <ReferenceLine y={0} stroke={ZERO_LINE_STROKE} strokeOpacity={0.6} />
          <Tooltip content={buildTooltip(partialMonth)} cursor={{ fill: 'var(--color-accent)' }} />
          <Bar
            dataKey="resultCents"
            fill={SERIES_COLOR}
            radius={BAR_RADIUS}
            maxBarSize={MAX_BAR_WIDTH_PX}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      {first && last ? (
        <p className="sr-only">
          Resultado de cada mês, de {formatMonthYear(first.month)} a {formatMonthYear(last.month)}:
          total de <Money cents={totalResultCents} isSigned />.
        </p>
      ) : null}
    </>
  );
}
