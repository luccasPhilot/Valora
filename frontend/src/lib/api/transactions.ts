import { z } from 'zod';

import { apiDelete, apiGet, apiPatch, apiPost } from '../api-client';

// Contrato de /transactions. O backend é o dono; estes schemas são a cópia do front
// (docs/03-arquitetura.md, "Contrato da API").

export const TRANSACTION_PAGE_SIZE = 50;

const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const TRANSACTION_TYPES: readonly TransactionType[] = transactionTypeSchema.options;

const transactionSchema = z.object({
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
});

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

export interface TransactionQuery {
  readonly from?: string;
  readonly to?: string;
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

function toQueryString(query: TransactionQuery, page: number): string {
  const params = new URLSearchParams({ page: String(page), limit: String(TRANSACTION_PAGE_SIZE) });
  for (const [name, value] of Object.entries(query)) {
    if (value) params.set(name, String(value));
  }
  return params.toString();
}

export function listTransactions(query: TransactionQuery, page: number): Promise<TransactionPage> {
  return apiGet(`/transactions?${toQueryString(query, page)}`, transactionPageSchema);
}

export function changeTransactionCategory(
  transactionId: string,
  change: CategoryChange,
): Promise<Transaction> {
  return apiPatch(`/transactions/${transactionId}`, change, transactionSchema);
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
