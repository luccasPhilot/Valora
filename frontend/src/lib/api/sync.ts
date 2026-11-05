import { z } from 'zod';

import { ApiError, apiGet, apiPost } from '../api-client';
import type { ConnectionStatus } from './accounts';

// Contrato de /sync-runs e /connections. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/sync/sync.routes.ts e backend/src/modules/connections/connections.routes.ts).

export const SYNC_IN_PROGRESS_CODE = 'SYNC_IN_PROGRESS';
const NOT_FOUND_STATUS = 404;

const syncRunSchema = z.object({
  id: z.uuid(),
  trigger: z.enum(['schedule', 'manual']),
  status: z.enum(['running', 'success', 'partial', 'failed']),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  stats: z.object({ transactionsInserted: z.int() }).nullable(),
});

const connectionSchema = z.object({
  id: z.uuid(),
  institutionName: z.string(),
  status: z.enum(['ok', 'syncing', 'error', 'consent_expired']),
  lastSyncedAt: z.iso.datetime().nullable(),
});
const connectionListSchema = z.object({ items: z.array(connectionSchema) });

export type SyncRun = z.infer<typeof syncRunSchema>;
export type SyncRunStatus = SyncRun['status'];
export interface Connection {
  readonly id: string;
  readonly institutionName: string;
  readonly status: ConnectionStatus;
  readonly lastSyncedAt: string | null;
}

/** Nulo quando ainda não houve nenhuma sincronização (a API responde 404). */
export async function getLatestSyncRun(): Promise<SyncRun | null> {
  try {
    return await apiGet('/sync-runs/latest', syncRunSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) return null;
    throw error;
  }
}

export function startSyncRun(): Promise<SyncRun> {
  return apiPost('/sync-runs', undefined, syncRunSchema);
}

// Sem paginação: o Meu Pluggy permite no máximo 5 conexões.
export async function listConnections(): Promise<Connection[]> {
  return (await apiGet('/connections', connectionListSchema)).items;
}
