import { PluggyClient as PluggyApiClient } from 'pluggy-sdk';

import { translateItemError } from './pluggy-errors.js';
import type { TransactionWindow } from './sync.types.js';

const INVESTMENTS_PAGE_SIZE = 500;
const BILLS_PAGE_SIZE = 100;

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
  fetchCreditCardBillsPage(accountId: string, page: number): Promise<unknown>;
}

async function withItemErrors<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    throw translateItemError(error);
  }
}

export function createPluggySdk(credentials: PluggyCredentials): PluggySdk {
  const apiClient = new PluggyApiClient({
    clientId: credentials.pluggyClientId,
    clientSecret: credentials.pluggyClientSecret,
  });
  // As chamadas por id de item traduzem "o item não existe" num erro tipado (veja pluggy-errors.ts).
  return {
    fetchItem: (itemId) => withItemErrors(apiClient.fetchItem(itemId)),
    fetchAccounts: (itemId) => withItemErrors(apiClient.fetchAccounts(itemId)),
    fetchAllTransactions: (accountId, window) =>
      apiClient.fetchAllTransactions(accountId, { dateFrom: window.from, dateTo: window.to }),
    fetchInvestmentsPage: (itemId, page) =>
      withItemErrors(
        apiClient.fetchInvestments(itemId, undefined, { page, pageSize: INVESTMENTS_PAGE_SIZE }),
      ),
    fetchCreditCardBillsPage: (accountId, page) =>
      apiClient.fetchCreditCardBills(accountId, { page, pageSize: BILLS_PAGE_SIZE }),
  };
}
