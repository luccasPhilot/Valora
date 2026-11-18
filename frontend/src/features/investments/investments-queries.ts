import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createManualInvestment,
  deleteManualInvestment,
  getInvestments,
  type ManualInvestmentChanges,
  type ManualInvestmentInput,
  updateManualInvestment,
} from '@/lib/api/investments';

import { DASHBOARD_QUERY_KEY } from '../dashboard/dashboard-query-key';
import { GOALS_QUERY_KEY } from '../goals/goals-queries';
import { NET_WORTH_QUERY_KEY } from './net-worth-query-key';

export const INVESTMENTS_QUERY_KEY = ['investments'] as const;

export function useInvestments() {
  return useQuery({ queryKey: INVESTMENTS_QUERY_KEY, queryFn: getInvestments });
}

// A posição manual entra no patrimônio, no Início e nas metas vinculadas: recarrega tudo o que
// depende do valor, em vez de recalcular no front.
function useRefreshInvestments() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [INVESTMENTS_QUERY_KEY, NET_WORTH_QUERY_KEY, GOALS_QUERY_KEY, DASHBOARD_QUERY_KEY].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

export function useCreateInvestment() {
  const refreshInvestments = useRefreshInvestments();
  return useMutation({
    mutationFn: (input: ManualInvestmentInput) => createManualInvestment(input),
    onSuccess: refreshInvestments,
  });
}

interface InvestmentUpdate {
  readonly id: string;
  readonly changes: ManualInvestmentChanges;
}

export function useUpdateInvestment() {
  const refreshInvestments = useRefreshInvestments();
  return useMutation({
    mutationFn: ({ id, changes }: InvestmentUpdate) => updateManualInvestment(id, changes),
    onSuccess: refreshInvestments,
  });
}

export function useDeleteInvestment() {
  const refreshInvestments = useRefreshInvestments();
  return useMutation({
    mutationFn: (id: string) => deleteManualInvestment(id),
    onSuccess: refreshInvestments,
  });
}
