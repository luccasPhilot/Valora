import { ChartColumn } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { useHideValues } from '@/components/hide-values-provider';
import { Money } from '@/components/money';
import { ChartContainer } from '@/components/ui/chart';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { MonthTotals } from '@/lib/api/dashboard';
import { formatCompactCurrency, formatMonth, formatMonthName } from '@/lib/format';

import { ChartTooltipCard } from './chart-tooltip';
import { DashboardSection } from './dashboard-section';

const PHONE_QUERY = '(max-width: 767px)';
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const BAR_GAP_PX = 2;
const MAX_BAR_WIDTH_PX = 28;
const AXIS_WIDTH_PX = 72;
const PHONE_AXIS_WIDTH_PX = 60;

// Design System, "Paleta de gráficos": receitas no slot 1 e despesas no slot 2, sempre nessa ordem.
const INCOME_SERIES = { key: 'incomeCents', label: 'Receitas', color: 'var(--color-chart-1)' };
const EXPENSE_SERIES = { key: 'expenseCents', label: 'Despesas', color: 'var(--color-chart-2)' };
const SERIES = [INCOME_SERIES, EXPENSE_SERIES] as const;

function monthTitle(month: string): string {
  return formatMonth(`${month}-01`);
}

function IncomeExpenseTooltip({ active, payload }: TooltipContentProps) {
  const totals: MonthTotals | undefined = payload[0]?.payload;
  if (!active || !totals) return null;
  return (
    <ChartTooltipCard
      title={monthTitle(totals.month)}
      rows={[
        { label: INCOME_SERIES.label, cents: totals.incomeCents, color: INCOME_SERIES.color },
        { label: EXPENSE_SERIES.label, cents: totals.expenseCents, color: EXPENSE_SERIES.color },
      ]}
    />
  );
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

/**
 * O mesmo dado do gráfico em tabela, só para leitor de tela. O `sr-only` fica na `div`: a `table`
 * ignora `overflow: hidden` e, solta, alargaria a página.
 */
function ChartSummary({ months }: { months: readonly MonthTotals[] }) {
  return (
    <div className="sr-only">
      <table>
        <caption>Receitas e despesas dos últimos {months.length} meses</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Receitas</th>
            <th scope="col">Despesas</th>
          </tr>
        </thead>
        <tbody>
          {months.map((totals) => (
            <tr key={totals.month}>
              <th scope="row">{monthTitle(totals.month)}</th>
              <td>
                <Money cents={totals.incomeCents} />
              </td>
              <td>
                <Money cents={totals.expenseCents} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barras agrupadas por mês: receitas e despesas dos últimos 6 meses. */
export function IncomeExpenseChart({ months }: { months: readonly MonthTotals[] }) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const { areValuesHidden } = useHideValues();
  return (
    <DashboardSection title="Receitas x despesas" icon={ChartColumn}>
      <Legend />
      <ChartContainer className="h-52 lg:h-64" aria-hidden="true">
        <BarChart
          data={[...months]}
          barGap={BAR_GAP_PX}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        >
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
            tickFormatter={(cents: number) => formatCompactCurrency(cents)}
          />
          <Tooltip content={IncomeExpenseTooltip} cursor={{ fill: 'var(--color-accent)' }} />
          {SERIES.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              fill={series.color}
              radius={BAR_RADIUS}
              maxBarSize={MAX_BAR_WIDTH_PX}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <ChartSummary months={months} />
    </DashboardSection>
  );
}
