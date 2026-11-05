import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAccountsOverview, setAccountHidden } from '@/lib/api/accounts';

import { DASHBOARD_QUERY_KEY } from '../dashboard/dashboard-query-key';

/** Compartilhada com as opções de conta de Transações: as duas telas leem a mesma resposta. */
export const ACCOUNTS_QUERY_KEY = ['accounts'] as const;

export function useAccountsOverview() {
  return useQuery({ queryKey: ACCOUNTS_QUERY_KEY, queryFn: getAccountsOverview });
}

interface HiddenChange {
  readonly accountId: string;
  readonly isHidden: boolean;
}

export function useSetAccountHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, isHidden }: HiddenChange) => setAccountHidden(accountId, isHidden),
    // Os totais mudam no servidor (inclusive o saldo do Início): recarrega em vez de recalcular no front.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
      ]),
  });
}
