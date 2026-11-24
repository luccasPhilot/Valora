import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import { getAccountsOverview, setAccountHidden } from '@/lib/api/accounts';
import { listArchivedConnections, setConnectionArchived } from '@/lib/api/sync';
import { queryKeys } from '@/lib/query-keys';

/** A chave é compartilhada com as opções de conta de Transações: as duas telas leem a mesma resposta. */
export function useAccountsOverview() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: getAccountsOverview });
}

/** Os bancos arquivados (seção "Arquivados"). A chave começa por `connections`, como a dos ativos. */
export function useArchivedConnections() {
  return useQuery({ queryKey: queryKeys.archivedConnections, queryFn: listArchivedConnections });
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
    // Fora do mapa de invalidação: muda todas as áreas, então invalida tudo, sem filtro.
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
  return useMutation({
    mutationFn: ({ accountId, isHidden }: HiddenChange) => setAccountHidden(accountId, isHidden),
    onSuccess: useInvalidateAfter('accounts'),
  });
}
