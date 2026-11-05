import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  type Connection,
  getLatestSyncRun,
  listConnections,
  startSyncRun,
  SYNC_IN_PROGRESS_CODE,
  type SyncRun,
} from '@/lib/api/sync';
import { ApiError } from '@/lib/api-client';
import { isConnectionBroken } from '@/lib/connection-status';
import {
  describeSyncOutcome,
  SYNC_START_FAILED_NOTICE,
  SYNC_TAKING_TOO_LONG_NOTICE,
} from '@/lib/sync-labels';

import type { Notice } from './use-notice';

const LATEST_SYNC_RUN_KEY = ['sync-runs', 'latest'] as const;
const CONNECTIONS_KEY = ['connections'] as const;
const POLL_INTERVAL_MS = 3000;
const MAX_POLLING_MS = 2 * 60 * 1000;

/** Há quanto tempo a execução começou, para parar a consulta periódica depois do limite. */
function elapsedMs(run: SyncRun): number {
  return Date.now() - new Date(run.startedAt).getTime();
}

function isPolling(run: SyncRun | null | undefined): boolean {
  return run?.status === 'running' && elapsedMs(run) < MAX_POLLING_MS;
}

export function useConnections() {
  return useQuery({ queryKey: CONNECTIONS_KEY, queryFn: listConnections });
}

/** As conexões que pararam de sincronizar (erro ou consentimento expirado). */
export function findBrokenConnections(connections: readonly Connection[]): Connection[] {
  return connections.filter((connection) => isConnectionBroken(connection.status));
}

/**
 * Status da última sincronização e o disparo manual. Enquanto uma execução está `running`
 * (disparada aqui ou pela agenda), consulta a API a cada 3 s; ao terminar, avisa e recarrega
 * todas as consultas da tela.
 */
export function useSync(onNotice: (notice: Notice) => void) {
  const queryClient = useQueryClient();
  const previousStatus = useRef<SyncRun['status'] | null>(null);

  const latestRunQuery = useQuery({
    queryKey: LATEST_SYNC_RUN_KEY,
    queryFn: getLatestSyncRun,
    refetchInterval: ({ state }) => (isPolling(state.data) ? POLL_INTERVAL_MS : false),
  });
  const latestRun = latestRunQuery.data ?? null;

  const startMutation = useMutation({
    mutationFn: startSyncRun,
    onSuccess: (run) => queryClient.setQueryData(LATEST_SYNC_RUN_KEY, run),
    onError: (error) => {
      if (error instanceof ApiError && error.code === SYNC_IN_PROGRESS_CODE) {
        // Já tem uma sincronização rodando (por exemplo, a agendada): passa a acompanhá-la.
        void queryClient.invalidateQueries({ queryKey: LATEST_SYNC_RUN_KEY });
        return;
      }
      onNotice(SYNC_START_FAILED_NOTICE);
    },
  });

  const status = latestRun?.status ?? null;
  useEffect(() => {
    const wasRunning = previousStatus.current === 'running';
    previousStatus.current = status;
    if (!wasRunning || !latestRun || status === 'running') return;
    const outcome = describeSyncOutcome(latestRun);
    if (outcome) onNotice(outcome);
    void queryClient.invalidateQueries();
  }, [status, latestRun, onNotice, queryClient]);

  const runningSince = status === 'running' ? latestRun?.startedAt : undefined;
  useEffect(() => {
    if (!runningSince) return undefined;
    const remainingMs = MAX_POLLING_MS - (Date.now() - new Date(runningSince).getTime());
    const timer = window.setTimeout(() => onNotice(SYNC_TAKING_TOO_LONG_NOTICE), remainingMs);
    return () => window.clearTimeout(timer);
  }, [runningSince, onNotice]);

  return {
    latestRun,
    isLoading: latestRunQuery.isPending,
    isError: latestRunQuery.isError,
    isSyncing: startMutation.isPending || status === 'running',
    startSync: () => startMutation.mutate(),
  };
}
