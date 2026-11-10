import { z } from 'zod';

import { ApiError, apiGet, apiPatch, apiPost } from '../api-client';
import { connectionStatusSchema } from './accounts';

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
  status: connectionStatusSchema,
  statusDetail: z.string().nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
  /** O id do banco está no `PLUGGY_ITEM_IDS` do servidor. Falso = a sincronização nem olha para ele. */
  isConfigured: z.boolean(),
  /** Nulo nos bancos ativos. */
  archivedAt: z.iso.datetime().nullable(),
  accounts: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
      lastDigits: z.string().nullable(),
    }),
  ),
});
const connectionListSchema = z.object({ items: z.array(connectionSchema) });

export type SyncRun = z.infer<typeof syncRunSchema>;
export type SyncRunStatus = SyncRun['status'];
export type Connection = z.infer<typeof connectionSchema>;

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
/** Os bancos ativos. */
export async function listConnections(): Promise<Connection[]> {
  return (await apiGet('/connections', connectionListSchema)).items;
}

/** Os bancos arquivados, com as contas deles. */
export async function listArchivedConnections(): Promise<Connection[]> {
  return (await apiGet('/connections?archived=true', connectionListSchema)).items;
}

/** Arquiva (ou, com `false`, reativa) o banco inteiro. Nada é apagado. */
export function setConnectionArchived(
  connectionId: string,
  isArchived: boolean,
): Promise<Connection> {
  return apiPatch(`/connections/${connectionId}`, { isArchived }, connectionSchema);
}
