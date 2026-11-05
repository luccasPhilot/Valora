import { Money } from '@/components/money';
import type { Transaction } from '@/lib/api/transactions';
import { formatDate } from '@/lib/format';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { isTransfer } from './day-groups';
import { hasOriginBadges, OriginBadges } from './transaction-badges';

const TRANSFER_ICON = 'arrow-left-right';
const UNCATEGORIZED_ICON = 'tag';
const UNCATEGORIZED_LABEL = 'Sem categoria';

export type TransactionLayout = 'stacked' | 'columns';

interface TransactionItemProps {
  transaction: Transaction;
  layout: TransactionLayout;
  onOpen: (transaction: Transaction) => void;
}

/** Receita em `positive`, despesa na cor normal e transferência esmaecida (Design System). */
export function amountColorClass(transaction: Transaction): string {
  if (isTransfer(transaction)) return 'text-muted-foreground';
  return transaction.amountCents > 0 ? 'text-positive' : 'text-foreground';
}

function InstallmentBadge({ transaction }: { transaction: Transaction }) {
  if (transaction.installmentNumber === null || transaction.installmentTotal === null) return null;
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      <span className="sr-only">Parcela </span>
      {transaction.installmentNumber}/{transaction.installmentTotal}
    </span>
  );
}

function AmountText({ transaction }: { transaction: Transaction }) {
  return (
    <span
      className={`shrink-0 text-right text-base font-semibold tabular-nums whitespace-nowrap ${amountColorClass(transaction)}`}
    >
      <Money cents={transaction.amountCents} isSigned />
    </span>
  );
}

const ROW_CLASSES =
  'w-full rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring';

function categoryLabel(transaction: Transaction): string {
  return transaction.category?.name ?? UNCATEGORIZED_LABEL;
}

function iconName(transaction: Transaction): string {
  if (isTransfer(transaction)) return TRANSFER_ICON;
  return transaction.category?.icon ?? UNCATEGORIZED_ICON;
}

function StackedRow({ transaction, onOpen }: Omit<TransactionItemProps, 'layout'>) {
  return (
    <button
      type="button"
      onClick={() => onOpen(transaction)}
      className={`${ROW_CLASSES} flex min-h-[4.25rem] items-center gap-3 py-2`}
    >
      <CategoryBadgeIcon name={iconName(transaction)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-base font-medium">{transaction.description}</span>
          <InstallmentBadge transaction={transaction} />
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {categoryLabel(transaction)} · {transaction.account.name}
        </span>
        {hasOriginBadges(transaction) ? (
          <span className="mt-1 flex flex-wrap items-center gap-1">
            <OriginBadges transaction={transaction} />
          </span>
        ) : null}
      </span>
      <AmountText transaction={transaction} />
    </button>
  );
}

// Colunas flexíveis: data e valor têm largura fixa, e o resto divide o que sobra (1024 px com o menu aberto já cabe).
export const COLUMNS_TEMPLATE =
  'grid-cols-[5.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_8rem] gap-3';

function ColumnsRow({ transaction, onOpen }: Omit<TransactionItemProps, 'layout'>) {
  return (
    <button
      type="button"
      onClick={() => onOpen(transaction)}
      className={`${ROW_CLASSES} grid min-h-14 ${COLUMNS_TEMPLATE} items-center py-2`}
    >
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDate(transaction.date)}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <CategoryBadgeIcon name={iconName(transaction)} />
        <span className="truncate text-sm font-medium">{transaction.description}</span>
        <InstallmentBadge transaction={transaction} />
        <OriginBadges transaction={transaction} />
      </span>
      <span className="truncate text-sm">{categoryLabel(transaction)}</span>
      <span className="truncate text-sm text-muted-foreground">{transaction.account.name}</span>
      <AmountText transaction={transaction} />
    </button>
  );
}

export function TransactionItem({ transaction, layout, onOpen }: TransactionItemProps) {
  return (
    <li>
      {layout === 'columns' ? (
        <ColumnsRow transaction={transaction} onOpen={onOpen} />
      ) : (
        <StackedRow transaction={transaction} onOpen={onOpen} />
      )}
    </li>
  );
}
