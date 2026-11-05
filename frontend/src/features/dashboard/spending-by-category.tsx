import { cn } from 'cn';
import { ChartBarBig } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Money } from '@/components/money';
import type { SpendingItem } from '@/lib/api/dashboard';
import { formatPercent } from '@/lib/format';

import { transactionsLinkFor } from '../budgets/budget-months';
import { CategoryBadgeIcon } from '../categories/category-icons';
import { DashboardSection, SectionEmpty } from './dashboard-section';

const OTHER_ICON = 'ellipsis';
const UNCATEGORIZED_ICON = 'tag';
const FULL_PERCENT = 100;
const ROW_CLASSES = 'flex min-h-11 items-center gap-3 rounded-md px-1 py-1.5';

function iconFor(item: SpendingItem): string {
  if (item.kind === 'category') return item.icon;
  return item.kind === 'other' ? OTHER_ICON : UNCATEGORIZED_ICON;
}

interface CategoryBarRowProps {
  item: SpendingItem;
  /** Largura da barra em relação à maior categoria, como na lista do Design System. */
  barPercent: number;
}

function CategoryBarRow({ item, barPercent }: CategoryBarRowProps) {
  return (
    <>
      <CategoryBadgeIcon name={iconFor(item)} />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate font-medium">{item.name}</span>
          <span className="shrink-0 text-sm whitespace-nowrap tabular-nums">
            <Money cents={item.amountCents} />{' '}
            <span className="text-muted-foreground">
              {formatPercent(item.percent / FULL_PERCENT)}
            </span>
          </span>
        </span>
        <span className="block h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
          <span
            className={cn(
              'block h-full rounded-full',
              item.kind === 'other' ? 'bg-chart-other' : 'bg-primary',
            )}
            style={{ width: `${barPercent}%` }}
          />
        </span>
      </span>
    </>
  );
}

function RowShell({ to, children }: { to: string | null; children: ReactNode }) {
  if (to === null) return <div className={ROW_CLASSES}>{children}</div>;
  return (
    <Link
      to={to}
      className={cn(
        ROW_CLASSES,
        'outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {children}
    </Link>
  );
}

interface SpendingByCategoryProps {
  items: readonly SpendingItem[];
  /** AAAA-MM: o mês em que a lista de Transações abre ao tocar numa categoria. */
  month: string;
}

/** Lista de barras numa cor só (`primary`), "Outros" em cinza. Categorias não têm cor própria. */
export function SpendingByCategory({ items, month }: SpendingByCategoryProps) {
  const largestAmount = Math.max(...items.map((item) => item.amountCents), 1);
  return (
    <DashboardSection title="Gastos por categoria" icon={ChartBarBig}>
      {items.length === 0 ? (
        <SectionEmpty message="Nenhum gasto neste mês" />
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.kind === 'category' ? item.categoryId : item.kind}>
              {/* Só categorias de verdade abrem Transações filtradas; "Sem categoria" e "Outros" não. */}
              <RowShell
                to={item.kind === 'category' ? transactionsLinkFor(item.categoryId, month) : null}
              >
                <CategoryBarRow
                  item={item}
                  barPercent={(item.amountCents / largestAmount) * FULL_PERCENT}
                />
              </RowShell>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
