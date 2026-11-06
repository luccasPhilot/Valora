import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Money } from '@/components/money';
import type { MonthTotals } from '@/lib/api/planned-entries';

import { expectedTotals } from './planning-labels';

interface SummaryCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

function SummaryCard({ title, icon, children }: SummaryCardProps) {
  return (
    <section
      aria-label={title}
      className="min-w-0 space-y-2 rounded-xl border bg-card p-4 shadow-card sm:p-5"
    >
      <h2 className="type-label flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <p className="font-display text-2xl font-bold tabular-nums">{children}</p>
    </section>
  );
}

/** Receitas e despesas previstas do mês (o que falta e o que já aconteceu; as puladas ficam de fora). */
export function PlanningSummary({ totals }: { totals: MonthTotals }) {
  const expected = expectedTotals(totals);
  return (
    <div className="grid gap-3 min-[400px]:grid-cols-2 sm:gap-4">
      <SummaryCard
        title="Receitas previstas"
        icon={<ArrowDownLeft className="size-4 text-primary" aria-hidden="true" />}
      >
        <span className="text-positive">
          <Money cents={expected.incomeCents} isSigned />
        </span>
      </SummaryCard>
      <SummaryCard
        title="Despesas previstas"
        icon={<ArrowUpRight className="size-4 text-primary" aria-hidden="true" />}
      >
        <Money cents={-expected.expenseCents} isSigned />
      </SummaryCard>
    </div>
  );
}
