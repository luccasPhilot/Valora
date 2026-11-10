import { and, eq, gte, lt } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { categories, transactions } from '../../db/schema.js';
import type { ChargeRow } from './detectors/charge-row.js';

export class AlertChargesRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Saídas postadas do Open Finance desde `since` (AAAA-MM-DD), só com as colunas que os detectores usam. */
  async findOutflowsSince(since: string): Promise<ChargeRow[]> {
    return this.db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        source: transactions.source,
        status: transactions.status,
        date: transactions.date,
        description: transactions.description,
        descriptionNormalized: transactions.descriptionNormalized,
        amountCents: transactions.amountCents,
        installmentTotal: transactions.installmentTotal,
        pluggyCategory: transactions.pluggyCategory,
        categoryKind: categories.kind,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.source, 'open_finance'),
          eq(transactions.status, 'posted'),
          lt(transactions.amountCents, 0),
          gte(transactions.date, since),
        ),
      );
  }
}
