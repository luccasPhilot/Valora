import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAccountsOverview, setAccountHidden } from '@/lib/api/accounts';
import { listArchivedConnections, setConnectionArchived } from '@/lib/api/sync';

import { DASHBOARD_QUERY_KEY } from '../dashboard/dashboard-query-key';
import { NET_WORTH_QUERY_KEY } from '../investments/net-worth-query-key';

/** Compartilhada com as opções de conta de Transações: as duas telas leem a mesma resposta. */
export const ACCOUNTS_QUERY_KEY = ['accounts'] as const;

export function useAccountsOverview() {
  return useQuery({ queryKey: ACCOUNTS_QUERY_KEY, queryFn: getAccountsOverview });
}

/** Os bancos arquivados (seção "Arquivados"). A chave começa por `connections`, como a dos ativos. */
export function useArchivedConnections() {
  return useQuery({
    queryKey: ['connections', 'archived'] as const,
    queryFn: listArchivedConnections,
  });
}

interface ArchiveChange {
  readonly connectionId: string;
  readonly isArchived: boolean;
}

/**
 * Arquivar ou reativar um banco muda contas, totais, faturas, projeção, Início, alertas e a faixa
 * de aviso: tudo é consultado de novo, em vez de recalculado no front.
 */
export function useSetConnectionArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId, isArchived }: ArchiveChange) =>
      setConnectionArchived(connectionId, isArchived),
    onSuccess: () => queryClient.invalidateQueries(),
  });
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
        queryClient.invalidateQueries({ queryKey: NET_WORTH_QUERY_KEY }),
      ]),
  });
}
