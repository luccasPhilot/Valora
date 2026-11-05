import { and, asc, eq, gt, inArray } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { accounts, transactions } from '../../db/schema.js';
import {
  AUTOMATIC_SOURCES,
  type CategorizableTransaction,
  type CategorySource,
} from './category-decision.js';

const categorySourceSchema = z.enum(['user', 'rule', 'pluggy', 'none']);

export interface TransactionToCategorize extends CategorizableTransaction {
  readonly id: string;
}

export interface BatchQuery {
  readonly connectionId?: string;
  readonly afterId: string | null;
  readonly limit: number;
}

export interface CategoryAssignment {
  readonly transactionIds: readonly string[];
  readonly categoryId: string | null;
  readonly source: CategorySource;
}

/** Acesso às transações só para categorizar: lê as que podem mudar e grava a decisão. */
export class CategorizationRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Próximo lote (ordenado por id) de transações que não têm categoria escolhida por você. */
  async findAutomaticBatch(query: BatchQuery): Promise<TransactionToCategorize[]> {
    const conditions = [inArray(transactions.categorySource, [...AUTOMATIC_SOURCES])];
    if (query.afterId !== null) conditions.push(gt(transactions.id, query.afterId));
    if (query.connectionId) {
      const connectionAccounts = this.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.connectionId, query.connectionId));
      conditions.push(inArray(transactions.accountId, connectionAccounts));
    }
    const rows = await this.db
      .select({
        id: transactions.id,
        descriptionNormalized: transactions.descriptionNormalized,
        pluggyCategory: transactions.pluggyCategory,
        categoryId: transactions.categoryId,
        categorySource: transactions.categorySource,
      })
      .from(transactions)
      .where(and(...conditions))
      .orderBy(asc(transactions.id))
      .limit(query.limit);
    return rows.map((row) => ({
      ...row,
      categorySource: categorySourceSchema.parse(row.categorySource),
    }));
  }

  /** Grava a decisão só nas que ainda não têm categoria do usuário (a trava vale mesmo numa corrida). */
  async assign(assignment: CategoryAssignment): Promise<void> {
    await this.db
      .update(transactions)
      .set({
        categoryId: assignment.categoryId,
        categorySource: assignment.source,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(transactions.id, [...assignment.transactionIds]),
          inArray(transactions.categorySource, [...AUTOMATIC_SOURCES]),
        ),
      );
  }

  async findDescriptionNormalized(transactionId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ descriptionNormalized: transactions.descriptionNormalized })
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    return row?.descriptionNormalized ?? null;
  }
}
