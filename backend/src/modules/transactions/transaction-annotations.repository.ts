import { eq, sql } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { transactions, transactionTags } from '../../db/schema.js';

export interface NoteValue {
  readonly note: string | null;
  readonly noteNormalized: string | null;
}

export interface AnnotationChanges {
  readonly note?: NoteValue;
  /** A lista inteira que a transação passa a ter. */
  readonly tagIds?: readonly string[];
}

/** Nota e etiquetas de uma transação, de qualquer origem: nunca tocam nos dados do banco. */
export class TransactionAnnotationsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Nota e etiquetas mudam juntas ou nenhuma muda. */
  async apply(transactionId: string, changes: AnnotationChanges): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (changes.note) {
        await tx
          .update(transactions)
          .set({ ...changes.note, updatedAt: new Date() })
          .where(eq(transactions.id, transactionId));
      }
      if (changes.tagIds) {
        await tx.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId));
        if (changes.tagIds.length > 0) {
          await tx
            .insert(transactionTags)
            .values(changes.tagIds.map((tagId) => ({ transactionId, tagId })));
        }
        await tx
          .update(transactions)
          .set({ updatedAt: sql`now()` })
          .where(eq(transactions.id, transactionId));
      }
    });
  }
}
