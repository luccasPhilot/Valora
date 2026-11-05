import { and, eq } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { transactions } from '../../db/schema.js';

export interface NewManualTransaction {
  readonly accountId: string;
  readonly categoryId: string;
  readonly date: string;
  readonly description: string;
  readonly descriptionNormalized: string;
  /** Já com o sinal: negativo para despesa. */
  readonly amountCents: number;
}

export type ManualTransactionChanges = Partial<NewManualTransaction>;

export class TransactionsWriteRepository {
  constructor(private readonly db: DbExecutor) {}

  async insertManual(values: NewManualTransaction): Promise<string> {
    const [row] = await this.db
      .insert(transactions)
      .values({
        ...values,
        source: 'manual',
        status: 'posted',
        categorySource: 'user',
        pluggyTransactionId: null,
        raw: null,
      })
      .returning({ id: transactions.id });
    if (!row) throw new Error('A transação manual não foi gravada');
    return row.id;
  }

  /** O filtro `source = 'manual'` é a última defesa: uma transação do banco nunca é alterada aqui. */
  async updateManual(transactionId: string, changes: ManualTransactionChanges): Promise<boolean> {
    const rows = await this.db
      .update(transactions)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(transactions.id, transactionId), eq(transactions.source, 'manual')))
      .returning({ id: transactions.id });
    return rows.length > 0;
  }

  async deleteManual(transactionId: string): Promise<boolean> {
    const rows = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.source, 'manual')))
      .returning({ id: transactions.id });
    return rows.length > 0;
  }
}
