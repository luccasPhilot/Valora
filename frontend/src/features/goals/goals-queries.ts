import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
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
import { queryKeys } from '@/lib/query-keys';

const CONTRIBUTIONS_PAGE_SIZE = 20;
const FIRST_PAGE = 1;

export function useGoals() {
  return useQuery({ queryKey: queryKeys.goals, queryFn: getGoals });
}

/** Histórico completo de uma meta, uma página por vez; `enabled` espera o painel abrir. */
export function useGoalContributions(goalId: string, isEnabled: boolean) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.goals, 'contributions', goalId],
    queryFn: ({ pageParam }) => getGoalContributions(goalId, pageParam, CONTRIBUTIONS_PAGE_SIZE),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: ({ pagination }) =>
      pagination.page * pagination.limit < pagination.total ? pagination.page + 1 : undefined,
    enabled: isEnabled,
  });
}

export function useCreateGoal() {
  return useMutation({
    mutationFn: (input: NewGoalInput) => createGoal(input),
    onSuccess: useInvalidateAfter('goals'),
  });
}

interface GoalUpdate {
  readonly id: string;
  readonly input: GoalInput;
}

export function useUpdateGoal() {
  return useMutation({
    mutationFn: ({ id, input }: GoalUpdate) => updateGoal(id, input),
    onSuccess: useInvalidateAfter('goals'),
  });
}

export function useDeleteGoal() {
  return useMutation({ mutationFn: deleteGoal, onSuccess: useInvalidateAfter('goals') });
}

interface ContributionAdd {
  readonly goalId: string;
  readonly input: ContributionInput;
}

export function useAddContribution() {
  return useMutation({
    mutationFn: ({ goalId, input }: ContributionAdd) => addGoalContribution(goalId, input),
    onSuccess: useInvalidateAfter('goals'),
  });
}

interface ContributionRemoval {
  readonly goalId: string;
  readonly contributionId: string;
}

export function useRemoveContribution() {
  return useMutation({
    mutationFn: ({ goalId, contributionId }: ContributionRemoval) =>
      removeGoalContribution(goalId, contributionId),
    onSuccess: useInvalidateAfter('goals'),
  });
}
