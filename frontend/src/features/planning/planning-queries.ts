import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

import { PROJECTION_QUERY_KEY } from './projection/projection-queries';

/** Prefixo de todas as consultas de previsões: qualquer mudança recarrega todos os meses. */
export const PLANNED_ENTRIES_QUERY_KEY = ['planned-entries'] as const;

export function usePlannedEntries(month: string) {
  return useQuery({
    queryKey: [...PLANNED_ENTRIES_QUERY_KEY, month],
    queryFn: () => getPlannedEntries(month),
  });
}

// As ocorrências, as sugestões, os totais e a projeção são calculados no servidor: recarrega em vez de recalcular aqui.
function useRefreshPlanning() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: PLANNED_ENTRIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PROJECTION_QUERY_KEY }),
    ]);
}

interface EntrySave {
  /** Sem id, cria; com id, substitui a previsão. */
  readonly id?: string;
  readonly input: PlannedEntryInput;
}

export function useSavePlannedEntry() {
  const refresh = useRefreshPlanning();
  return useMutation({
    mutationFn: ({ id, input }: EntrySave) =>
      id === undefined ? createPlannedEntry(input) : updatePlannedEntry(id, input),
    onSuccess: refresh,
  });
}

export function useDeletePlannedEntry() {
  const refresh = useRefreshPlanning();
  return useMutation({ mutationFn: deletePlannedEntry, onSuccess: refresh });
}

interface OccurrenceChange {
  readonly plannedEntryId: string;
  readonly decision: OccurrenceDecision;
}

export function useDecideOccurrence(month: string) {
  const refresh = useRefreshPlanning();
  return useMutation({
    mutationFn: ({ plannedEntryId, decision }: OccurrenceChange) =>
      decideOccurrence(plannedEntryId, month, decision),
    onSuccess: refresh,
  });
}

export function useUndoOccurrence(month: string) {
  const refresh = useRefreshPlanning();
  return useMutation({
    mutationFn: (plannedEntryId: string) => undoOccurrence(plannedEntryId, month),
    onSuccess: refresh,
  });
}
