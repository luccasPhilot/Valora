import {
  listTransactions,
  MAX_TRANSACTION_PAGE_SIZE,
  type Transaction,
  type TransactionQuery,
} from '@/lib/api/transactions';

/** Acima disso a exportação pede para estreitar o filtro: 100 páginas já levam um bom tempo no celular. */
export const MAX_EXPORTED_TRANSACTIONS = 10_000;

const FIRST_PAGE = 1;

export interface ExportProgress {
  readonly loadedCount: number;
  readonly totalCount: number;
}

export interface FetchForExportOptions {
  readonly signal: AbortSignal;
  readonly onProgress: (progress: ExportProgress) => void;
}

export type FetchForExportResult =
  | { readonly status: 'done'; readonly transactions: readonly Transaction[] }
  | { readonly status: 'too_many'; readonly totalCount: number }
  | { readonly status: 'canceled' };

/**
 * Todas as transações do filtro, página por página (as páginas cheias da API). O cancelamento vale
 * entre uma página e outra; a página que já estava a caminho é descartada.
 */
export async function fetchTransactionsForExport(
  query: TransactionQuery,
  { signal, onProgress }: FetchForExportOptions,
): Promise<FetchForExportResult> {
  const transactions: Transaction[] = [];
  for (let page = FIRST_PAGE; ; page++) {
    const { items, pagination } = await listTransactions(query, page, MAX_TRANSACTION_PAGE_SIZE);
    if (signal.aborted) return { status: 'canceled' };
    if (pagination.total > MAX_EXPORTED_TRANSACTIONS) {
      return { status: 'too_many', totalCount: pagination.total };
    }
    transactions.push(...items);
    onProgress({ loadedCount: transactions.length, totalCount: pagination.total });
    // A página vazia também encerra: uma transação excluída no meio não deixa o laço girando.
    const isLastPage = items.length === 0 || transactions.length >= pagination.total;
    if (isLastPage) return { status: 'done', transactions };
  }
}
