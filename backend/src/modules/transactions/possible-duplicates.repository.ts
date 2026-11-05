import {
  and,
  asc,
  eq,
  exists,
  inArray,
  notExists,
  type SQL,
  sql,
  type SQLWrapper,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { DbExecutor } from '../../db/database.js';
import { transactions } from '../../db/schema.js';

/** Quantos dias de diferença ainda contam como "a mesma compra" (docs/01-produto.md). */
export const DUPLICATE_WINDOW_DAYS = 3;

export interface DuplicateCandidate {
  readonly id: string;
  readonly accountId: string;
  readonly amountCents: number;
  readonly date: string;
}

/** Cada campo é um valor ou uma coluna da consulta de fora (usado dentro de um `exists`). */
interface MatchTarget {
  readonly accountId: SQLWrapper | string;
  readonly amountCents: SQLWrapper | number;
  readonly date: SQLWrapper | string;
}

const manual = alias(transactions, 'manual');
const claimant = alias(transactions, 'claimant');

export class PossibleDuplicatesRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Das transações do banco recém-inseridas, só as que têm alguma manual livre parecida. */
  async findCandidates(insertedIds: readonly string[]): Promise<DuplicateCandidate[]> {
    if (insertedIds.length === 0) return [];
    const target: MatchTarget = {
      accountId: transactions.accountId,
      amountCents: transactions.amountCents,
      date: transactions.date,
    };
    return this.db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        amountCents: transactions.amountCents,
        date: transactions.date,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.id, [...insertedIds]),
          exists(
            this.db
              .select({ one: sql`1` })
              .from(manual)
              .where(this.matchingFreeManual(target)),
          ),
        ),
      )
      .orderBy(asc(transactions.date), asc(transactions.createdAt), asc(transactions.id));
  }

  /** A de data mais próxima; em empate, a lançada primeiro. */
  async findClosestFreeManual(candidate: DuplicateCandidate): Promise<string | null> {
    const [row] = await this.db
      .select({ id: manual.id })
      .from(manual)
      .where(this.matchingFreeManual(candidate))
      .orderBy(
        sql`abs(${manual.date} - ${candidate.date}::date)`,
        asc(manual.createdAt),
        asc(manual.id),
      )
      .limit(1);
    return row?.id ?? null;
  }

  async mark(transactionId: string, manualId: string): Promise<void> {
    await this.db
      .update(transactions)
      .set({ possibleDuplicateOfId: manualId })
      .where(eq(transactions.id, transactionId));
  }

  /** `null` se a transação não existe; senão, a manual apontada (ou `null` se nada está pendente). */
  async findPendingManualId(
    transactionId: string,
  ): Promise<{ readonly manualId: string | null } | null> {
    const [row] = await this.db
      .select({ manualId: transactions.possibleDuplicateOfId })
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    return row ?? null;
  }

  async clearMark(transactionId: string): Promise<void> {
    await this.db
      .update(transactions)
      .set({ possibleDuplicateOfId: null })
      .where(eq(transactions.id, transactionId));
  }

  /** Numa transação de banco só: a do banco fica com a categoria da manual e a manual some. */
  async merge(transactionId: string, manualId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [manualRow] = await tx
        .select({ categoryId: transactions.categoryId })
        .from(transactions)
        .where(eq(transactions.id, manualId));
      const inheritedCategory = manualRow?.categoryId
        ? { categoryId: manualRow.categoryId, categorySource: 'user' }
        : {};
      await tx
        .update(transactions)
        .set({ ...inheritedCategory, possibleDuplicateOfId: null, updatedAt: new Date() })
        .where(eq(transactions.id, transactionId));
      await tx
        .delete(transactions)
        .where(and(eq(transactions.id, manualId), eq(transactions.source, 'manual')));
    });
  }

  /** Mesma conta, mesmo valor, até 3 dias de diferença, e ainda não apontada por outra transação. */
  private matchingFreeManual(target: MatchTarget): SQL | undefined {
    return and(
      eq(manual.source, 'manual'),
      eq(manual.accountId, target.accountId),
      eq(manual.amountCents, target.amountCents),
      sql`abs(${manual.date} - ${target.date}::date) <= ${DUPLICATE_WINDOW_DAYS}`,
      notExists(
        this.db
          .select({ one: sql`1` })
          .from(claimant)
          .where(eq(claimant.possibleDuplicateOfId, manual.id)),
      ),
    );
  }
}
