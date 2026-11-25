import { type ReactNode, useEffect, useRef } from 'react';

import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/lib/api/transactions';
import { formatDayHeader } from '@/lib/format';

import { type DayGroup, groupByDay } from './day-groups';
import {
  COLUMNS_TEMPLATE,
  SELECTING_COLUMNS_TEMPLATE,
  TransactionItem,
  type TransactionLayout,
} from './transaction-item';

/** O modo "Selecionar" da lista inteira. */
export interface ListSelection {
  readonly isSelected: (transactionId: string) => boolean;
  readonly onToggle: (transactionId: string, isRange: boolean) => void;
}

// Começa a buscar a próxima página um pouco antes de o fim da lista aparecer.
const LOAD_MORE_MARGIN = '400px';

interface TransactionListProps {
  transactions: readonly Transaction[];
  layout: TransactionLayout;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  /** Com o filtro "Transferências", o total do dia seria sempre zero: o cabeçalho mostra a contagem. */
  isTransferFilter: boolean;
  onLoadMore: () => void;
  onOpen: (transaction: Transaction) => void;
  selection?: ListSelection;
  /** Outra linha no lugar da padrão (a caixa "Para revisar" tem as ações dela). */
  renderItem?: (transaction: Transaction) => ReactNode;
  /** O texto do fim da lista, depois da última página. */
  endLabel?: string;
}

const DEFAULT_END_LABEL = 'Não há mais transações neste período.';

function transferCountLabel(count: number): string {
  return count === 1 ? '1 transferência' : `${count} transferências`;
}

function useLoadMoreWhenVisible(isEnabled: boolean, onLoadMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    // Sem IntersectionObserver (testes), o botão "Carregar mais" continua disponível.
    if (!isEnabled || !sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: LOAD_MORE_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isEnabled, onLoadMore]);
  return sentinelRef;
}

function ColumnTitles({ isSelecting }: { isSelecting: boolean }) {
  const template = isSelecting ? SELECTING_COLUMNS_TEMPLATE : COLUMNS_TEMPLATE;
  return (
    <div
      aria-hidden="true"
      className={`grid ${template} px-[calc(1rem+1px)] pb-1 text-xs font-medium text-muted-foreground`}
    >
      {isSelecting ? <span /> : null}
      <span>Data</span>
      <span className="pl-12">Descrição</span>
      <span>Categoria</span>
      <span>Conta</span>
      <span className="text-right">Valor</span>
    </div>
  );
}

interface DayGroupSectionProps {
  group: DayGroup;
  layout: TransactionLayout;
  isTransferFilter: boolean;
  onOpen: (transaction: Transaction) => void;
  selection?: ListSelection;
  renderItem?: (transaction: Transaction) => ReactNode;
}

function DayGroupSection({
  group,
  layout,
  isTransferFilter,
  onOpen,
  selection,
  renderItem,
}: DayGroupSectionProps) {
  const headingId = `day-${group.date}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border bg-card p-2 shadow-card">
      <header className="flex items-baseline justify-between gap-3 px-2 py-2">
        <h2 id={headingId} className="type-label">
          {formatDayHeader(group.date)}
        </h2>
        <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
          <span className="sr-only">Total do dia: </span>
          {isTransferFilter ? (
            transferCountLabel(group.transactions.length)
          ) : (
            <Money cents={group.totalCents} isSigned />
          )}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {group.transactions.map((transaction) =>
          renderItem ? (
            <li key={transaction.id}>{renderItem(transaction)}</li>
          ) : (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              layout={layout}
              onOpen={onOpen}
              selection={
                selection && {
                  isSelected: selection.isSelected(transaction.id),
                  onToggle: (isRange) => selection.onToggle(transaction.id, isRange),
                }
              }
            />
          ),
        )}
      </ul>
    </section>
  );
}

export function TransactionList({
  transactions,
  layout,
  hasNextPage,
  isLoadingMore,
  isTransferFilter,
  onLoadMore,
  onOpen,
  selection,
  renderItem,
  endLabel = DEFAULT_END_LABEL,
}: TransactionListProps) {
  const sentinelRef = useLoadMoreWhenVisible(hasNextPage && !isLoadingMore, onLoadMore);
  return (
    <div className="space-y-4">
      {layout === 'columns' && !renderItem ? (
        <ColumnTitles isSelecting={selection !== undefined} />
      ) : null}
      {groupByDay(transactions).map((group) => (
        <DayGroupSection
          key={group.date}
          group={group}
          layout={layout}
          isTransferFilter={isTransferFilter}
          onOpen={onOpen}
          selection={selection}
          renderItem={renderItem}
        />
      ))}
      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-2">
          <Button variant="outline" disabled={isLoadingMore} onClick={onLoadMore}>
            {isLoadingMore ? 'Carregando…' : 'Carregar mais'}
          </Button>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">{endLabel}</p>
      )}
    </div>
  );
}
