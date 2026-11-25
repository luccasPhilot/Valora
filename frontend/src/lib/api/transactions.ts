import { z } from 'zod';

import { apiDelete, apiGet, apiPatch, apiPost } from '../api-client';
import { ruleSuggestionSchema } from './categories';

// Contrato de /transactions. O backend é o dono; estes schemas são a cópia do front
// (docs/03-arquitetura.md, "Contrato da API").

export const TRANSACTION_PAGE_SIZE = 50;
export const MAX_TRANSACTION_PAGE_SIZE = 100;

const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const TRANSACTION_TYPES: readonly TransactionType[] = transactionTypeSchema.options;

export const transactionSchema = z.object({
  id: z.uuid(),
  date: z.iso.date(),
  description: z.string(),
  amountCents: z.int(),
  status: z.enum(['pending', 'posted']),
  source: z.enum(['open_finance', 'manual']),
  category: z
    .object({
      id: z.uuid(),
      name: z.string(),
      icon: z.string(),
      kind: z.enum(['expense', 'income', 'transfer']),
    })
    .nullable(),
  categorySource: z.enum(['user', 'rule', 'pluggy', 'none']),
  account: z.object({
    id: z.uuid(),
    name: z.string(),
    type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
  }),
  installmentNumber: z.int().nullable(),
  installmentTotal: z.int().nullable(),
  /** Na transação do banco marcada como possível duplicata: o id da manual parecida. */
  possibleDuplicateOfId: z.uuid().nullable(),
});

const transactionPageSchema = z.object({
  items: z.array(transactionSchema),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
  /** Instante do servidor em que a página foi lida: o limite de "Marcar tudo como revisado". */
  loadedAt: z.iso.datetime(),
});

/** Depois de trocar a categoria: a transação e a regra sugerida para a descrição, se houver. */
const transactionUpdateSchema = transactionSchema.extend({
  ruleSuggestion: ruleSuggestionSchema.nullable(),
});

const reviewCountSchema = z.object({ count: z.int() });
const reviewedCountSchema = z.object({ reviewedCount: z.int() });
const bulkCategorySchema = z.object({
  updatedCount: z.int(),
  ruleSuggestion: ruleSuggestionSchema.nullable(),
});

/** Revisar ou trocar a categoria de até 100 transações por vez (o limite da API). */
export const MAX_BULK_TRANSACTIONS = 100;

const transactionSummarySchema = z.object({
  incomeCents: z.int(),
  /** Positivo, como no Início. */
  expenseCents: z.int(),
  count: z.int(),
});

export type TransactionSummary = z.infer<typeof transactionSummarySchema>;

/** Conta como opção de filtro e de formulário; vem de `/accounts` (lib/api/accounts.ts). */
export interface AccountOption {
  readonly id: string;
  readonly name: string;
  readonly type: 'checking' | 'savings' | 'credit_card' | 'cash';
  readonly institutionName: string | null;
}

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionSource = Transaction['source'];
export type TransactionPage = z.infer<typeof transactionPageSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;
export type BulkCategoryResult = z.infer<typeof bulkCategorySchema>;

export const UNCATEGORIZED_FILTER = 'none';

export interface TransactionQuery {
  readonly from?: string;
  readonly to?: string;
  /** Id da categoria, ou `UNCATEGORIZED_FILTER` para as sem categoria. */
  readonly categoryId?: string;
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly source?: TransactionSource;
  readonly possibleDuplicate?: boolean;
  readonly search?: string;
}

/** Lançamento manual: o valor é sempre positivo, e o sinal vem do tipo (a API grava a despesa negativa). */
export interface TransactionInput {
  readonly type: 'income' | 'expense';
  readonly amountCents: number;
  readonly description: string;
  readonly date: string;
  readonly categoryId: string;
  readonly accountId: string;
}

export type DuplicateResolution = 'merge' | 'keep_both';

export interface CategoryChange {
  readonly categoryId: string;
  readonly applyAlways: boolean;
}

function toQueryString(query: TransactionQuery, params = new URLSearchParams()): string {
  for (const [name, value] of Object.entries(query)) {
    if (value) params.set(name, String(value));
  }
  return params.toString();
}

/** `limit` vai até `MAX_TRANSACTION_PAGE_SIZE`, o máximo da API (a exportação pede páginas cheias). */
export function listTransactions(
  query: TransactionQuery,
  page: number,
  limit = TRANSACTION_PAGE_SIZE,
): Promise<TransactionPage> {
  const pagination = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiGet(`/transactions?${toQueryString(query, pagination)}`, transactionPageSchema);
}

/** Receita e despesa (sem transferências) e quantidade de todo o filtro, não só da página carregada. */
export function getTransactionSummary(query: TransactionQuery): Promise<TransactionSummary> {
  return apiGet(`/transactions/summary?${toQueryString(query)}`, transactionSummarySchema);
}

export function changeTransactionCategory(
  transactionId: string,
  change: CategoryChange,
): Promise<TransactionUpdate> {
  return apiPatch(`/transactions/${transactionId}`, change, transactionUpdateSchema);
}

/** Do Open Finance e manuais: todas ficam com a categoria escolhida por você e revisadas. */
export function changeCategoryOfMany(
  transactionIds: readonly string[],
  categoryId: string,
): Promise<BulkCategoryResult> {
  return apiPatch('/transactions/category', { transactionIds, categoryId }, bulkCategorySchema);
}

/** A caixa "Para revisar": as não revisadas de qualquer período, da mais antiga para a mais nova. */
export function listReviewInbox(page: number): Promise<TransactionPage> {
  const params = new URLSearchParams({
    reviewed: 'false',
    page: String(page),
    limit: String(TRANSACTION_PAGE_SIZE),
  });
  return apiGet(`/transactions?${params.toString()}`, transactionPageSchema);
}

export async function getReviewCount(): Promise<number> {
  return (await apiGet('/transactions/review-count', reviewCountSchema)).count;
}

/** Devolve quantas foram marcadas agora (as já revisadas e os ids que não existem não contam). */
export async function reviewTransactions(transactionIds: readonly string[]): Promise<number> {
  const body = { transactionIds };
  return (await apiPost('/transactions/review', body, reviewedCountSchema)).reviewedCount;
}

/** `until` é o `loadedAt` da caixa: o que chegou depois de ela carregar continua para revisar. */
export async function reviewAllTransactions(until: string): Promise<number> {
  return (await apiPost('/transactions/review-all', { until }, reviewedCountSchema)).reviewedCount;
}

export function getTransaction(transactionId: string): Promise<Transaction> {
  return apiGet(`/transactions/${transactionId}`, transactionSchema);
}

export function createTransaction(input: TransactionInput): Promise<Transaction> {
  return apiPost('/transactions', input, transactionSchema);
}

/** Só vale para transação manual: na do banco, a API recusa tudo além da categoria. */
export function updateTransaction(
  transactionId: string,
  input: TransactionInput,
): Promise<Transaction> {
  return apiPatch(`/transactions/${transactionId}`, input, transactionSchema);
}

export function deleteTransaction(transactionId: string): Promise<void> {
  return apiDelete(`/transactions/${transactionId}`);
}

export function resolveDuplicate(
  transactionId: string,
  action: DuplicateResolution,
): Promise<Transaction> {
  return apiPost(
    `/transactions/${transactionId}/duplicate-resolution`,
    { action },
    transactionSchema,
  );
}

/**
 * Quantas possíveis duplicatas esperam conferência, em qualquer período: a lista sem data inicial
 * nem final cairia no mês atual, então vai só a data final (hoje), que desliga esse padrão.
 */
export async function countPossibleDuplicates(today: string): Promise<number> {
  const params = new URLSearchParams({
    page: '1',
    limit: '1',
    possibleDuplicate: 'true',
    to: today,
  });
  const page = await apiGet(`/transactions?${params.toString()}`, transactionPageSchema);
  return page.pagination.total;
}
