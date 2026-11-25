import { ArrowLeftRight, ListChecks, SearchX } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNotice } from '@/hooks/use-notice';
import type { Category } from '@/lib/api/categories';
import type { Transaction } from '@/lib/api/transactions';
import { todayInSaoPaulo } from '@/lib/dates';

import { useCategories } from '../categories/categories-queries';
import { RuleSuggestionPrompt } from '../categories/rule-suggestion-prompt';
import { useRuleSuggestionOffer } from '../categories/use-rule-suggestion-offer';
import { BulkSelectionControls, useBulkActions } from './bulk-selection';
import { DuplicatesBanner } from './duplicates-banner';
import { ExportCsvButton } from './export-csv-button';
import { TransactionDetailHost } from './transaction-detail-host';
import {
  describePeriod,
  hasFiltersBesidesPeriod,
  NO_FILTERS,
  parseFilters,
  serializeFilters,
  toTransactionQuery,
  type TransactionFilters,
} from './transaction-filters';
import { type FiltersBarHandle, TransactionFiltersBar } from './transaction-filters-bar';
import { type ListSelection, TransactionList } from './transaction-list';
import { TransactionSummaryLine } from './transaction-summary';
import {
  useAccountOptions,
  useDuplicateCount,
  useTransactionList,
  useTransactionSummary,
} from './transactions-queries';
import { TransactionsViewsNav } from './transactions-views-nav';
import { usePickCategory } from './use-pick-category';
import { useTransactionSelection } from './use-transaction-selection';

// Faixas do Design System: celular < 768, tablet < 1024, computador a partir de 1024.
const PHONE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(max-width: 1023px)';
const EMPTY_CATEGORIES: readonly Category[] = [];

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const today = todayInSaoPaulo();
  const transactionQuery = useMemo(() => toTransactionQuery(filters, today), [filters, today]);
  const list = useTransactionList(transactionQuery);
  const summary = useTransactionSummary(transactionQuery);
  const categoriesQuery = useCategories();
  const accountsQuery = useAccountOptions();
  const duplicateCount = useDuplicateCount(today);
  const { notice, showNotice } = useNotice();
  const suggestionOffer = useRuleSuggestionOffer(showNotice);
  const pickCategory = usePickCategory({ showNotice, suggestionOffer });
  const [openTransactionId, setOpenTransactionId] = useState<string | null>(null);
  const filtersBarRef = useRef<FiltersBarHandle>(null);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);

  const transactions = useMemo(
    () => list.data?.pages.flatMap((page) => page.items) ?? [],
    [list.data],
  );
  const openTransaction = transactions.find((transaction) => transaction.id === openTransactionId);
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const orderedIds = useMemo(
    () => transactions.map((transaction) => transaction.id),
    [transactions],
  );
  const selection = useTransactionSelection(orderedIds);
  const bulk = useBulkActions({ selection, showNotice, suggestionOffer });

  function updateFilters(next: TransactionFilters) {
    selection.cancel();
    setSearchParams(serializeFilters(next), { replace: true });
  }

  function reviewDuplicates() {
    // Sem data inicial nem final a lista cairia no mês atual; "até hoje" cobre qualquer período.
    updateFilters({ ...NO_FILTERS, period: 'custom', to: today, possibleDuplicate: true });
  }

  const pendingDuplicates = duplicateCount.data ?? 0;

  return (
    <div className="space-y-4">
      <TransactionsViewsNav
        actions={
          transactions.length > 0 && !selection.isSelecting ? (
            <>
              <ExportCsvButton query={transactionQuery} showNotice={showNotice} />
              <Button variant="outline" onClick={selection.start}>
                <ListChecks aria-hidden="true" />
                Selecionar
              </Button>
            </>
          ) : null
        }
      />
      {pendingDuplicates > 0 && !filters.possibleDuplicate ? (
        <DuplicatesBanner count={pendingDuplicates} onReview={reviewDuplicates} />
      ) : null}
      <TransactionFiltersBar
        handleRef={filtersBarRef}
        filters={filters}
        categories={categories}
        accounts={accountsQuery.data ?? []}
        isPhone={isPhone}
        resultCount={summary.data?.count ?? null}
        onChange={updateFilters}
      />
      {list.isPending || transactions.length > 0 ? (
        <TransactionSummaryLine
          summary={summary}
          periodLabel={describePeriod(filters, today)}
          isTransferFilter={filters.type === 'transfer'}
        />
      ) : null}
      <TransactionsContent
        list={list}
        transactions={transactions}
        filters={filters}
        layout={isTablet ? 'stacked' : 'columns'}
        selection={
          selection.isSelecting
            ? { isSelected: selection.isSelected, onToggle: selection.toggle }
            : undefined
        }
        onOpen={(transaction) => setOpenTransactionId(transaction.id)}
        onClearFilters={() => updateFilters(NO_FILTERS)}
        onChangePeriod={() => filtersBarRef.current?.focusPeriod()}
      />
      <BulkSelectionControls selection={selection} bulk={bulk} categories={categories} />
      <TransactionDetailHost
        transaction={openTransaction}
        categories={categories}
        showNotice={showNotice}
        onClose={() => setOpenTransactionId(null)}
        onPickCategory={pickCategory}
      />
      <NoticeRegion notice={notice} />
      <RuleSuggestionPrompt offer={suggestionOffer} />
    </div>
  );
}

interface TransactionsContentProps {
  list: ReturnType<typeof useTransactionList>;
  transactions: readonly Transaction[];
  filters: TransactionFilters;
  layout: 'stacked' | 'columns';
  selection: ListSelection | undefined;
  onOpen: (transaction: Transaction) => void;
  onClearFilters: () => void;
  onChangePeriod: () => void;
}

function TransactionsContent({
  list,
  transactions,
  filters,
  layout,
  selection,
  onOpen,
  onClearFilters,
  onChangePeriod,
}: TransactionsContentProps) {
  if (list.isPending) return <RowsSkeleton rowCount={8} />;
  if (list.isError && !list.data) return <ErrorState onRetry={() => void list.refetch()} />;
  if (transactions.length === 0) {
    return hasFiltersBesidesPeriod(filters) ? (
      <EmptyState
        icon={SearchX}
        title="Nenhuma transação encontrada"
        description="Nada combina com os filtros escolhidos."
        action={<Button onClick={onClearFilters}>Limpar filtros</Button>}
      />
    ) : (
      <EmptyState
        icon={ArrowLeftRight}
        title="Nenhuma transação neste período"
        description="Escolha outro período para ver mais transações."
        action={<Button onClick={onChangePeriod}>Mudar período</Button>}
      />
    );
  }
  return (
    <TransactionList
      transactions={transactions}
      layout={layout}
      hasNextPage={list.hasNextPage}
      isLoadingMore={list.isFetchingNextPage}
      isTransferFilter={filters.type === 'transfer'}
      selection={selection}
      onLoadMore={() => void list.fetchNextPage()}
      onOpen={onOpen}
    />
  );
}
