import { ArrowDownLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { Money } from '@/components/money';
import type { MonthTotals } from '@/lib/api/planned-entries';

import { expectedTotals } from './planning-labels';

interface SummaryCardProps {
  title: string;
  icon: LucideIcon;
  valueClassName?: string;
  children: ReactNode;
}

function SummaryCard({ title, icon, valueClassName, children }: SummaryCardProps) {
  return (
    <DataCard title={title} icon={icon} className="min-w-0 gap-2">
      <Metric size="md" value={children} valueClassName={valueClassName} />
    </DataCard>
  );
}

/** Receitas e despesas previstas do mês (o que falta e o que já aconteceu; as puladas ficam de fora). */
export function PlanningSummary({ totals }: { totals: MonthTotals }) {
  const expected = expectedTotals(totals);
  return (
    <div className="grid gap-3 min-[400px]:grid-cols-2 sm:gap-4">
      <SummaryCard title="Receitas previstas" icon={ArrowDownLeft} valueClassName="text-positive">
        <Money cents={expected.incomeCents} isSigned />
      </SummaryCard>
      <SummaryCard title="Despesas previstas" icon={ArrowUpRight}>
        <Money cents={-expected.expenseCents} isSigned />
      </SummaryCard>
    </div>
  );
}
