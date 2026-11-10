import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addGoalContribution,
  type ContributionInput,
  createGoal,
  deleteGoal,
  getGoalContributions,
  getGoals,
  type GoalInput,
  type NewGoalInput,
  removeGoalContribution,
  updateGoal,
} from '@/lib/api/goals';

/** Prefixo de todas as consultas de metas (a lista e o histórico de cada uma). */
export const GOALS_QUERY_KEY = ['goals'] as const;

const CONTRIBUTIONS_PAGE_SIZE = 20;
const FIRST_PAGE = 1;

export function useGoals() {
  return useQuery({ queryKey: GOALS_QUERY_KEY, queryFn: getGoals });
}

/** Histórico completo de uma meta, uma página por vez; `enabled` espera o painel abrir. */
export function useGoalContributions(goalId: string, isEnabled: boolean) {
  return useInfiniteQuery({
    queryKey: [...GOALS_QUERY_KEY, 'contributions', goalId],
    queryFn: ({ pageParam }) => getGoalContributions(goalId, pageParam, CONTRIBUTIONS_PAGE_SIZE),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: ({ pagination }) =>
      pagination.page * pagination.limit < pagination.total ? pagination.page + 1 : undefined,
    enabled: isEnabled,
  });
}

// Progresso, ritmo, prazo e situação são calculados no servidor: recarrega em vez de recalcular aqui.
function useRefreshGoals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
}

export function useCreateGoal() {
  const refreshGoals = useRefreshGoals();
  return useMutation({
    mutationFn: (input: NewGoalInput) => createGoal(input),
    onSuccess: refreshGoals,
  });
}

interface GoalUpdate {
  readonly id: string;
  readonly input: GoalInput;
}

export function useUpdateGoal() {
  const refreshGoals = useRefreshGoals();
  return useMutation({
    mutationFn: ({ id, input }: GoalUpdate) => updateGoal(id, input),
    onSuccess: refreshGoals,
  });
}

export function useDeleteGoal() {
  const refreshGoals = useRefreshGoals();
  return useMutation({ mutationFn: deleteGoal, onSuccess: refreshGoals });
}

interface ContributionAdd {
  readonly goalId: string;
  readonly input: ContributionInput;
}

export function useAddContribution() {
  const refreshGoals = useRefreshGoals();
  return useMutation({
    mutationFn: ({ goalId, input }: ContributionAdd) => addGoalContribution(goalId, input),
    onSuccess: refreshGoals,
  });
}

interface ContributionRemoval {
  readonly goalId: string;
  readonly contributionId: string;
}

export function useRemoveContribution() {
  const refreshGoals = useRefreshGoals();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: ContributionRemoval) =>
      removeGoalContribution(goalId, contributionId),
    onSuccess: refreshGoals,
  });
}
