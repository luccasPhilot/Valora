import type { BudgetStatus } from '@/lib/api/budgets';

import { STATUS_DISPLAY } from '../../budgets/budget-row';

const STATUS_LABELS: Readonly<Record<BudgetStatus, string>> = {
  ok: 'Dentro do orçamento',
  warning: 'Perto do limite',
  exceeded: 'Orçamento estourado',
};

interface BudgetStatusBadgeProps {
  status: BudgetStatus;
}

/** O status do orçamento em ícone e texto (nunca só a cor), com as mesmas cores de Orçamentos. */
export function BudgetStatusBadge({ status }: BudgetStatusBadgeProps) {
  const display = STATUS_DISPLAY[status];
  const Icon = display.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <Icon className={`size-3.5 shrink-0 ${display.iconClass}`} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
