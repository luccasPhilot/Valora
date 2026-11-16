import { ChartColumn } from 'lucide-react';

import { IncomeExpenseBars } from '@/components/charts/income-expense-bars';
import type { MonthTotals } from '@/lib/api/dashboard';

import { DashboardSection } from './dashboard-section';

/** Barras agrupadas por mês: receitas e despesas dos últimos 6 meses. */
export function IncomeExpenseChart({ months }: { months: readonly MonthTotals[] }) {
  return (
    <DashboardSection title="Receitas x despesas" icon={ChartColumn}>
      <IncomeExpenseBars
        points={months}
        summaryCaption={`Receitas e despesas dos últimos ${months.length} meses`}
      />
    </DashboardSection>
  );
}
