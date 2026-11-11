import { Target } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { Money } from '@/components/money';
import type { BudgetsOverview } from '@/lib/api/budgets';

interface BudgetsSummaryProps {
  totals: BudgetsOverview['totals'];
}

/** O que já foi gasto dos limites do mês: "R$ X de R$ Y", somados pela API. */
export function BudgetsSummary({ totals }: BudgetsSummaryProps) {
  return (
    <DataCard title="Gasto nos orçamentos" tier="hero" icon={Target}>
      <Metric
        size="display"
        value={
          <>
            <Money cents={totals.spentCents} isTrimmed />{' '}
            <span className="text-lg font-medium whitespace-nowrap text-muted-foreground">
              de <Money cents={totals.limitCents} isTrimmed />
            </span>
          </>
        }
      />
    </DataCard>
  );
}
