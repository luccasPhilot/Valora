import { cn } from 'cn';
import { ArrowDownLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { useId } from 'react';

import { Money } from '@/components/money';

interface SummaryCardProps {
  title: string;
  icon: LucideIcon;
  cents: number;
  valueClassName?: string;
}

function SummaryCard({ title, icon: Icon, cents, valueClassName }: SummaryCardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4 shadow-card"
    >
      <h3 id={titleId} className="type-label flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {title}
      </h3>
      {/* O valor nunca quebra nem é cortado: se faltar espaço, é o rótulo que encolhe. */}
      <p
        className={cn(
          'text-lg font-bold tracking-tight whitespace-nowrap tabular-nums md:type-value-lg',
          valueClassName,
        )}
      >
        <Money cents={cents} isSigned />
      </p>
    </section>
  );
}

interface MonthSummaryProps {
  incomeCents: number;
  expenseCents: number;
}

/** Receitas e despesas do mês lado a lado; transferências já ficam fora dos dois números. */
export function MonthSummary({ incomeCents, expenseCents }: MonthSummaryProps) {
  return (
    <div className="grid h-full grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
      <SummaryCard
        title="Receitas do mês"
        icon={ArrowDownLeft}
        cents={incomeCents}
        valueClassName="text-positive"
      />
      <SummaryCard title="Despesas do mês" icon={ArrowUpRight} cents={-expenseCents} />
    </div>
  );
}
