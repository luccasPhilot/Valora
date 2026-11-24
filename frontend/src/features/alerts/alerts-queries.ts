import { useMutation, useQuery } from '@tanstack/react-query';

import { useInvalidateAfter } from '@/hooks/use-invalidate-after';
import { dismissAlert, getAlerts, markAlertRead, markAllAlertsRead } from '@/lib/api/alerts';
import { queryKeys } from '@/lib/query-keys';

// Sempre confere ao abrir a tela e ao voltar o foco para a janela (o `staleTime` padrão é de 1 min).
// Ao fim de uma sincronização o `useSync` já recarrega todas as consultas.
export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: getAlerts,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
}

export function useMarkAlertRead() {
  return useMutation({ mutationFn: markAlertRead, onSuccess: useInvalidateAfter('alerts') });
}

export function useMarkAllAlertsRead() {
  return useMutation({ mutationFn: markAllAlertsRead, onSuccess: useInvalidateAfter('alerts') });
}

export function useDismissAlert() {
  return useMutation({ mutationFn: dismissAlert, onSuccess: useInvalidateAfter('alerts') });
}
