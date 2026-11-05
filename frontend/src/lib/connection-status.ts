import type { ConnectionStatus } from './api/accounts';

/** Conexão que parou de sincronizar e só volta com você reconectando no Meu Pluggy. */
export function isConnectionBroken(status: ConnectionStatus): boolean {
  return status === 'error' || status === 'consent_expired';
}
