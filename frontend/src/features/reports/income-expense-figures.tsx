import { ArrowDownLeft, ArrowUpRight, type LucideIcon, Scale } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import type { IncomeExpenseReport } from '@/lib/api/reports';

import { ResultMoney } from './result-money';

interface FigureProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

function Figure({ title, icon, children }: FigureProps) {
  return (
    <DataCard title={title} icon={icon} className="min-w-0 gap-2">
      {/* O valor nunca quebra nem é cortado: se faltar espaço, é o rótulo que encolhe. */}
      <p className="text-xl font-bold tracking-tight whitespace-nowrap tabular-nums">{children}</p>
    </DataCard>
  );
}

/** Os três números do período: receitas, despesas e resultado. */
export function IncomeExpenseFigures({ totals }: Pick<IncomeExpenseReport, 'totals'>) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Figure title="Receitas" icon={ArrowDownLeft}>
        <span className="text-positive">
          <Money cents={totals.incomeCents} isSigned />
        </span>
      </Figure>
      <Figure title="Despesas" icon={ArrowUpRight}>
        <Money cents={-totals.expenseCents} isSigned />
      </Figure>
      <Figure title="Resultado" icon={Scale}>
        <ResultMoney cents={totals.resultCents} />
      </Figure>
    </div>
  );
}
