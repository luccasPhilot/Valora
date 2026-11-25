import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import {
  copyPreviousBudgets,
  getBudgets,
  removeBudgetLimit,
  setBudgetLimit,
} from '@/lib/api/budgets';
import { queryKeys } from '@/lib/query-keys';

export function useBudgets(month: string) {
  return useQuery({ queryKey: [...queryKeys.budgets, month], queryFn: () => getBudgets(month) });
}

interface LimitChange {
  readonly categoryId: string;
  readonly limitCents: number;
}

export function useSetBudgetLimit(month: string) {
  return useMutation({
    mutationFn: ({ categoryId, limitCents }: LimitChange) =>
      setBudgetLimit(categoryId, month, limitCents),
    onSuccess: useInvalidateAfter('budgets'),
  });
}

export function useRemoveBudgetLimit(month: string) {
  return useMutation({
    mutationFn: (categoryId: string) => removeBudgetLimit(categoryId, month),
    onSuccess: useInvalidateAfter('budgets'),
  });
}

export function useCopyPreviousBudgets(month: string) {
  return useMutation({
    mutationFn: () => copyPreviousBudgets(month),
    onSuccess: useInvalidateAfter('budgets'),
  });
}
