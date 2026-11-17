import { ChevronRight } from 'lucide-react';

import { Money } from '@/components/money';
import type { CategoryInsight } from '@/lib/api/category-insights';
import { formatPercent } from '@/lib/format';

import { CategoryBadgeIcon } from '../category-icons';
import { BudgetStatusBadge } from './budget-status-badge';
import { CategoryTrendSparkline } from './category-trend-sparkline';
import { VariationLabel } from './variation-label';

const UNCATEGORIZED_ICON = 'tag';
const FULL_PERCENT = 100;

export function categoryKeyOf(category: Pick<CategoryInsight, 'kind' | 'categoryId'>): string {
  return category.categoryId ?? category.kind;
}

interface CategoryRowProps {
  category: CategoryInsight;
  months: readonly string[];
  onSelect: (category: CategoryInsight) => void;
}

function CategoryRow({ category, months, onSelect }: CategoryRowProps) {
  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onSelect(category)}
        className="flex min-h-11 w-full items-start gap-3 rounded-lg px-1 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CategoryBadgeIcon name={category.icon ?? UNCATEGORIZED_ICON} />
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span
              className="line-clamp-2 min-w-0 flex-1 basis-28 font-medium break-words"
              title={category.name}
            >
              {category.name}
            </span>
            <span className="shrink-0 text-sm whitespace-nowrap tabular-nums">
              <Money cents={-category.spentCents} isSigned />{' '}
              <span className="text-muted-foreground">
                {formatPercent(category.percent / FULL_PERCENT)}
              </span>
            </span>
          </span>
          <span className="block h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${category.percent}%` }}
            />
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <VariationLabel percent={category.variationPercent} />
            {category.budget ? <BudgetStatusBadge status={category.budget.status} /> : null}
            <span className="ml-auto hidden min-[400px]:block">
              <CategoryTrendSparkline
                name={category.name}
                months={months}
                monthlyCents={category.monthlyCents}
              />
            </span>
          </span>
        </span>
        <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}

interface CategorySpendingListProps {
  categories: readonly CategoryInsight[];
  months: readonly string[];
  onSelect: (category: CategoryInsight) => void;
}

/**
 * Todas as categorias com gasto no mês, do maior para o menor: barras numa cor só (categorias não têm
 * cor), variação, selo do orçamento e a tendência dos últimos meses. Sem rolagem própria: a página rola.
 */
export function CategorySpendingList({ categories, months, onSelect }: CategorySpendingListProps) {
  return (
    <ul className="space-y-1">
      {categories.map((category) => (
        <CategoryRow
          key={categoryKeyOf(category)}
          category={category}
          months={months}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
