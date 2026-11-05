import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  copyPreviousBudgets,
  getBudgets,
  removeBudgetLimit,
  setBudgetLimit,
} from '@/lib/api/budgets';

import { DASHBOARD_QUERY_KEY } from '../dashboard/dashboard-query-key';

/** Prefixo de todas as consultas de orçamento; Transações o usa para recarregar o gasto. */
export const BUDGETS_QUERY_KEY = ['budgets'] as const;

export function useBudgets(month: string) {
  return useQuery({ queryKey: [...BUDGETS_QUERY_KEY, month], queryFn: () => getBudgets(month) });
}

interface LimitChange {
  readonly categoryId: string;
  readonly limitCents: number;
}

// O gasto, o percentual e o status são calculados no servidor: recarrega em vez de recalcular aqui.
// O Início mostra os orçamentos mais perto do limite, então também recarrega.
function useRefreshBudgets() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: BUDGETS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
    ]);
}

export function useSetBudgetLimit(month: string) {
  const refreshBudgets = useRefreshBudgets();
  return useMutation({
    mutationFn: ({ categoryId, limitCents }: LimitChange) =>
      setBudgetLimit(categoryId, month, limitCents),
    onSuccess: refreshBudgets,
  });
}

export function useRemoveBudgetLimit(month: string) {
  const refreshBudgets = useRefreshBudgets();
  return useMutation({
    mutationFn: (categoryId: string) => removeBudgetLimit(categoryId, month),
    onSuccess: refreshBudgets,
  });
}

export function useCopyPreviousBudgets(month: string) {
  const refreshBudgets = useRefreshBudgets();
  return useMutation({
    mutationFn: () => copyPreviousBudgets(month),
    onSuccess: refreshBudgets,
  });
}
