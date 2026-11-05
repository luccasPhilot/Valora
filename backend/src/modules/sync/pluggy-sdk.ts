import { PluggyClient as PluggyApiClient } from 'pluggy-sdk';

import type { TransactionWindow } from './sync.types.js';

const INVESTMENTS_PAGE_SIZE = 500;

export interface PluggyCredentials {
  readonly pluggyClientId: string;
  readonly pluggyClientSecret: string;
}

/**
 * As únicas chamadas que o Valora faz ao Pluggy. Todas são de leitura: o cliente de pagamentos do
 * SDK fica inalcançável. As respostas saem como `unknown` porque o PluggyClient valida tudo com Zod.
 */
export interface PluggySdk {
  fetchItem(itemId: string): Promise<unknown>;
  fetchAccounts(itemId: string): Promise<unknown>;
  fetchAllTransactions(accountId: string, window: TransactionWindow): Promise<unknown>;
  fetchInvestmentsPage(itemId: string, page: number): Promise<unknown>;
}

export function createPluggySdk(credentials: PluggyCredentials): PluggySdk {
  const apiClient = new PluggyApiClient({
    clientId: credentials.pluggyClientId,
    clientSecret: credentials.pluggyClientSecret,
  });
  return {
    fetchItem: (itemId) => apiClient.fetchItem(itemId),
    fetchAccounts: (itemId) => apiClient.fetchAccounts(itemId),
    fetchAllTransactions: (accountId, window) =>
      apiClient.fetchAllTransactions(accountId, { dateFrom: window.from, dateTo: window.to }),
    fetchInvestmentsPage: (itemId, page) =>
      apiClient.fetchInvestments(itemId, undefined, { page, pageSize: INVESTMENTS_PAGE_SIZE }),
  };
}
