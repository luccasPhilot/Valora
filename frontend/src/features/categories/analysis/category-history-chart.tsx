import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { niceValueAxis } from '@/components/charts/axis-scale';
import { ChartTooltipCard } from '@/components/charts/chart-tooltip';
import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatAxisCurrency, formatMonth, formatMonthName } from '@/lib/format';

const PHONE_QUERY = '(max-width: 767px)';
const AXIS_WIDTH_PX = 72;
const PHONE_AXIS_WIDTH_PX = 68;
const MAX_BAR_WIDTH_PX = 40;
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const HATCH_SIZE_PX = 6;
const HATCH_STROKE_PX = 2;
const EARLIER_MONTHS_OPACITY = 0.35;
const SERIES_COLOR = 'var(--color-chart-1)';
const HATCH_ID = 'category-history-hatch';
const PARTIAL_MONTH_LABEL = 'em andamento';

interface HistoryPoint {
  /** `AAAA-MM`. */
  readonly month: string;
  readonly cents: number;
}

function tooltipFor(partialMonth: string | null) {
  return function HistoryTooltip({ active, payload }: TooltipContentProps) {
    const point: HistoryPoint | undefined = payload[0]?.payload;
    if (!active || !point) return null;
    const suffix = point.month === partialMonth ? ` (${PARTIAL_MONTH_LABEL})` : '';
    return (
      <ChartTooltipCard
        title={`${formatMonth(`${point.month}-01`)}${suffix}`}
        rows={[{ label: 'Gasto', cents: point.cents, color: SERIES_COLOR }]}
      />
    );
  };
}

/** Traços diagonais por cima da cor da série: marca o mês parcial sem trocar a cor. */
function HatchPattern() {
  return (
    <defs>
      <pattern
        id={HATCH_ID}
        width={HATCH_SIZE_PX}
        height={HATCH_SIZE_PX}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width={HATCH_SIZE_PX} height={HATCH_SIZE_PX} fill={SERIES_COLOR} fillOpacity={0.35} />
        <rect width={HATCH_STROKE_PX} height={HATCH_SIZE_PX} fill={SERIES_COLOR} />
      </pattern>
    </defs>
  );
}

/** Os mesmos meses do gráfico em tabela, só para leitor de tela (o `sr-only` fica na `div`). */
function HistoryTable({
  points,
  caption,
  partialMonth,
}: {
  points: readonly HistoryPoint[];
  caption: string;
  partialMonth: string | null;
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Gasto</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">
                {formatMonth(`${point.month}-01`)}
                {point.month === partialMonth ? ` (${PARTIAL_MONTH_LABEL})` : ''}
              </th>
              <td>
                <Money cents={point.cents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CategoryHistoryChartProps {
  categoryName: string;
  /** `AAAA-MM`; o último é o mês analisado, em cor cheia. Os anteriores ficam a 35%. */
  months: readonly string[];
  monthlyCents: readonly number[];
  /** Mês ainda em andamento (`AAAA-MM`), marcado com hachura e texto; nulo se o mês já acabou. */
  partialMonth: string | null;
  className?: string;
}

/** Colunas dos últimos meses de uma categoria: uma série só (slot 1), o mês analisado em destaque. */
export function CategoryHistoryChart({
  categoryName,
  months,
  monthlyCents,
  partialMonth,
  className = 'h-48 lg:h-56',
}: CategoryHistoryChartProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { areValuesHidden } = useHideValues();
  const points: HistoryPoint[] = months.map((month, index) => ({
    month,
    cents: monthlyCents[index] ?? 0,
  }));
  const selectedMonth = months.at(-1);
  const scale = niceValueAxis(points.map((point) => point.cents));
  return (
    <>
      {partialMonth ? (
        <p className="text-xs text-muted-foreground">
          {formatMonthName(partialMonth)} {PARTIAL_MONTH_LABEL} (barra com traços)
        </p>
      ) : null}
      <ChartContainer className={className} aria-hidden="true">
        <BarChart
          accessibilityLayer={false}
          data={points}
          margin={{ top: 16, right: 12, bottom: 0, left: 0 }}
        >
          <HatchPattern />
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={(month: string) => formatMonthName(month)}
          />
          {/* Com os valores ocultos, o eixo também some: ele mostraria os mesmos números. */}
          <YAxis
            hide={areValuesHidden}
            tickLine={false}
            axisLine={false}
            width={isPhone ? PHONE_AXIS_WIDTH_PX : AXIS_WIDTH_PX}
            domain={scale.domain}
            ticks={scale.ticks}
            tickFormatter={(cents: number) => formatAxisCurrency(cents)}
          />
          <Tooltip content={tooltipFor(partialMonth)} cursor={{ fill: 'var(--color-accent)' }} />
          <Bar
            dataKey="cents"
            radius={BAR_RADIUS}
            maxBarSize={MAX_BAR_WIDTH_PX}
            isAnimationActive={false}
          >
            {points.map((point) => (
              <Cell
                key={point.month}
                fill={point.month === partialMonth ? `url(#${HATCH_ID})` : SERIES_COLOR}
                fillOpacity={point.month === selectedMonth ? 1 : EARLIER_MONTHS_OPACITY}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <HistoryTable
        points={points}
        caption={`Gasto em ${categoryName} por mês`}
        partialMonth={partialMonth}
      />
    </>
  );
}
