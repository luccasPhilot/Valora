import { useState } from 'react';

import type { Notice } from '@/hooks/use-notice';
import type { Category } from '@/lib/api/categories';

import type { RuleSuggestionOffer } from '../categories/use-rule-suggestion-offer';
import { CategoryChangePanel } from './category-change-panel';
import { useChangeCategoryOfMany, useReviewTransactions } from './review-queries';
import { SelectionBar } from './selection-bar';
import type { TransactionSelection } from './use-transaction-selection';

function describeChanged(count: number, categoryName: string): string {
  return count === 1
    ? `1 transação trocada para ${categoryName}.`
    : `${count} transações trocadas para ${categoryName}.`;
}

function describeReviewed(count: number): string {
  return count === 1 ? '1 marcada como revisada.' : `${count} marcadas como revisadas.`;
}

interface BulkActionsOptions {
  readonly selection: TransactionSelection;
  readonly showNotice: (notice: Notice) => void;
  readonly suggestionOffer: RuleSuggestionOffer;
}

/** As ações da barra de seleção: trocar a categoria de todas ou marcá-las como revisadas. */
export function useBulkActions({ selection, showNotice, suggestionOffer }: BulkActionsOptions) {
  const changeCategoryOfMany = useChangeCategoryOfMany();
  const reviewTransactions = useReviewTransactions();
  const [isPickingCategory, setPickingCategory] = useState(false);

  function changeCategory(category: Category) {
    setPickingCategory(false);
    changeCategoryOfMany.mutate(
      { transactionIds: selection.selectedIds, categoryId: category.id },
      {
        onSuccess: ({ updatedCount, ruleSuggestion }) => {
          selection.cancel();
          if (ruleSuggestion) suggestionOffer.offer(ruleSuggestion);
          else
            showNotice({ tone: 'success', message: describeChanged(updatedCount, category.name) });
        },
        onError: () =>
          showNotice({
            tone: 'error',
            message: 'Não foi possível trocar as categorias. Nada mudou.',
          }),
      },
    );
  }

  function markReviewed() {
    reviewTransactions.mutate(selection.selectedIds, {
      onSuccess: (reviewedCount) => {
        selection.cancel();
        showNotice({ tone: 'success', message: describeReviewed(reviewedCount) });
      },
      onError: () =>
        showNotice({ tone: 'error', message: 'Não foi possível marcar como revisadas.' }),
    });
  }

  return {
    isPickingCategory,
    isPending: changeCategoryOfMany.isPending || reviewTransactions.isPending,
    openCategoryPicker: () => setPickingCategory(true),
    closeCategoryPicker: () => setPickingCategory(false),
    changeCategory,
    markReviewed,
  };
}

interface BulkSelectionControlsProps {
  selection: TransactionSelection;
  bulk: ReturnType<typeof useBulkActions>;
  categories: readonly Category[];
}

/** A barra do modo "Selecionar" e o painel de categoria da troca em massa. */
export function BulkSelectionControls({ selection, bulk, categories }: BulkSelectionControlsProps) {
  const count = selection.selectedIds.length;
  return (
    <>
      {selection.isSelecting ? (
        <SelectionBar
          selectedCount={count}
          isFull={selection.isFull}
          isPending={bulk.isPending}
          onChangeCategory={bulk.openCategoryPicker}
          onMarkReviewed={bulk.markReviewed}
          onCancel={selection.cancel}
        />
      ) : null}
      <CategoryChangePanel
        open={bulk.isPickingCategory}
        title={
          count === 1
            ? 'Trocar categoria de 1 transação'
            : `Trocar categoria de ${count} transações`
        }
        description="Todas ficam com a categoria escolhida e saem da caixa Para revisar."
        categories={categories}
        currentCategoryId={null}
        onClose={bulk.closeCategoryPicker}
        onPick={(category) => bulk.changeCategory(category)}
      />
    </>
  );
}
