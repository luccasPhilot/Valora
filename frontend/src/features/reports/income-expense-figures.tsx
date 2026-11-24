import { ArrowDownLeft, ArrowUpRight, type LucideIcon, Scale } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import { TonedMoney } from '@/components/toned-money';
import type { IncomeExpenseReport } from '@/lib/api/reports';

import { ReportHero } from './report-hero';
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

interface IncomeExpenseFiguresProps extends Pick<IncomeExpenseReport, 'totals'> {
  /** A frase que explica o resultado, ou nulo quando ainda não há mês fechado. */
  context: ReactNode;
}

/** O resultado do período em destaque e, abaixo, as receitas e as despesas que o formam. */
export function IncomeExpenseFigures({ totals, context }: IncomeExpenseFiguresProps) {
  return (
    <div className="space-y-3">
      <ReportHero
        title="Resultado"
        icon={Scale}
        value={<ResultMoney cents={totals.resultCents} />}
        context={context}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Figure title="Receitas" icon={ArrowDownLeft}>
          <TonedMoney cents={totals.incomeCents} kind="flow" isSigned />
        </Figure>
        <Figure title="Despesas" icon={ArrowUpRight}>
          <Money cents={-totals.expenseCents} isSigned />
        </Figure>
      </div>
    </div>
  );
}
