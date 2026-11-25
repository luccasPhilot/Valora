import { useQuery } from '@tanstack/react-query';

import { getDataHealth } from '@/lib/api/data-health';
import { listRecentSyncRuns } from '@/lib/api/sync';
import { queryKeys } from '@/lib/query-keys';

export function useDataHealth() {
  return useQuery({ queryKey: queryKeys.dataHealth, queryFn: getDataHealth });
}

/** Dentro de `sync-runs`: a sincronização que termina invalida tudo, e o histórico vem junto. */
export function useSyncRunHistory() {
  return useQuery({ queryKey: queryKeys.syncRunHistory, queryFn: listRecentSyncRuns });
}
