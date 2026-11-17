import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Money } from '@/components/money';
import type { CategorySeries } from '@/lib/api/reports';
import { formatPercent } from '@/lib/format';

import { CategoryBadgeIcon } from '../../categories/category-icons';
import { categoryTransactionsPath } from './category-transactions-link';
import { seriesColor } from './series-color';

const OTHER_ICON = 'ellipsis';
const UNCATEGORIZED_ICON = 'tag';
const FULL_PERCENT = 100;
const ROW_CLASSES = 'flex min-h-11 items-center gap-3 rounded-lg px-1 py-1.5';

function iconFor(series: CategorySeries): string {
  if (series.icon !== null) return series.icon;
  return series.kind === 'other' ? OTHER_ICON : UNCATEGORIZED_ICON;
}

interface CategoryRowProps {
  series: CategorySeries;
  /** Posição no ranking: a cor da marca é a mesma da coluna do gráfico empilhado. */
  position: number;
  from: string;
  to: string;
}

function RowContent({ series, position }: Pick<CategoryRowProps, 'series' | 'position'>) {
  return (
    <>
      <CategoryBadgeIcon name={iconFor(series)} />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: seriesColor(series, position) }}
              aria-hidden="true"
            />
            <span className="line-clamp-2 break-words" title={series.name}>
              {series.name}
            </span>
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
            style={{ width: `${series.percent}%` }}
          />
        </span>
      </span>
    </>
  );
}

function RowFrame({ path, children }: { path: string | null; children: ReactNode }) {
  if (path === null) return <div className={ROW_CLASSES}>{children}</div>;
  return (
    <Link
      to={path}
      className={cn(
        ROW_CLASSES,
        'outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {children}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function CategoryRow({ series, position, from, to }: CategoryRowProps) {
  return (
    <li>
      <RowFrame path={categoryTransactionsPath(series, from, to)}>
        <RowContent series={series} position={position} />
      </RowFrame>
    </li>
  );
}

interface CategoryRankingListProps {
  series: readonly CategorySeries[];
  /** Primeiro e último mês do período (`AAAA-MM`): a linha leva às transações desse intervalo. */
  from: string;
  to: string;
}

/**
 * Ranking do período: barras numa cor só (`primary`; "Outros" em cinza), com a marca na cor da coluna
 * do gráfico. Cada categoria abre as suas transações no período; "Outros" não, por juntar várias.
 */
export function CategoryRankingList({ series, from, to }: CategoryRankingListProps) {
  return (
    <ul className="space-y-1">
      {series.map((item, position) => (
        <CategoryRow
          key={item.categoryId ?? item.kind}
          series={item}
          position={position}
          from={from}
          to={to}
        />
      ))}
    </ul>
  );
}
