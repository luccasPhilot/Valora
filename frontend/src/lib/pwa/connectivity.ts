import { useSyncExternalStore } from 'react';

import { CACHED_AT_HEADER } from './cache-rules';

/** Por que "Sincronizar" e os botões de salvar ficam desabilitados, e o que aparece quando uma escrita falha. */
export const OFFLINE_ACTION_HINT = 'Sem conexão: esta ação precisa de internet.';

export interface ConnectivityState {
  /** O que o navegador diz (`navigator.onLine`). Com a Tailscale desligada ele continua `true`. */
  readonly isOnline: boolean;
  /** A última chamada à API não chegou ao servidor (rede ruim, Tailscale desligada, servidor fora). */
  readonly isServerUnreachable: boolean;
  /** Quando foram obtidos os dados da última leitura, se ela veio do cache do service worker. */
  readonly cachedAt: Date | null;
  /** Uma escrita falhou na hora por falta de rede: o aviso explica que a ação precisa de internet. */
  readonly hasBlockedWrite: boolean;
}

function readInitialState(): ConnectivityState {
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  return { isOnline, isServerUnreachable: false, cachedAt: null, hasBlockedWrite: false };
}

let state: ConnectivityState = readInitialState();
const listeners = new Set<() => void>();

function update(changes: Partial<ConnectivityState>): void {
  const next = { ...state, ...changes };
  const hasChanged = (Object.keys(next) as (keyof ConnectivityState)[]).some(
    (key) => next[key] !== state[key],
  );
  if (!hasChanged) return;
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parseCachedAt(value: string | null): Date | null {
  if (value === null) return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** O servidor respondeu (mesmo com erro HTTP). Numa leitura, a resposta diz se veio do cache. */
export function recordApiResponse(method: string, headers: Headers): void {
  if (method === 'GET') {
    update({
      isServerUnreachable: false,
      cachedAt: parseCachedAt(headers.get(CACHED_AT_HEADER)),
    });
    return;
  }
  update({ isServerUnreachable: false, hasBlockedWrite: false });
}

/** A chamada nem chegou ao servidor. Uma escrita que falha assim nunca fica em fila. */
export function recordApiNetworkFailure(method: string): void {
  update({ isServerUnreachable: true, ...(method === 'GET' ? {} : { hasBlockedWrite: true }) });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => update({ isOnline: true, hasBlockedWrite: false }));
  window.addEventListener('offline', () => update({ isOnline: false }));
}

export function useConnectivity(): ConnectivityState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Sem rede segundo o navegador: é quando "Sincronizar" e os botões de salvar ficam desabilitados. */
export function useIsOffline(): boolean {
  return !useConnectivity().isOnline;
}

/** Só para os testes: volta ao estado de quem acabou de abrir o app com rede. */
export function resetConnectivityForTests(): void {
  update({ isOnline: true, isServerUnreachable: false, cachedAt: null, hasBlockedWrite: false });
}
