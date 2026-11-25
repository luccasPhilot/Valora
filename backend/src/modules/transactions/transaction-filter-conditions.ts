import { eq, gte, ilike, inArray, isNotNull, isNull, lte, type SQL } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import { accounts, connections, transactions } from '../../db/schema.js';
import { accountIsOfActiveConnection } from '../connections/active-connection.js';
import { type TransactionType, transactionTypeCondition } from './transaction-type-filter.js';

export const transactionSourceSchema = z.enum(['open_finance', 'manual']);
export type TransactionSource = z.infer<typeof transactionSourceSchema>;

/** Valor de `categoryId` que lista só as transações sem categoria. */
export const UNCATEGORIZED_FILTER = 'none';

export interface TransactionFilters {
  readonly from?: string;
  readonly to?: string;
  /** Id da categoria, ou `UNCATEGORIZED_FILTER` para as sem categoria. */
  readonly categoryId?: string;
  readonly type?: TransactionType;
  readonly accountId?: string;
  readonly source?: TransactionSource;
  /** `true` lista só as transações do banco com possível duplicata pendente. */
  readonly possibleDuplicate?: boolean;
  /** Já normalizado (sem acento, maiúsculo), como `description_normalized`. */
  readonly normalizedSearch?: string;
  /** `false` é a caixa "Para revisar"; `true`, só as já revisadas. */
  readonly reviewed?: boolean;
}

/**
 * A caixa "Para revisar": não revisadas, de bancos ativos ou manuais. Um banco arquivado sai da
 * caixa e do contador, mas as transações dele continuam na lista.
 */
export function unreviewedInboxConditions(): SQL[] {
  const activeAccountIds = new QueryBuilder()
    .select({ id: accounts.id })
    .from(accounts)
    .leftJoin(connections, eq(connections.id, accounts.connectionId))
    .where(accountIsOfActiveConnection);
  return [isNull(transactions.reviewedAt), inArray(transactions.accountId, activeAccountIds)];
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
  if (filters.categoryId === UNCATEGORIZED_FILTER) {
    conditions.push(isNull(transactions.categoryId));
  } else if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }
  if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.type) conditions.push(transactionTypeCondition(filters.type));
  if (filters.source) conditions.push(eq(transactions.source, filters.source));
  if (filters.possibleDuplicate) conditions.push(isNotNull(transactions.possibleDuplicateOfId));
  if (filters.reviewed === false) conditions.push(...unreviewedInboxConditions());
  if (filters.reviewed === true) conditions.push(isNotNull(transactions.reviewedAt));
  if (filters.normalizedSearch) {
    const pattern = `%${escapeLikePattern(filters.normalizedSearch)}%`;
    conditions.push(ilike(transactions.descriptionNormalized, pattern));
  }
  return conditions;
}
