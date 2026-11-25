export interface SelectionState {
  readonly selectedIds: ReadonlySet<string>;
  /** A última linha tocada: o início do intervalo do Shift+clique. */
  readonly anchorId: string | null;
}

export const EMPTY_SELECTION: SelectionState = { selectedIds: new Set(), anchorId: null };

export interface SelectionToggle {
  readonly id: string;
  /** Na ordem da tela: o intervalo do Shift+clique segue esta ordem. */
  readonly orderedIds: readonly string[];
  readonly isRange: boolean;
  readonly maxSize: number;
}

function rangeBetween(orderedIds: readonly string[], fromId: string, toId: string): string[] {
  const fromIndex = orderedIds.indexOf(fromId);
  const toIndex = orderedIds.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1) return [toId];
  const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  return orderedIds.slice(start, end + 1);
}

function withAdded(
  selectedIds: ReadonlySet<string>,
  ids: readonly string[],
  maxSize: number,
): Set<string> {
  const next = new Set(selectedIds);
  for (const id of ids) {
    if (next.size >= maxSize) break;
    next.add(id);
  }
  return next;
}

/**
 * Tocar marca ou desmarca a linha. Shift+clique marca o intervalo desde a última linha tocada. A
 * seleção nunca passa de `maxSize` (o limite da API para uma ação em massa).
 */
export function toggleSelection(state: SelectionState, toggle: SelectionToggle): SelectionState {
  const { id, orderedIds, isRange, maxSize } = toggle;
  if (isRange && state.anchorId !== null) {
    const range = rangeBetween(orderedIds, state.anchorId, id);
    return { selectedIds: withAdded(state.selectedIds, range, maxSize), anchorId: id };
  }
  if (state.selectedIds.has(id)) {
    const next = new Set(state.selectedIds);
    next.delete(id);
    return { selectedIds: next, anchorId: id };
  }
  return { selectedIds: withAdded(state.selectedIds, [id], maxSize), anchorId: id };
}
