import { and, asc, eq, gte, isNotNull, lte, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import {
  categories,
  plannedEntries,
  plannedEntryOccurrences,
  transactions,
} from '../../db/schema.js';
import { lastDayOfMonth } from '../../shared/dates.js';
import type { CandidateTransaction } from './match-candidates.js';
import type { Recurrence } from './occurrence-expansion.js';

const recurrenceSchema = z.enum(['none', 'monthly', 'yearly'] satisfies Recurrence[]);
const decisionStatusSchema = z.enum(['realized', 'skipped']);

export type { Recurrence };
export type DecisionStatus = z.infer<typeof decisionStatusSchema>;

/** O que o usuário informa. Meses são o dia 1 (AAAA-MM-01) e o valor tem sinal (negativo = despesa). */
export interface PlannedEntryFields {
  readonly description: string;
  readonly amountCents: number;
  readonly categoryId: string;
  readonly dayOfMonth: number;
  readonly recurrence: Recurrence;
  readonly startMonth: string;
  readonly endMonth: string | null;
  readonly isActive: boolean;
}

export interface PlannedEntryRecord extends PlannedEntryFields {
  readonly id: string;
  readonly categoryName: string;
  readonly categoryIcon: string;
}

export interface LinkedTransaction {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly amountCents: number;
}

export interface DecisionRecord {
  readonly plannedEntryId: string;
  readonly month: string;
  readonly status: DecisionStatus;
  readonly decidedAt: Date;
  /** Nulo quando foi realizada sem vínculo, ou quando a transação vinculada foi excluída. */
  readonly transaction: LinkedTransaction | null;
}

export interface DecisionInput {
  readonly plannedEntryId: string;
  readonly month: string;
  readonly status: DecisionStatus;
  readonly transactionId: string | null;
}

export interface TransactionLink {
  readonly plannedEntryId: string;
  readonly month: string;
}

export interface LinkableTransaction extends CandidateTransaction {
  readonly description: string;
}

const entryColumns = {
  id: plannedEntries.id,
  description: plannedEntries.description,
  amountCents: plannedEntries.amountCents,
  categoryId: plannedEntries.categoryId,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  dayOfMonth: plannedEntries.dayOfMonth,
  recurrence: plannedEntries.recurrence,
  startMonth: plannedEntries.startMonth,
  endMonth: plannedEntries.endMonth,
  isActive: plannedEntries.isActive,
};

function toEntryRecord(row: {
  [Key in keyof typeof entryColumns]: unknown;
}): PlannedEntryRecord {
  return {
    ...(row as Omit<PlannedEntryRecord, 'recurrence'>),
    recurrence: recurrenceSchema.parse(row.recurrence),
  };
}

export class PlannedEntriesRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(fields: PlannedEntryFields): Promise<string> {
    const [row] = await this.db
      .insert(plannedEntries)
      .values(fields)
      .returning({ id: plannedEntries.id });
    if (!row) throw new Error('A previsão não foi criada');
    return row.id;
  }

  /** Devolve `false` quando a previsão não existe. */
  async update(plannedEntryId: string, fields: PlannedEntryFields): Promise<boolean> {
    const rows = await this.db
      .update(plannedEntries)
      .set(fields)
      .where(eq(plannedEntries.id, plannedEntryId))
      .returning({ id: plannedEntries.id });
    return rows.length > 0;
  }

  /** As decisões saem junto (`ON DELETE CASCADE`). Devolve `false` quando a previsão não existe. */
  async delete(plannedEntryId: string): Promise<boolean> {
    const rows = await this.db
      .delete(plannedEntries)
      .where(eq(plannedEntries.id, plannedEntryId))
      .returning({ id: plannedEntries.id });
    return rows.length > 0;
  }

  async findById(plannedEntryId: string): Promise<PlannedEntryRecord | null> {
    const [row] = await this.db
      .select(entryColumns)
      .from(plannedEntries)
      .innerJoin(categories, eq(categories.id, plannedEntries.categoryId))
      .where(eq(plannedEntries.id, plannedEntryId));
    return row ? toEntryRecord(row) : null;
  }

  async findByActiveState(isActive: boolean): Promise<PlannedEntryRecord[]> {
    const rows = await this.db
      .select(entryColumns)
      .from(plannedEntries)
      .innerJoin(categories, eq(categories.id, plannedEntries.categoryId))
      .where(eq(plannedEntries.isActive, isActive))
      .orderBy(asc(plannedEntries.dayOfMonth), asc(plannedEntries.description));
    return rows.map(toEntryRecord);
  }

  /** Decisões do mês (`month` é o dia 1), com a transação vinculada quando ela ainda existe. */
  async findDecisions(month: string): Promise<DecisionRecord[]> {
    const rows = await this.db
      .select({
        plannedEntryId: plannedEntryOccurrences.plannedEntryId,
        month: plannedEntryOccurrences.month,
        status: plannedEntryOccurrences.status,
        decidedAt: plannedEntryOccurrences.decidedAt,
        transactionId: transactions.id,
        transactionDate: transactions.date,
        transactionDescription: transactions.description,
        transactionAmountCents: transactions.amountCents,
      })
      .from(plannedEntryOccurrences)
      .leftJoin(transactions, eq(transactions.id, plannedEntryOccurrences.transactionId))
      .where(eq(plannedEntryOccurrences.month, month));
    return rows.map((row) => ({
      plannedEntryId: row.plannedEntryId,
      month: row.month,
      status: decisionStatusSchema.parse(row.status),
      decidedAt: row.decidedAt,
      transaction:
        row.transactionId === null
          ? null
          : {
              id: row.transactionId,
              date: row.transactionDate ?? '',
              description: row.transactionDescription ?? '',
              amountCents: row.transactionAmountCents ?? 0,
            },
    }));
  }

  /** Grava ou troca a decisão do mês. A chave é (previsão, mês): decidir de novo substitui a anterior. */
  async upsertDecision(input: DecisionInput): Promise<void> {
    await this.db
      .insert(plannedEntryOccurrences)
      .values(input)
      .onConflictDoUpdate({
        target: [plannedEntryOccurrences.plannedEntryId, plannedEntryOccurrences.month],
        set: {
          status: input.status,
          transactionId: input.transactionId,
          decidedAt: sql`now()`,
        },
      });
  }

  /** Devolve `false` quando não havia decisão para desfazer. */
  async deleteDecision(plannedEntryId: string, month: string): Promise<boolean> {
    const rows = await this.db
      .delete(plannedEntryOccurrences)
      .where(
        and(
          eq(plannedEntryOccurrences.plannedEntryId, plannedEntryId),
          eq(plannedEntryOccurrences.month, month),
        ),
      )
      .returning({ plannedEntryId: plannedEntryOccurrences.plannedEntryId });
    return rows.length > 0;
  }

  /** A ocorrência a que a transação já está vinculada, se houver. */
  async findLinkOf(transactionId: string): Promise<TransactionLink | null> {
    const [row] = await this.db
      .select({
        plannedEntryId: plannedEntryOccurrences.plannedEntryId,
        month: plannedEntryOccurrences.month,
      })
      .from(plannedEntryOccurrences)
      .where(eq(plannedEntryOccurrences.transactionId, transactionId));
    return row ?? null;
  }

  async findTransaction(
    transactionId: string,
  ): Promise<Pick<LinkedTransaction, 'id' | 'date' | 'amountCents'> | null> {
    const [row] = await this.db
      .select({
        id: transactions.id,
        date: transactions.date,
        amountCents: transactions.amountCents,
      })
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    return row ?? null;
  }

  /**
   * Transações do mês que podem ser sugeridas: de qualquer origem e status, menos as de categoria
   * `transfer` (previsão não cobre transferência). `isLinked` diz se já realizam outra ocorrência.
   */
  async findTransactionsOfMonth(month: string): Promise<LinkableTransaction[]> {
    const rows = await this.db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amountCents: transactions.amountCents,
        categoryId: transactions.categoryId,
        linkedEntryId: plannedEntryOccurrences.plannedEntryId,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(
        plannedEntryOccurrences,
        and(
          eq(plannedEntryOccurrences.transactionId, transactions.id),
          isNotNull(plannedEntryOccurrences.transactionId),
        ),
      )
      .where(
        and(
          gte(transactions.date, month),
          lte(transactions.date, lastDayOfMonth(month)),
          or(sql`${categories.kind} is null`, ne(categories.kind, 'transfer')),
        ),
      );
    return rows.map(({ linkedEntryId, ...row }) => ({ ...row, isLinked: linkedEntryId !== null }));
  }
}
