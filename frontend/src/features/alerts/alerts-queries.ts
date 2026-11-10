import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dismissAlert, getAlerts, markAlertRead, markAllAlertsRead } from '@/lib/api/alerts';

/** Prefixo das consultas de alertas; telas que mudam gasto ou limite o usam para recarregar o sino. */
export const ALERTS_QUERY_KEY = ['alerts'] as const;

// Sempre confere ao abrir a tela e ao voltar o foco para a janela (o `staleTime` padrão é de 1 min).
// Ao fim de uma sincronização o `useSync` já recarrega todas as consultas.
export function useAlerts() {
  return useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: getAlerts,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
}

function useRefreshAlerts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
}

export function useMarkAlertRead() {
  return useMutation({ mutationFn: markAlertRead, onSuccess: useRefreshAlerts() });
}

export function useMarkAllAlertsRead() {
  return useMutation({ mutationFn: markAllAlertsRead, onSuccess: useRefreshAlerts() });
}

export function useDismissAlert() {
  return useMutation({ mutationFn: dismissAlert, onSuccess: useRefreshAlerts() });
}
