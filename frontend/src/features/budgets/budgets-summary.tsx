import { Target } from 'lucide-react';

import { Money } from '@/components/money';
import type { BudgetsOverview } from '@/lib/api/budgets';

interface BudgetsSummaryProps {
  totals: BudgetsOverview['totals'];
}

/** O que já foi gasto dos limites do mês: "R$ X de R$ Y", somados pela API. */
export function BudgetsSummary({ totals }: BudgetsSummaryProps) {
  return (
    <section
      aria-labelledby="budgets-summary-title"
      className="space-y-2 rounded-xl bg-secondary p-5"
    >
      <h2 id="budgets-summary-title" className="type-label flex items-center gap-2">
        <Target className="size-4 text-primary" aria-hidden="true" />
        Gasto nos orçamentos
      </h2>
      <p className="type-display tabular-nums">
        <Money cents={totals.spentCents} isTrimmed />{' '}
        <span className="text-lg font-medium whitespace-nowrap text-muted-foreground">
          de <Money cents={totals.limitCents} isTrimmed />
        </span>
      </p>
    </section>
  );
}
