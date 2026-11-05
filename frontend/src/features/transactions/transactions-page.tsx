import { ArrowLeftRight, SearchX } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNotice } from '@/hooks/use-notice';
import type { Category } from '@/lib/api/categories';
import type { DuplicateResolution, Transaction } from '@/lib/api/transactions';
import { todayInSaoPaulo } from '@/lib/dates';

import { useCategories } from '../categories/categories-queries';
import { DuplicatesBanner } from './duplicates-banner';
import { useNewTransaction } from './new-transaction/new-transaction-provider';
import { TransactionDetail } from './transaction-detail';
import {
  hasFiltersBesidesPeriod,
  NO_FILTERS,
  parseFilters,
  serializeFilters,
  toTransactionQuery,
  type TransactionFilters,
} from './transaction-filters';
import { type FiltersBarHandle, TransactionFiltersBar } from './transaction-filters-bar';
import { TransactionList } from './transaction-list';
import {
  useAccountOptions,
  useChangeCategory,
  useDeleteTransaction,
  useDuplicateCount,
  useResolveDuplicate,
  useTransactionList,
} from './transactions-queries';

// Faixas do Design System: celular < 768, tablet < 1024, computador a partir de 1024.
const PHONE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(max-width: 1023px)';
const EMPTY_CATEGORIES: readonly Category[] = [];

const DUPLICATE_RESOLUTION_MESSAGES: Readonly<Record<DuplicateResolution, string>> = {
  merge: 'Transações juntadas. Ficou a do banco, com a sua categoria.',
  keep_both: 'Mantivemos as duas transações.',
};

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const today = todayInSaoPaulo();
  const list = useTransactionList(toTransactionQuery(filters, today));
  const categoriesQuery = useCategories();
  const accountsQuery = useAccountOptions();
  const changeCategory = useChangeCategory();
  const deleteTransaction = useDeleteTransaction();
  const resolveDuplicate = useResolveDuplicate();
  const duplicateCount = useDuplicateCount(today);
  const { openNewTransaction } = useNewTransaction();
  const { notice, showNotice } = useNotice();
  const [openTransactionId, setOpenTransactionId] = useState<string | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const filtersBarRef = useRef<FiltersBarHandle>(null);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);

  const transactions = useMemo(
    () => list.data?.pages.flatMap((page) => page.items) ?? [],
    [list.data],
  );
  const openTransaction = transactions.find((transaction) => transaction.id === openTransactionId);
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;

  function updateFilters(next: TransactionFilters) {
    setSearchParams(serializeFilters(next), { replace: true });
  }

  function pickCategory(transaction: Transaction, category: Category, applyAlways: boolean) {
    setOpenTransactionId(null);
    changeCategory.mutate(
      { transaction, category, applyAlways },
      {
        onSuccess: () =>
          showNotice({
            tone: 'success',
            message: applyAlways
              ? `Categoria trocada para ${category.name}. Regra criada para esta descrição.`
              : `Categoria trocada para ${category.name}.`,
          }),
        onError: () =>
          showNotice({
            tone: 'error',
            message: 'Não foi possível trocar a categoria. A anterior foi mantida.',
          }),
      },
    );
  }

  function editTransaction(transaction: Transaction) {
    setOpenTransactionId(null);
    openNewTransaction({ transaction });
  }

  function confirmDelete(transaction: Transaction) {
    deleteTransaction.mutate(transaction, {
      onSuccess: () => {
        setTransactionToDelete(null);
        setOpenTransactionId(null);
        showNotice({ tone: 'success', message: 'Transação excluída.' });
      },
    });
  }

  function resolve(transaction: Transaction, action: DuplicateResolution) {
    resolveDuplicate.mutate(
      { transaction, action },
      {
        onSuccess: () => {
          setOpenTransactionId(null);
          showNotice({ tone: 'success', message: DUPLICATE_RESOLUTION_MESSAGES[action] });
        },
        onError: () =>
          showNotice({ tone: 'error', message: 'Não foi possível resolver. Tente de novo.' }),
      },
    );
  }

  function reviewDuplicates() {
    // Sem data inicial nem final a lista cairia no mês atual; "até hoje" cobre qualquer período.
    updateFilters({ ...NO_FILTERS, period: 'custom', to: today, possibleDuplicate: true });
  }

  const pendingDuplicates = duplicateCount.data ?? 0;

  return (
    <div className="space-y-4">
      {pendingDuplicates > 0 && !filters.possibleDuplicate ? (
        <DuplicatesBanner count={pendingDuplicates} onReview={reviewDuplicates} />
      ) : null}
      <TransactionFiltersBar
        handleRef={filtersBarRef}
        filters={filters}
        categories={categories}
        accounts={accountsQuery.data ?? []}
        isPhone={isPhone}
        onChange={updateFilters}
      />
      <TransactionsContent
        list={list}
        transactions={transactions}
        filters={filters}
        layout={isTablet ? 'stacked' : 'columns'}
        onOpen={(transaction) => setOpenTransactionId(transaction.id)}
        onClearFilters={() => updateFilters(NO_FILTERS)}
        onChangePeriod={() => filtersBarRef.current?.focusPeriod()}
      />
      <TransactionDetail
        transaction={openTransaction}
        categories={categories}
        isResolvingDuplicate={resolveDuplicate.isPending}
        onClose={() => setOpenTransactionId(null)}
        onPickCategory={pickCategory}
        onEdit={editTransaction}
        onDelete={(transaction) => {
          deleteTransaction.reset();
          setTransactionToDelete(transaction);
        }}
        onResolveDuplicate={resolve}
      />
      <ConfirmDialog
        open={transactionToDelete !== null}
        onOpenChange={(isOpen) => (isOpen ? undefined : setTransactionToDelete(null))}
        title="Excluir esta transação?"
        description="Ela some da lista e dos totais. Não dá para desfazer."
        confirmLabel="Excluir"
        isPending={deleteTransaction.isPending}
        errorMessage={deleteTransaction.isError ? 'Não foi possível excluir. Tente de novo.' : null}
        onConfirm={() => transactionToDelete && confirmDelete(transactionToDelete)}
      />
      <NoticeRegion notice={notice} />
    </div>
  );
}

interface TransactionsContentProps {
  list: ReturnType<typeof useTransactionList>;
  transactions: readonly Transaction[];
  filters: TransactionFilters;
  layout: 'stacked' | 'columns';
  onOpen: (transaction: Transaction) => void;
  onClearFilters: () => void;
  onChangePeriod: () => void;
}

function TransactionsContent({
  list,
  transactions,
  filters,
  layout,
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
      onLoadMore={() => void list.fetchNextPage()}
      onOpen={onOpen}
    />
  );
}
