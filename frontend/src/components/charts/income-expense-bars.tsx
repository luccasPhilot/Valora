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

import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatAxisCurrency, formatMonth, formatMonthName } from '@/lib/format';

import { niceValueAxis } from './axis-scale';
import { ChartTooltipCard, type TooltipRow } from './chart-tooltip';

const PHONE_QUERY = '(max-width: 767px)';
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const BAR_GAP_PX = 2;
const MAX_BAR_WIDTH_PX = 28;
const AXIS_WIDTH_PX = 72;
const PHONE_AXIS_WIDTH_PX = 68;
const HATCH_SIZE_PX = 6;
const HATCH_STROKE_PX = 2;
const PARTIAL_MONTH_LABEL = 'em andamento';
const MAX_POINTS_WITH_ALL_LABELS = 12;

export interface IncomeExpensePoint {
  /** `AAAA-MM`. */
  readonly month: string;
  readonly incomeCents: number;
  readonly expenseCents: number;
  /** Quando existe, o tooltip mostra também o resultado do mês. */
  readonly resultCents?: number;
}

// Design System, "Paleta de gráficos": receitas no slot 1 e despesas no slot 2, sempre nessa ordem.
const INCOME_SERIES = {
  key: 'incomeCents',
  label: 'Receitas',
  color: 'var(--color-chart-1)',
  hatchId: 'income-expense-hatch-income',
} as const;
const EXPENSE_SERIES = {
  key: 'expenseCents',
  label: 'Despesas',
  color: 'var(--color-chart-2)',
  hatchId: 'income-expense-hatch-expense',
} as const;
const SERIES = [INCOME_SERIES, EXPENSE_SERIES] as const;

function monthTitle(month: string): string {
  return formatMonth(`${month}-01`);
}

function buildTooltip(partialMonth: string | undefined) {
  return function IncomeExpenseTooltip({ active, payload }: TooltipContentProps) {
    const point: IncomeExpensePoint | undefined = payload[0]?.payload;
    if (!active || !point) return null;
    const suffix = point.month === partialMonth ? ` (${PARTIAL_MONTH_LABEL})` : '';
    const rows: TooltipRow[] = [
      { label: INCOME_SERIES.label, cents: point.incomeCents, color: INCOME_SERIES.color },
      { label: EXPENSE_SERIES.label, cents: point.expenseCents, color: EXPENSE_SERIES.color },
    ];
    if (point.resultCents !== undefined) {
      rows.push({ label: 'Resultado', cents: point.resultCents, isSigned: true });
    }
    return <ChartTooltipCard title={`${monthTitle(point.month)}${suffix}`} rows={rows} />;
  };
}

function Legend({ hasPartialMonth }: { hasPartialMonth: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {SERIES.map((series) => (
        <li key={series.key} className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-[2px]"
            style={{ backgroundColor: series.color }}
            aria-hidden="true"
          />
          {series.label}
        </li>
      ))}
      {hasPartialMonth ? (
        <li className="flex items-center gap-2 text-muted-foreground">
          <span
            className="size-3 shrink-0 rounded-[2px] border border-muted-foreground"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, var(--color-muted-foreground) 0 1px, transparent 1px 4px)',
            }}
            aria-hidden="true"
          />
          Mês {PARTIAL_MONTH_LABEL}
        </li>
      ) : null}
    </ul>
  );
}

/** Traços diagonais por cima da cor da série: marca o mês parcial sem trocar a cor. */
function HatchPatterns() {
  return (
    <defs>
      {SERIES.map((series) => (
        <pattern
          key={series.hatchId}
          id={series.hatchId}
          width={HATCH_SIZE_PX}
          height={HATCH_SIZE_PX}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect
            width={HATCH_SIZE_PX}
            height={HATCH_SIZE_PX}
            fill={series.color}
            fillOpacity={0.35}
          />
          <rect width={HATCH_STROKE_PX} height={HATCH_SIZE_PX} fill={series.color} />
        </pattern>
      ))}
    </defs>
  );
}

/**
 * O mesmo dado do gráfico em tabela, só para leitor de tela. O `sr-only` fica na `div`: a `table`
 * ignora `overflow: hidden` e, solta, alargaria a página.
 */
function ChartSummary({
  points,
  caption,
  partialMonth,
}: {
  points: readonly IncomeExpensePoint[];
  caption: string;
  partialMonth: string | undefined;
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Receitas</th>
            <th scope="col">Despesas</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">
                {monthTitle(point.month)}
                {point.month === partialMonth ? ` (${PARTIAL_MONTH_LABEL})` : ''}
              </th>
              <td>
                <Money cents={point.incomeCents} />
              </td>
              <td>
                <Money cents={point.expenseCents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface IncomeExpenseBarsProps {
  points: readonly IncomeExpensePoint[];
  /** Resumo para leitor de tela, como "Receitas e despesas dos últimos 6 meses". */
  summaryCaption: string;
  /** Mês (`AAAA-MM`) ainda em andamento: marcado com hachura, e com texto na legenda e no tooltip. */
  partialMonth?: string;
  className?: string;
}

/** Barras agrupadas por mês: receitas (série 1) e despesas (série 2). */
export function IncomeExpenseBars({
  points,
  summaryCaption,
  partialMonth,
  className = 'h-52 lg:h-64',
}: IncomeExpenseBarsProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { areValuesHidden } = useHideValues();
  const hasPartialMonth = points.some((point) => point.month === partialMonth);
  const isLongSeries = points.length > MAX_POINTS_WITH_ALL_LABELS;
  const scale = niceValueAxis(points.flatMap((point) => [point.incomeCents, point.expenseCents]));
  return (
    <>
      <Legend hasPartialMonth={hasPartialMonth} />
      <ChartContainer className={className} aria-hidden="true">
        <BarChart
          accessibilityLayer={false}
          data={[...points]}
          barGap={BAR_GAP_PX}
          // Folga no topo: o rótulo mais alto do eixo é centrado na linha de grade e, quebrado em duas
          // linhas no celular ("R$ 28" / "mil"), passa do desenho e era cortado.
          margin={{ top: 16, right: 12, bottom: 0, left: 0 }}
        >
          <HatchPatterns />
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            // Períodos longos não cabem com todos os meses no celular: o Recharts esconde os que se
            // sobrepõem, e o ano no rótulo separa os meses repetidos ("nov. 25" e "nov. 26").
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
            domain={scale.domain}
            ticks={scale.ticks}
            tickFormatter={(cents: number) => formatAxisCurrency(cents)}
          />
          <Tooltip content={buildTooltip(partialMonth)} cursor={{ fill: 'var(--color-accent)' }} />
          {SERIES.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              fill={series.color}
              radius={BAR_RADIUS}
              maxBarSize={MAX_BAR_WIDTH_PX}
              isAnimationActive={false}
            >
              {points.map((point) => (
                <Cell
                  key={point.month}
                  fill={point.month === partialMonth ? `url(#${series.hatchId})` : series.color}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
      <ChartSummary points={points} caption={summaryCaption} partialMonth={partialMonth} />
    </>
  );
}
