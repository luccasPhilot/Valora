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

import { niceValueAxis, stackExtremes } from '@/components/charts/axis-scale';
import { ChartTooltipCard } from '@/components/charts/chart-tooltip';
import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import type { NetWorthPoint } from '@/lib/api/net-worth';
import { formatAxisCurrency, formatMonthYear } from '@/lib/format';

import {
  CHART_MARGIN,
  monthAxisProps,
  monthTitle,
  PartialMonthNote,
  useValueAxisWidth,
  ZERO_LINE_STROKE,
} from '../chart-parts';

const MAX_BAR_WIDTH_PX = 36;
const STACK_ID = 'net-worth-composition';

// Design System, "Paleta de gráficos": os slots em ordem, sem pular. A fatura é negativa e fica
// abaixo do zero; o nome e o sinal `−` na legenda e no tooltip dizem o que a cor não diz sozinha.
const SERIES = [
  { key: 'accountsCents', label: 'Contas', color: 'var(--color-chart-1)' },
  { key: 'investmentsCents', label: 'Investimentos', color: 'var(--color-chart-2)' },
  { key: 'openBillsNegativeCents', label: 'Faturas em aberto', color: 'var(--color-chart-3)' },
] as const;

interface CompositionPoint {
  readonly month: string;
  readonly accountsCents: number;
  readonly investmentsCents: number;
  /** A fatura em aberto como valor negativo: é o que a coluna desenha abaixo do zero. */
  readonly openBillsNegativeCents: number;
  readonly netWorthCents: number;
}

function toCompositionPoint(point: NetWorthPoint): CompositionPoint {
  return {
    month: point.month,
    accountsCents: point.accountsCents,
    investmentsCents: point.investmentsCents,
    openBillsNegativeCents: -point.openBillsCents,
    netWorthCents: point.netWorthCents,
  };
}

function buildTooltip(partialMonth: string) {
  return function CompositionTooltip({ active, payload }: TooltipContentProps) {
    const point: CompositionPoint | undefined = payload[0]?.payload;
    if (!active || !point) return null;
    return (
      <ChartTooltipCard
        title={monthTitle(point.month, partialMonth)}
        rows={[
          ...SERIES.map((series) => ({
            label: series.label,
            cents: point[series.key],
            color: series.color,
            isSigned: series.key === 'openBillsNegativeCents',
          })),
          { label: 'Patrimônio', cents: point.netWorthCents },
        ]}
      />
    );
  };
}

function Legend() {
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
    </ul>
  );
}

interface CompositionChartProps {
  points: readonly NetWorthPoint[];
  /** Mês (`AAAA-MM`) ainda em andamento, marcado em texto. */
  partialMonth: string;
  className?: string;
}

/** De que o patrimônio é feito, mês a mês: contas e investimentos acima do zero, faturas abaixo. */
export function CompositionChart({ points, partialMonth, className }: CompositionChartProps) {
  const { areValuesHidden } = useHideValues();
  const axisWidth = useValueAxisWidth();
  const data = points.map(toCompositionPoint);
  const scale = niceValueAxis(
    data.flatMap((point) =>
      stackExtremes([point.accountsCents, point.investmentsCents, point.openBillsNegativeCents]),
    ),
  );
  const first = points[0];
  const last = points.at(-1);
  return (
    <>
      <Legend />
      <PartialMonthNote months={points} partialMonth={partialMonth} />
      <ChartContainer className={className} aria-hidden="true">
        {/* "sign": os valores positivos empilham para cima do zero e os negativos (a fatura) para baixo. Sem isso o negativo entra na pilha positiva. */}
        <BarChart accessibilityLayer={false} data={data} margin={CHART_MARGIN} stackOffset="sign">
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" />
          <XAxis {...monthAxisProps(points.length)} />
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
          {SERIES.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              stackId={STACK_ID}
              fill={series.color}
              // O traço na cor do cartão separa os segmentos vizinhos sem depender só da cor.
              stroke="var(--color-card)"
              maxBarSize={MAX_BAR_WIDTH_PX}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
      {first && last ? (
        <p className="sr-only">
          Composição do patrimônio de {formatMonthYear(first.month)} a {formatMonthYear(last.month)}
          : em {formatMonthYear(last.month)}, contas <Money cents={last.accountsCents} />,
          investimentos <Money cents={last.investmentsCents} />, faturas em aberto{' '}
          <Money cents={-last.openBillsCents} isSigned /> e patrimônio{' '}
          <Money cents={last.netWorthCents} />.
        </p>
      ) : null}
    </>
  );
}
