import { type SQL, sql } from 'drizzle-orm';

import { categories, transactions } from '../../db/schema.js';

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Condição do tipo da transação, para consultas que juntam `transactions` com `categories`
 * (left join). Reutilizada pelo Início, pelos relatórios e por Transações para que "despesa"
 * signifique o mesmo em todo lugar:
 * - a categoria de transferência decide a transferência;
 * - toda transação numa categoria de despesa é despesa, qualquer que seja o sinal: o estorno (entrada
 *   em "Compras") reduz a despesa, como nos gastos por categoria, e não vira receita;
 * - fora delas, o sinal decide (a saída numa categoria de receita continua despesa).
 */
export function transactionTypeCondition(type: TransactionType): SQL {
  // `is distinct from` trata a categoria nula (sem categoria) como "não é transferência".
  const isNotTransfer = sql`${categories.kind} is distinct from 'transfer'`;
  switch (type) {
    case 'transfer':
      return sql`${categories.kind} = 'transfer'`;
    case 'expense':
      return sql`(${categories.kind} = 'expense' or (${transactions.amountCents} < 0 and ${isNotTransfer}))`;
    case 'income':
      return sql`(${transactions.amountCents} > 0 and (${categories.kind} is null or ${categories.kind} = 'income'))`;
  }
}
