import { cn } from 'cn';

import { Money } from '@/components/money';
import type { CategorySeries } from '@/lib/api/reports';
import { formatPercent } from '@/lib/format';

import { CategoryBadgeIcon } from '../../categories/category-icons';

const OTHER_ICON = 'ellipsis';
const UNCATEGORIZED_ICON = 'tag';
const FULL_PERCENT = 100;

function iconFor(series: CategorySeries): string {
  if (series.icon !== null) return series.icon;
  return series.kind === 'other' ? OTHER_ICON : UNCATEGORIZED_ICON;
}

function CategoryRow({ series, barPercent }: { series: CategorySeries; barPercent: number }) {
  return (
    <li className="flex min-h-11 items-center gap-3 px-1 py-1.5">
      <CategoryBadgeIcon name={iconFor(series)} />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate font-medium" title={series.name}>
            {series.name}
          </span>
          <span className="shrink-0 text-sm whitespace-nowrap tabular-nums">
            <Money cents={series.totalCents} />{' '}
            <span className="text-muted-foreground">
              {formatPercent(series.percent / FULL_PERCENT)}
            </span>
          </span>
        </span>
        <span className="block h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
          <span
            className={cn(
              'block h-full rounded-full',
              series.kind === 'other' ? 'bg-chart-other' : 'bg-primary',
            )}
            style={{ width: `${barPercent}%` }}
          />
        </span>
      </span>
    </li>
  );
}

/** Ranking do período: barras numa cor só (`primary`; "Outros" em cinza). Categorias não têm cor própria. */
export function CategoryRankingList({ series }: { series: readonly CategorySeries[] }) {
  return (
    <ul className="space-y-1">
      {series.map((item) => (
        <CategoryRow key={item.categoryId ?? item.kind} series={item} barPercent={item.percent} />
      ))}
    </ul>
  );
}
