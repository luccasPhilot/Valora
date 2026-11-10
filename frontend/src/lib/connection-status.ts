import type { ConnectionStatus } from './api/accounts';

/** Conexão que parou de sincronizar (erro, consentimento vencido ou banco removido do Meu Pluggy). */
export function isConnectionBroken(status: ConnectionStatus): boolean {
  return status === 'error' || status === 'consent_expired' || status === 'item_not_found';
}

/** Por que o banco ficou órfão: o Pluggy não o conhece mais, ou o id saiu da lista de sincronização. */
export type OrphanCause = 'removed_from_pluggy' | 'not_in_sync_list';

interface OrphanCheck {
  readonly status: ConnectionStatus;
  readonly isConfigured: boolean;
}

/** `removed_from_pluggy` vale primeiro (é a causa mais informativa); nulo se o banco não é órfão. */
export function orphanCauseOf(connection: OrphanCheck): OrphanCause | null {
  if (connection.status === 'item_not_found') return 'removed_from_pluggy';
  return connection.isConfigured ? null : 'not_in_sync_list';
}
