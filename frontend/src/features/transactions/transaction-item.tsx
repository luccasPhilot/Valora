import { Check } from 'lucide-react';
import type { MouseEvent } from 'react';

import { Money } from '@/components/money';
import { useAmountTone } from '@/components/use-amount-tone';
import type { Transaction } from '@/lib/api/transactions';
import { formatDate } from '@/lib/format';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { isTransfer } from './day-groups';
import { hasOriginBadges, OriginBadges } from './transaction-badges';

const TRANSFER_ICON = 'arrow-left-right';
const UNCATEGORIZED_ICON = 'tag';
const UNCATEGORIZED_LABEL = 'Sem categoria';

export type TransactionLayout = 'stacked' | 'columns';

/** No modo "Selecionar", tocar a linha marca ou desmarca; com Shift, marca o intervalo. */
export interface RowSelection {
  readonly isSelected: boolean;
  readonly onToggle: (isRange: boolean) => void;
}

interface TransactionItemProps {
  transaction: Transaction;
  layout: TransactionLayout;
  onOpen: (transaction: Transaction) => void;
  selection?: RowSelection;
}

type RowProps = Omit<TransactionItemProps, 'layout'>;

/** A linha é um botão: abre o detalhe ou, no modo "Selecionar", age como caixa de seleção. */
function rowButtonProps({ transaction, onOpen, selection }: RowProps) {
  if (!selection) return { onClick: () => onOpen(transaction) };
  return {
    role: 'checkbox',
    'aria-checked': selection.isSelected,
    onClick: (event: MouseEvent) => selection.onToggle(event.shiftKey),
  } as const;
}

/** A caixa de seleção visível, numa área de 44 px; o estado vai pelo `aria-checked` da linha. */
function SelectionMark({ isSelected }: { isSelected: boolean }) {
  const boxClasses = isSelected
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background';
  return (
    <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center">
      <span className={`flex size-5 items-center justify-center rounded-xs border-2 ${boxClasses}`}>
        {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
    </span>
  );
}

/** Receita em `positive`, despesa na cor normal e transferência esmaecida (Design System). */
export function useTransactionAmountClass(transaction: Transaction): string {
  const tone = useAmountTone(transaction.amountCents, 'flow');
  if (isTransfer(transaction)) return 'text-muted-foreground';
  return tone || 'text-foreground';
}

export function InstallmentBadge({ transaction }: { transaction: Transaction }) {
  if (transaction.installmentNumber === null || transaction.installmentTotal === null) return null;
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      <span className="sr-only">Parcela </span>
      {transaction.installmentNumber}/{transaction.installmentTotal}
    </span>
  );
}

export function AmountText({ transaction }: { transaction: Transaction }) {
  const amountClass = useTransactionAmountClass(transaction);
  return (
    <span
      className={`shrink-0 text-right text-base font-semibold tabular-nums whitespace-nowrap ${amountClass}`}
    >
      <Money cents={transaction.amountCents} isSigned />
    </span>
  );
}

const ROW_CLASSES =
  'w-full rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-accent';

function categoryLabel(transaction: Transaction): string {
  return transaction.category?.name ?? UNCATEGORIZED_LABEL;
}

export function iconName(transaction: Transaction): string {
  if (isTransfer(transaction)) return TRANSFER_ICON;
  return transaction.category?.icon ?? UNCATEGORIZED_ICON;
}

function StackedRow(props: RowProps) {
  const { transaction, selection } = props;
  return (
    <button
      type="button"
      {...rowButtonProps(props)}
      className={`${ROW_CLASSES} flex min-h-[4.25rem] items-center gap-3 py-2`}
    >
      {selection ? <SelectionMark isSelected={selection.isSelected} /> : null}
      {/* No celular, a caixa de seleção toma o lugar do ícone: os dois juntos espremem a descrição. */}
      <span className={selection ? 'max-sm:hidden' : 'contents'}>
        <CategoryBadgeIcon name={iconName(transaction)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="line-clamp-2 text-base font-medium break-words">
            {transaction.description}
          </span>
          <InstallmentBadge transaction={transaction} />
        </span>
        <span className="line-clamp-2 block text-sm text-muted-foreground">
          {categoryLabel(transaction)}
          {/* Abaixo de 360 px a conta sai: a linha fica só com a categoria. */}
          <span className="max-[359px]:hidden"> · {transaction.account.name}</span>
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
/** No modo "Selecionar" a caixa de seleção ganha a primeira coluna. */
export const SELECTING_COLUMNS_TEMPLATE =
  'grid-cols-[2.75rem_5.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_8rem] gap-3';

function ColumnsRow(props: RowProps) {
  const { transaction, selection } = props;
  const template = selection ? SELECTING_COLUMNS_TEMPLATE : COLUMNS_TEMPLATE;
  return (
    <button
      type="button"
      {...rowButtonProps(props)}
      className={`${ROW_CLASSES} grid min-h-14 ${template} items-center py-2`}
    >
      {selection ? <SelectionMark isSelected={selection.isSelected} /> : null}
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

export function TransactionItem({ layout, ...rowProps }: TransactionItemProps) {
  return (
    <li>{layout === 'columns' ? <ColumnsRow {...rowProps} /> : <StackedRow {...rowProps} />}</li>
  );
}
