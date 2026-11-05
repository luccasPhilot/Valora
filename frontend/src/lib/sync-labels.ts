import type { Notice } from '@/hooks/use-notice';

import type { SyncRun } from './api/sync';
import { formatMoment } from './format';

export const SYNCING_TEXT = 'Sincronizando…';
export const NEVER_SYNCED_TEXT = 'Nunca sincronizado';
export const SYNC_UNKNOWN_TEXT = 'Atualizar agora';
export const SYNC_FAILED_TEXT = 'Falha na atualização';
export const SYNC_TAKING_TOO_LONG_NOTICE: Notice = {
  tone: 'error',
  message: 'A sincronização está demorando mais que o normal',
};
export const SYNC_START_FAILED_NOTICE: Notice = {
  tone: 'error',
  message: 'Não foi possível iniciar a sincronização',
};

/** O texto do status no topo: "Atualizado hoje, 07:02", "Sincronizando…" ou "Nunca sincronizado". */
export function describeSyncStatus(
  run: SyncRun | null,
  isSyncing: boolean,
  now: Date = new Date(),
): string {
  if (isSyncing) return SYNCING_TEXT;
  if (!run) return NEVER_SYNCED_TEXT;
  if (run.status === 'failed') return SYNC_FAILED_TEXT;
  return `Atualizado ${formatMoment(new Date(run.finishedAt ?? run.startedAt), now)}`;
}

function describeNewTransactions(count: number): string {
  if (count === 0) return 'nenhuma transação nova';
  return count === 1 ? '1 transação nova' : `${count} transações novas`;
}

/** O aviso de quando uma sincronização termina; nulo enquanto ela ainda roda. */
export function describeSyncOutcome(run: SyncRun): Notice | null {
  switch (run.status) {
    case 'running':
      return null;
    case 'success':
      return {
        tone: 'success',
        message: `Sincronização concluída: ${describeNewTransactions(run.stats?.transactionsInserted ?? 0)}`,
      };
    case 'partial':
      return { tone: 'error', message: 'Sincronização concluída, mas algum banco falhou' };
    case 'failed':
      return { tone: 'error', message: 'A sincronização falhou. Tente de novo mais tarde' };
  }
}
