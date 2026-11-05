import { CircleAlert, CircleCheck, type LucideIcon, TriangleAlert } from 'lucide-react';

import { Money } from '@/components/money';
import { Progress } from '@/components/ui/progress';
import type { Budget, BudgetStatus } from '@/lib/api/budgets';

import { CategoryBadgeIcon } from '../categories/category-icons';

interface StatusDisplay {
  readonly icon: LucideIcon;
  /** Só o ícone e o preenchimento usam a cor do status; o texto fica na cor normal (contraste). */
  readonly iconClass: string;
  readonly fillClass: string;
}

// Design System, "Status de orçamento": ícone Lucide e cor de cada estado.
const STATUS_DISPLAY: Readonly<Record<BudgetStatus, StatusDisplay>> = {
  ok: { icon: CircleCheck, iconClass: 'text-status-ok', fillClass: 'bg-status-ok' },
  warning: {
    icon: TriangleAlert,
    iconClass: 'text-status-warning',
    fillClass: 'bg-status-warning',
  },
  exceeded: {
    icon: CircleAlert,
    iconClass: 'text-status-critical',
    fillClass: 'bg-status-critical',
  },
};

/** "R$ 410 de R$ 1.000", "82% do limite" ou "R$ 120 acima do limite". */
export function BudgetStatusText({ budget }: { budget: Budget }) {
  if (budget.status === 'warning') return <>{budget.percent}% do limite</>;
  if (budget.status === 'exceeded') {
    return (
      <>
        <Money cents={budget.spentCents - budget.limitCents} isTrimmed /> acima do limite
      </>
    );
  }
  return (
    <>
      <Money cents={budget.spentCents} isTrimmed /> de <Money cents={budget.limitCents} isTrimmed />
    </>
  );
}

interface BudgetRowProps {
  budget: Budget;
  onSelect: (budget: Budget) => void;
}

/** Uma categoria com limite: ícone, nome, barra e o status em ícone + texto. Tocar abre o painel. */
export function BudgetRow({ budget, onSelect }: BudgetRowProps) {
  const display = STATUS_DISPLAY[budget.status];
  const StatusIcon = display.icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(budget)}
        className="flex h-full min-h-11 w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-card outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-center gap-3">
          <CategoryBadgeIcon name={budget.categoryIcon} />
          <span className="min-w-0 font-medium break-words">{budget.categoryName}</span>
        </span>
        <Progress
          value={budget.percent}
          aria-label={`${budget.categoryName}: ${budget.percent}% do limite`}
          indicatorClassName={display.fillClass}
        />
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-2">
            <StatusIcon className={`size-4 shrink-0 ${display.iconClass}`} aria-hidden="true" />
            <span>
              <BudgetStatusText budget={budget} />
            </span>
          </span>
          {budget.status === 'ok' ? null : (
            <span className="text-muted-foreground tabular-nums">
              <Money cents={budget.spentCents} isTrimmed /> de{' '}
              <Money cents={budget.limitCents} isTrimmed />
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
