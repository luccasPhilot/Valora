import { useEffect, useRef } from 'react';

import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/lib/api/transactions';
import { formatDayHeader } from '@/lib/format';

import { type DayGroup, groupByDay } from './day-groups';
import { COLUMNS_TEMPLATE, TransactionItem, type TransactionLayout } from './transaction-item';

// Começa a buscar a próxima página um pouco antes de o fim da lista aparecer.
const LOAD_MORE_MARGIN = '400px';

interface TransactionListProps {
  transactions: readonly Transaction[];
  layout: TransactionLayout;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (transaction: Transaction) => void;
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

function ColumnTitles() {
  return (
    <div
      aria-hidden="true"
      className={`grid ${COLUMNS_TEMPLATE} px-[calc(1rem+1px)] pb-1 text-xs font-medium text-muted-foreground`}
    >
      <span>Data</span>
      <span className="pl-12">Descrição</span>
      <span>Categoria</span>
      <span>Conta</span>
      <span className="text-right">Valor</span>
    </div>
  );
}

function DayGroupSection({
  group,
  layout,
  onOpen,
}: {
  group: DayGroup;
  layout: TransactionLayout;
  onOpen: (transaction: Transaction) => void;
}) {
  const headingId = `day-${group.date}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border bg-card p-2 shadow-card">
      <header className="flex items-baseline justify-between gap-3 px-2 py-2">
        <h2 id={headingId} className="type-label">
          {formatDayHeader(group.date)}
        </h2>
        <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
          <span className="sr-only">Total do dia: </span>
          <Money cents={group.totalCents} isSigned />
        </span>
      </header>
      <ul className="divide-y divide-border">
        {group.transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            layout={layout}
            onOpen={onOpen}
          />
        ))}
      </ul>
    </section>
  );
}

export function TransactionList({
  transactions,
  layout,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  onOpen,
}: TransactionListProps) {
  const sentinelRef = useLoadMoreWhenVisible(hasNextPage && !isLoadingMore, onLoadMore);
  return (
    <div className="space-y-4">
      {layout === 'columns' ? <ColumnTitles /> : null}
      {groupByDay(transactions).map((group) => (
        <DayGroupSection key={group.date} group={group} layout={layout} onOpen={onOpen} />
      ))}
      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-2">
          <Button variant="outline" disabled={isLoadingMore} onClick={onLoadMore}>
            {isLoadingMore ? 'Carregando…' : 'Carregar mais'}
          </Button>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Não há mais transações neste período.
        </p>
      )}
    </div>
  );
}
