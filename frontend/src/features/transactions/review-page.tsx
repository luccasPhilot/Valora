import { CheckCheck, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { type Notice, useNotice } from '@/hooks/use-notice';
import type { Category } from '@/lib/api/categories';
import type { Transaction } from '@/lib/api/transactions';

import { useCategories } from '../categories/categories-queries';
import { RuleSuggestionPrompt } from '../categories/rule-suggestion-prompt';
import { useRuleSuggestionOffer } from '../categories/use-rule-suggestion-offer';
import { BulkSelectionControls, useBulkActions } from './bulk-selection';
import { CategoryChangePanel } from './category-change-panel';
import { ReviewItem } from './review-item';
import { useReviewAll, useReviewInbox, useReviewTransactions } from './review-queries';
import { TransactionDetailHost } from './transaction-detail-host';
import { TransactionList } from './transaction-list';
import { TRANSACTIONS_PATH, TransactionsViewsNav } from './transactions-views-nav';
import { usePickCategory } from './use-pick-category';
import { type TransactionSelection, useTransactionSelection } from './use-transaction-selection';

// Faixa do Design System: a lista em colunas só a partir de 1024 px.
const TABLET_QUERY = '(max-width: 1023px)';
const EMPTY_CATEGORIES: readonly Category[] = [];

function describePending(count: number): string {
  return `${count} para revisar`;
}

function describeReviewed(count: number): string {
  return count === 1 ? '1 marcada como revisada.' : `${count} marcadas como revisadas.`;
}

function confirmAllTitle(count: number): string {
  return count === 1 ? 'Marcar 1 como revisada?' : `Marcar as ${count} como revisadas?`;
}

/** "Ok" numa linha e "Marcar tudo como revisado", com os avisos de cada um. */
function useReviewActions(showNotice: (notice: Notice) => void) {
  const reviewTransactions = useReviewTransactions();
  const reviewAll = useReviewAll();
  const [isConfirmingAll, setConfirmingAll] = useState(false);

  function reviewOne(transaction: Transaction) {
    reviewTransactions.mutate([transaction.id], {
      onError: () =>
        showNotice({ tone: 'error', message: 'Não foi possível marcar como revisada.' }),
    });
  }

  function confirmReviewAll(loadedAt: string) {
    reviewAll.mutate(loadedAt, {
      onSuccess: (reviewedCount) => {
        setConfirmingAll(false);
        showNotice({ tone: 'success', message: describeReviewed(reviewedCount) });
      },
    });
  }

  function openConfirmAll() {
    reviewAll.reset();
    setConfirmingAll(true);
  }

  return {
    reviewOne,
    reviewingId: reviewTransactions.isPending ? reviewTransactions.variables[0] : undefined,
    isConfirmingAll,
    isReviewingAll: reviewAll.isPending,
    hasReviewAllFailed: reviewAll.isError,
    openConfirmAll,
    closeConfirmAll: () => setConfirmingAll(false),
    confirmReviewAll,
  };
}

interface ReviewInboxContentProps {
  inbox: ReturnType<typeof useReviewInbox>;
  transactions: readonly Transaction[];
  selection: TransactionSelection;
  review: ReturnType<typeof useReviewActions>;
  onOpen: (transaction: Transaction) => void;
  onChangeCategory: (transaction: Transaction) => void;
}

function ReviewInboxContent({
  inbox,
  transactions,
  selection,
  review,
  onOpen,
  onChangeCategory,
}: ReviewInboxContentProps) {
  const isTablet = useMediaQuery(TABLET_QUERY);
  if (inbox.isPending) return <RowsSkeleton rowCount={6} />;
  if (inbox.isError && !inbox.data) return <ErrorState onRetry={() => void inbox.refetch()} />;
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={CheckCheck}
        title="Tudo revisado"
        description="O que chegar do banco na próxima sincronização aparece aqui."
        action={
          <Button variant="outline" asChild>
            <Link to={TRANSACTIONS_PATH}>Ver todas as transações</Link>
          </Button>
        }
      />
    );
  }
  const pendingCount = inbox.data.pages[0]?.pagination.total ?? transactions.length;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {describePending(pendingCount)}
          </span>
          , das mais antigas para as mais novas.
        </p>
        {selection.isSelecting ? null : (
          <Button variant="outline" onClick={review.openConfirmAll}>
            <CheckCheck aria-hidden="true" />
            Marcar tudo como revisado
          </Button>
        )}
      </div>
      <TransactionList
        transactions={transactions}
        layout={isTablet ? 'stacked' : 'columns'}
        hasNextPage={inbox.hasNextPage}
        isLoadingMore={inbox.isFetchingNextPage}
        isTransferFilter={false}
        endLabel="Isso é tudo o que falta revisar."
        onLoadMore={() => void inbox.fetchNextPage()}
        onOpen={onOpen}
        selection={
          selection.isSelecting
            ? { isSelected: selection.isSelected, onToggle: selection.toggle }
            : undefined
        }
        renderItem={
          selection.isSelecting
            ? undefined
            : (transaction) => (
                <ReviewItem
                  transaction={transaction}
                  isReviewing={review.reviewingId === transaction.id}
                  onOpen={onOpen}
                  onReview={review.reviewOne}
                  onChangeCategory={onChangeCategory}
                />
              )
        }
      />
    </>
  );
}

export function Component() {
  const inbox = useReviewInbox();
  const categoriesQuery = useCategories();
  const { notice, showNotice } = useNotice();
  const suggestionOffer = useRuleSuggestionOffer(showNotice);
  const pickCategory = usePickCategory({ showNotice, suggestionOffer });
  const review = useReviewActions(showNotice);
  const [openTransactionId, setOpenTransactionId] = useState<string | null>(null);
  const [categoryTarget, setCategoryTarget] = useState<Transaction | null>(null);

  const transactions = useMemo(
    () => inbox.data?.pages.flatMap((page) => page.items) ?? [],
    [inbox.data],
  );
  const orderedIds = useMemo(
    () => transactions.map((transaction) => transaction.id),
    [transactions],
  );
  const selection = useTransactionSelection(orderedIds);
  const bulk = useBulkActions({ selection, showNotice, suggestionOffer });
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const firstPage = inbox.data?.pages[0];
  const openTransaction = transactions.find((transaction) => transaction.id === openTransactionId);

  return (
    <div className="space-y-4">
      <TransactionsViewsNav
        actions={
          transactions.length > 0 && !selection.isSelecting ? (
            <Button variant="outline" onClick={selection.start}>
              <ListChecks aria-hidden="true" />
              Selecionar
            </Button>
          ) : null
        }
      />
      <ReviewInboxContent
        inbox={inbox}
        transactions={transactions}
        selection={selection}
        review={review}
        onOpen={(transaction) => setOpenTransactionId(transaction.id)}
        onChangeCategory={setCategoryTarget}
      />
      <BulkSelectionControls selection={selection} bulk={bulk} categories={categories} />
      <CategoryChangePanel
        open={categoryTarget !== null}
        title="Trocar categoria"
        description="A transação fica com a categoria escolhida e sai da caixa."
        categories={categories}
        currentCategoryId={categoryTarget?.category?.id ?? null}
        applyAlwaysLabel={
          categoryTarget ? `Aplicar sempre para “${categoryTarget.description}”` : undefined
        }
        onClose={() => setCategoryTarget(null)}
        onPick={(category, applyAlways) => {
          if (categoryTarget) pickCategory(categoryTarget, category, applyAlways);
          setCategoryTarget(null);
        }}
      />
      <TransactionDetailHost
        transaction={openTransaction}
        categories={categories}
        showNotice={showNotice}
        onClose={() => setOpenTransactionId(null)}
        onPickCategory={pickCategory}
      />
      <ConfirmDialog
        open={review.isConfirmingAll}
        onOpenChange={(isOpen) => (isOpen ? undefined : review.closeConfirmAll())}
        title={confirmAllTitle(firstPage?.pagination.total ?? 0)}
        description="Elas saem da caixa. O que chegou depois de você abrir esta tela continua aqui."
        confirmLabel="Marcar tudo"
        confirmVariant="default"
        isPending={review.isReviewingAll}
        errorMessage={review.hasReviewAllFailed ? 'Não foi possível marcar. Tente de novo.' : null}
        onConfirm={() => firstPage && review.confirmReviewAll(firstPage.loadedAt)}
      />
      <NoticeRegion notice={notice} />
      <RuleSuggestionPrompt offer={suggestionOffer} />
    </div>
  );
}
