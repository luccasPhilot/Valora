import { useMemo, useState } from 'react';

import { MAX_BULK_TRANSACTIONS } from '@/lib/api/transactions';

import { EMPTY_SELECTION, toggleSelection } from './selection';

/** O modo "Selecionar" de uma lista: quais linhas estão marcadas, na ordem da tela. */
export function useTransactionSelection(orderedIds: readonly string[]) {
  const [isSelecting, setSelecting] = useState(false);
  const [state, setState] = useState(EMPTY_SELECTION);
  // Uma linha que saiu da lista (revisada, outra página recarregada) deixa de contar.
  const selectedIds = useMemo(
    () => orderedIds.filter((id) => state.selectedIds.has(id)),
    [orderedIds, state.selectedIds],
  );

  function start() {
    setState(EMPTY_SELECTION);
    setSelecting(true);
  }

  function cancel() {
    setState(EMPTY_SELECTION);
    setSelecting(false);
  }

  function toggle(id: string, isRange: boolean) {
    setState((current) =>
      toggleSelection(current, { id, orderedIds, isRange, maxSize: MAX_BULK_TRANSACTIONS }),
    );
  }

  return {
    isSelecting,
    selectedIds,
    isSelected: (id: string) => state.selectedIds.has(id),
    isFull: selectedIds.length >= MAX_BULK_TRANSACTIONS,
    start,
    cancel,
    toggle,
  };
}

export type TransactionSelection = ReturnType<typeof useTransactionSelection>;
