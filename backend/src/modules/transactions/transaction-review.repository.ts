import { and, count, inArray, isNull, lte, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { transactions } from '../../db/schema.js';
import { unreviewedInboxConditions } from './transaction-filter-conditions.js';

export class TransactionReviewRepository {
  constructor(private readonly db: DbExecutor) {}

  async countUnreviewed(): Promise<number> {
    const [counted] = await this.db
      .select({ total: count() })
      .from(transactions)
      .where(and(...unreviewedInboxConditions()));
    return counted?.total ?? 0;
  }

  /** Só as que existem e ainda não foram revisadas: repetir não muda nada. */
  async markReviewed(transactionIds: readonly string[]): Promise<number> {
    const rows = await this.db
      .update(transactions)
      .set({ reviewedAt: sql`now()` })
      .where(and(inArray(transactions.id, [...transactionIds]), isNull(transactions.reviewedAt)))
      .returning({ id: transactions.id });
    return rows.length;
  }

  /** As da caixa que já existiam em `until`; o que chegou depois continua para revisar. */
  async markInboxReviewedUntil(until: Date): Promise<number> {
    const rows = await this.db
      .update(transactions)
      .set({ reviewedAt: sql`now()` })
      .where(and(...unreviewedInboxConditions(), lte(transactions.createdAt, until)))
      .returning({ id: transactions.id });
    return rows.length;
  }
}
