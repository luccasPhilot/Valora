import { ArrowDown, ArrowUp, ArrowUpRight, Minus } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { Money } from '@/components/money';
import type { CategoryInsights } from '@/lib/api/category-insights';
import { formatPercent } from '@/lib/format';

import { describeComparedPeriod, describeVariation, variationDirection } from './analysis-labels';

const FULL_PERCENT = 100;
const DIRECTION_ICONS = { up: ArrowUp, down: ArrowDown, flat: Minus } as const;

function VariationLine({ insights }: { insights: CategoryInsights }) {
  const { totals, previousMonth } = insights;
  const description = describeVariation(totals.variationPercent);
  const direction = variationDirection(totals.variationPercent);
  if (description === null || direction === 'none') {
    return <span className="block">Não há gasto no período anterior para comparar.</span>;
  }
  const Icon = DIRECTION_ICONS[direction];
  return (
    <span className="flex items-start gap-1.5">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium text-foreground">{description}</span>,{' '}
        {describeComparedPeriod({ comparedThroughDay: totals.comparedThroughDay, previousMonth })}
      </span>
    </span>
  );
}

function TopCategoryLine({ insights }: { insights: CategoryInsights }) {
  const [top] = insights.categories;
  if (!top) return null;
  const share = formatPercent(top.percent / FULL_PERCENT);
  if (top.kind === 'uncategorized') {
    return <span className="block">A maior parte do gasto, {share}, está sem categoria.</span>;
  }
  return (
    <span className="block">
      {top.name} é a maior fatia: <Money cents={top.spentCents} />, {share} do gasto.
    </span>
  );
}

/** O número que responde a pergunta da aba: quanto foi gasto no mês, e como isso se compara. */
export function SpendingHero({ insights }: { insights: CategoryInsights }) {
  return (
    <DataCard title="Gasto no mês" tier="hero" icon={ArrowUpRight} className="gap-2">
      <Metric
        size="lg"
        value={<Money cents={-insights.totals.spentCents} isSigned />}
        caption={
          <span className="space-y-1">
            <VariationLine insights={insights} />
            <TopCategoryLine insights={insights} />
          </span>
        }
      />
    </DataCard>
  );
}
