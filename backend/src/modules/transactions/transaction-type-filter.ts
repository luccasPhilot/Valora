import { type SQL, sql } from 'drizzle-orm';

import { categories, transactions } from '../../db/schema.js';

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Condição do tipo da transação, para consultas que juntam `transactions` com `categories`
 * (left join). A categoria decide a transferência; fora dela, o sinal do valor decide. Reutilizada
 * por orçamentos e pela tela inicial para que "despesa" signifique o mesmo em todo lugar.
 */
export function transactionTypeCondition(type: TransactionType): SQL {
  // `is distinct from` trata a categoria nula (sem categoria) como "não é transferência".
  const isNotTransfer = sql`${categories.kind} is distinct from 'transfer'`;
  switch (type) {
    case 'transfer':
      return sql`${categories.kind} = 'transfer'`;
    case 'expense':
      return sql`(${transactions.amountCents} < 0 and ${isNotTransfer})`;
    case 'income':
      return sql`(${transactions.amountCents} > 0 and ${isNotTransfer})`;
  }
}
