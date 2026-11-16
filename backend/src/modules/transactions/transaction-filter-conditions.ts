import { eq, gte, ilike, isNotNull, lte, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import { transactions } from '../../db/schema.js';
import { type TransactionType, transactionTypeCondition } from './transaction-type-filter.js';

export const transactionSourceSchema = z.enum(['open_finance', 'manual']);
export type TransactionSource = z.infer<typeof transactionSourceSchema>;

export interface TransactionFilters {
  readonly from?: string;
  readonly to?: string;
  readonly categoryId?: string;
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly source?: TransactionSource;
  /** `true` lista só as transações do banco com possível duplicata pendente. */
  readonly possibleDuplicate?: boolean;
  /** Já normalizado (sem acento, maiúsculo), como `description_normalized`. */
  readonly normalizedSearch?: string;
}

/** `%` e `_` do termo digitado valem como texto, não como curinga do LIKE. */
function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Única definição dos filtros de transações: a lista e o resumo leem daqui, para nunca divergirem.
 * Para consultas que juntam `transactions` com `categories` (left join).
 */
export function buildConditions(filters: TransactionFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.from) conditions.push(gte(transactions.date, filters.from));
  if (filters.to) conditions.push(lte(transactions.date, filters.to));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.type) conditions.push(transactionTypeCondition(filters.type));
  if (filters.source) conditions.push(eq(transactions.source, filters.source));
  if (filters.possibleDuplicate) conditions.push(isNotNull(transactions.possibleDuplicateOfId));
  if (filters.normalizedSearch) {
    const pattern = `%${escapeLikePattern(filters.normalizedSearch)}%`;
    conditions.push(ilike(transactions.descriptionNormalized, pattern));
  }
  return conditions;
}
