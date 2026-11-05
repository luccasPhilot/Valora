import { z } from 'zod';

import { apiGet, apiPatch } from '../api-client';

// Contrato de /transactions e /accounts. O backend é o dono; estes schemas são a cópia do front
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
});

const transactionPageSchema = z.object({
  items: z.array(transactionSchema),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
});

const accountOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash']),
  institutionName: z.string().nullable(),
});
const accountOptionListSchema = z.object({ items: z.array(accountOptionSchema) });

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionPage = z.infer<typeof transactionPageSchema>;
export type AccountOption = z.infer<typeof accountOptionSchema>;

export interface TransactionQuery {
  readonly from?: string;
  readonly to?: string;
  readonly categoryId?: string;
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly search?: string;
}

export interface CategoryChange {
  readonly categoryId: string;
  readonly applyAlways: boolean;
}

function toQueryString(query: TransactionQuery, page: number): string {
  const params = new URLSearchParams({ page: String(page), limit: String(TRANSACTION_PAGE_SIZE) });
  for (const [name, value] of Object.entries(query)) {
    if (value) params.set(name, value);
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

// Sem paginação: são poucas contas (no máximo 5 bancos).
export async function listAccounts(): Promise<AccountOption[]> {
  return (await apiGet('/accounts', accountOptionListSchema)).items;
}
