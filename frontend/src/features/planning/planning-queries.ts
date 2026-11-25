import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import {
  createPlannedEntry,
  decideOccurrence,
  deletePlannedEntry,
  getPlannedEntries,
  type OccurrenceDecision,
  type PlannedEntryInput,
  undoOccurrence,
  updatePlannedEntry,
} from '@/lib/api/planned-entries';
import { queryKeys } from '@/lib/query-keys';

export function usePlannedEntries(month: string) {
  return useQuery({
    queryKey: [...queryKeys.plannedEntries, month],
    queryFn: () => getPlannedEntries(month),
  });
}

interface EntrySave {
  /** Sem id, cria; com id, substitui a previsão. */
  readonly id?: string;
  readonly input: PlannedEntryInput;
}

export function useSavePlannedEntry() {
  return useMutation({
    mutationFn: ({ id, input }: EntrySave) =>
      id === undefined ? createPlannedEntry(input) : updatePlannedEntry(id, input),
    onSuccess: useInvalidateAfter('planned-entries'),
  });
}

export function useDeletePlannedEntry() {
  return useMutation({
    mutationFn: deletePlannedEntry,
    onSuccess: useInvalidateAfter('planned-entries'),
  });
}

interface OccurrenceChange {
  readonly plannedEntryId: string;
  readonly decision: OccurrenceDecision;
}

export function useDecideOccurrence(month: string) {
  return useMutation({
    mutationFn: ({ plannedEntryId, decision }: OccurrenceChange) =>
      decideOccurrence(plannedEntryId, month, decision),
    onSuccess: useInvalidateAfter('planned-entries'),
  });
}

export function useUndoOccurrence(month: string) {
  return useMutation({
    mutationFn: (plannedEntryId: string) => undoOccurrence(plannedEntryId, month),
    onSuccess: useInvalidateAfter('planned-entries'),
  });
}
