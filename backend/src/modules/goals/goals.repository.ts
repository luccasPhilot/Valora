import { and, count, desc, eq, gt, inArray, lte, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { goalContributions, goals } from '../../db/schema.js';
import type { ContributionKind } from './goal-pace.js';

const contributionKindSchema = z.enum([
  'initial',
  'deposit',
  'withdrawal',
] satisfies ContributionKind[]);

export interface GoalFields {
  readonly name: string;
  readonly icon: string;
  readonly targetCents: number;
  readonly targetDate: string | null;
}

export interface GoalRecord extends GoalFields {
  readonly id: string;
  readonly savedCents: number;
  readonly createdAt: Date;
}

export interface GoalCreation {
  readonly initialCents: number;
  /** Dia do valor inicial (AAAA-MM-DD, São Paulo). */
  readonly initialDate: string;
  readonly createdAt: Date;
}

export interface ContributionRecord {
  readonly id: string;
  readonly goalId: string;
  readonly date: string;
  /** Com sinal: negativo = retirada. */
  readonly amountCents: number;
  readonly kind: ContributionKind;
}

export interface NewContribution {
  readonly date: string;
  readonly amountCents: number;
  readonly kind: ContributionKind;
}

export interface PageRequest {
  readonly page: number;
  readonly limit: number;
}

export interface ContributionPage {
  readonly items: readonly ContributionRecord[];
  readonly total: number;
}

export type ContributionRemoval = 'removed' | 'not_found' | 'would_go_below_zero';

const goalColumns = {
  id: goals.id,
  name: goals.name,
  icon: goals.icon,
  targetCents: goals.targetCents,
  savedCents: goals.savedCents,
  targetDate: goals.targetDate,
  createdAt: goals.createdAt,
};

const contributionColumns = {
  id: goalContributions.id,
  goalId: goalContributions.goalId,
  date: goalContributions.date,
  amountCents: goalContributions.amountCents,
  kind: goalContributions.kind,
};

function toContributionRecord(row: Omit<ContributionRecord, 'kind'> & { kind: string }) {
  return { ...row, kind: contributionKindSchema.parse(row.kind) };
}

// Mais recente primeiro; o desempate mantém a ordem estável entre aportes do mesmo dia.
const newestFirst = [
  desc(goalContributions.date),
  desc(goalContributions.createdAt),
  desc(goalContributions.id),
];

export class GoalsRepository {
  constructor(private readonly db: DbExecutor) {}

  findAll(): Promise<GoalRecord[]> {
    return this.db.select(goalColumns).from(goals);
  }

  async findById(id: string): Promise<GoalRecord | null> {
    const [row] = await this.db.select(goalColumns).from(goals).where(eq(goals.id, id));
    return row ?? null;
  }

  /** Cria a meta e, se houver valor inicial, o aporte `initial` dele, numa transação só. */
  async insert(fields: GoalFields, creation: GoalCreation): Promise<GoalRecord> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(goals)
        .values({ ...fields, savedCents: creation.initialCents, createdAt: creation.createdAt })
        .returning(goalColumns);
      if (!created) throw new Error('A meta não foi gravada');
      if (creation.initialCents > 0) {
        await tx.insert(goalContributions).values({
          goalId: created.id,
          date: creation.initialDate,
          amountCents: creation.initialCents,
          kind: 'initial',
        });
      }
      return created;
    });
  }

  async update(id: string, fields: GoalFields): Promise<GoalRecord | null> {
    const [row] = await this.db
      .update(goals)
      .set(fields)
      .where(eq(goals.id, id))
      .returning(goalColumns);
    return row ?? null;
  }

  /** Os aportes saem junto (`ON DELETE CASCADE`). Devolve `false` quando a meta não existia. */
  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(goals).where(eq(goals.id, id)).returning({ id: goals.id });
    return rows.length > 0;
  }

  /**
   * Grava o aporte ou a retirada e soma o valor ao acumulado na mesma transação. Devolve `null`
   * sem gravar nada quando o acumulado ficaria abaixo de zero (ou a meta não existe).
   */
  async addContribution(goalId: string, contribution: NewContribution): Promise<GoalRecord | null> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(goals)
        .set({ savedCents: sql`${goals.savedCents} + ${contribution.amountCents}` })
        .where(
          and(eq(goals.id, goalId), sql`${goals.savedCents} + ${contribution.amountCents} >= 0`),
        )
        .returning(goalColumns);
      if (!updated) return null;
      await tx.insert(goalContributions).values({ goalId, ...contribution });
      return updated;
    });
  }

  /** Desfaz o efeito do aporte no acumulado; recusa quando isso o deixaria abaixo de zero. */
  async removeContribution(goalId: string, contributionId: string): Promise<ContributionRemoval> {
    return this.db.transaction(async (tx) => {
      const [contribution] = await tx
        .select({ amountCents: goalContributions.amountCents })
        .from(goalContributions)
        .where(and(eq(goalContributions.id, contributionId), eq(goalContributions.goalId, goalId)));
      if (!contribution) return 'not_found';
      const [updated] = await tx
        .update(goals)
        .set({ savedCents: sql`${goals.savedCents} - ${contribution.amountCents}` })
        .where(
          and(eq(goals.id, goalId), sql`${goals.savedCents} - ${contribution.amountCents} >= 0`),
        )
        .returning({ id: goals.id });
      if (!updated) return 'would_go_below_zero';
      await tx.delete(goalContributions).where(eq(goalContributions.id, contributionId));
      return 'removed';
    });
  }

  async findContributionsPage(goalId: string, request: PageRequest): Promise<ContributionPage> {
    const rows = await this.db
      .select(contributionColumns)
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goalId))
      .orderBy(...newestFirst)
      .limit(request.limit)
      .offset((request.page - 1) * request.limit);
    const [counted] = await this.db
      .select({ total: count() })
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goalId));
    return { items: rows.map(toContributionRecord), total: counted?.total ?? 0 };
  }

  /** Os `limitPerGoal` aportes mais recentes de cada meta, numa query só. */
  async findRecentContributions(
    goalIds: readonly string[],
    limitPerGoal: number,
  ): Promise<ContributionRecord[]> {
    if (goalIds.length === 0) return [];
    const position = sql<number>`row_number() over (
      partition by ${goalContributions.goalId}
      order by ${goalContributions.date} desc, ${goalContributions.createdAt} desc, ${goalContributions.id} desc
    )`;
    const ranked = this.db
      .select({
        ...contributionColumns,
        createdAt: goalContributions.createdAt,
        position: position.as('position'),
      })
      .from(goalContributions)
      .where(inArray(goalContributions.goalId, [...goalIds]))
      .as('ranked');
    const rows = await this.db
      .select({
        id: ranked.id,
        goalId: ranked.goalId,
        date: ranked.date,
        amountCents: ranked.amountCents,
        kind: ranked.kind,
      })
      .from(ranked)
      .where(lte(ranked.position, limitPerGoal))
      .orderBy(desc(ranked.date), desc(ranked.createdAt), desc(ranked.id));
    return rows.map(toContributionRecord);
  }

  /** Aportes e retiradas (sem o valor inicial) depois de `afterDate`, de todas as metas pedidas. */
  async findPaceContributions(
    goalIds: readonly string[],
    afterDate: string,
  ): Promise<ContributionRecord[]> {
    if (goalIds.length === 0) return [];
    const rows = await this.db
      .select(contributionColumns)
      .from(goalContributions)
      .where(
        and(
          inArray(goalContributions.goalId, [...goalIds]),
          ne(goalContributions.kind, 'initial'),
          gt(goalContributions.date, afterDate),
        ),
      );
    return rows.map(toContributionRecord);
  }
}
