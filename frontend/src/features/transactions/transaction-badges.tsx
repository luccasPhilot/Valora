import { Copy, PencilLine } from 'lucide-react';

import type { Transaction } from '@/lib/api/transactions';

const BADGE_BASE_CLASSES =
  'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';

/** "Manual" em `secondary`, com ícone: a transação foi lançada por você, não veio do banco. */
export function ManualBadge() {
  return (
    <span className={`${BADGE_BASE_CLASSES} bg-secondary text-secondary-foreground`}>
      <PencilLine className="size-3" aria-hidden="true" />
      Manual
    </span>
  );
}

/** Texto `warning` sobre `warning-surface`: pede conferência, sem o peso do vermelho. */
export function PossibleDuplicateBadge() {
  return (
    <span className={`${BADGE_BASE_CLASSES} bg-warning-surface text-warning`}>
      <Copy className="size-3" aria-hidden="true" />
      Possível duplicata
    </span>
  );
}

export function hasOriginBadges(transaction: Transaction): boolean {
  return transaction.source === 'manual' || transaction.possibleDuplicateOfId !== null;
}

/** Os badges de origem da transação: "Manual" e, no banco, "Possível duplicata". */
export function OriginBadges({ transaction }: { transaction: Transaction }) {
  return (
    <>
      {transaction.source === 'manual' ? <ManualBadge /> : null}
      {transaction.possibleDuplicateOfId !== null ? <PossibleDuplicateBadge /> : null}
    </>
  );
}
