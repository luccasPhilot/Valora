import { and, count, desc, eq, gt, gte, inArray, lt, lte, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import {
  accounts,
  balanceSnapshots,
  connections,
  goalContributions,
  goalLinks,
  goals,
  investments,
  investmentSnapshots,
} from '../../db/schema.js';
import type { ContributionKind } from './goal-pace.js';

const contributionKindSchema = z.enum([
  'initial',
  'deposit',
  'withdrawal',
] satisfies ContributionKind[]);

export type LinkType = 'account' | 'investment';

export interface LinkRef {
  readonly type: LinkType;
  readonly id: string;
}

/** Conta ou investimento que uma meta acompanha, com o saldo de agora. */
export interface LinkedItemRecord extends LinkRef {
  readonly name: string;
  readonly institutionName: string | null;
  readonly balanceCents: number;
  readonly isArchived: boolean;
}

/** Item que pode ser candidato a vínculo; `accountType` é nulo para investimentos. */
export interface LinkCandidateRecord extends LinkedItemRecord {
  readonly accountType: string | null;
}

export interface GoalLinkRecord extends LinkedItemRecord {
  readonly goalId: string;
}

export interface LinkSnapshotRecord extends LinkRef {
  readonly date: string;
  readonly balanceCents: number;
}

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

async function insertLinks(
  executor: DbExecutor,
  goalId: string,
  links: readonly LinkRef[],
): Promise<void> {
  if (links.length === 0) return;
  await executor
    .insert(goalLinks)
    .values(
      links.map(({ type, id }) =>
        type === 'account' ? { goalId, accountId: id } : { goalId, investmentId: id },
      ),
    );
}

interface AccountItemRow {
  readonly id: string;
  readonly name: string;
  readonly accountType: string;
  readonly balanceCents: number | null;
  readonly institutionName: string | null;
  readonly archivedAt: Date | null;
}

interface InvestmentItemRow {
  readonly id: string;
  readonly name: string;
  readonly balanceCents: number;
  readonly institutionName: string;
  readonly archivedAt: Date | null;
}

function toAccountCandidate(row: AccountItemRow): LinkCandidateRecord {
  return {
    type: 'account',
    id: row.id,
    name: row.name,
    accountType: row.accountType,
    institutionName: row.institutionName,
    balanceCents: row.balanceCents ?? 0,
    isArchived: row.archivedAt !== null,
  };
}

function toInvestmentCandidate(row: InvestmentItemRow): LinkCandidateRecord {
  return {
    type: 'investment',
    id: row.id,
    name: row.name,
    accountType: null,
    institutionName: row.institutionName,
    balanceCents: row.balanceCents,
    isArchived: row.archivedAt !== null,
  };
}

const accountItemColumns = {
  id: accounts.id,
  name: accounts.name,
  accountType: accounts.type,
  balanceCents: accounts.balanceCents,
  institutionName: connections.institutionName,
  archivedAt: connections.archivedAt,
};

const investmentItemColumns = {
  id: investments.id,
  name: investments.name,
  balanceCents: investments.balanceCents,
  institutionName: connections.institutionName,
  archivedAt: connections.archivedAt,
};

function idsOfType(refs: readonly LinkRef[], type: LinkType): string[] {
  return refs.filter((ref) => ref.type === type).map(({ id }) => id);
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

  /** Cria a meta, o aporte `initial` (se houver valor inicial) e os vínculos, numa transação só. */
  async insert(
    fields: GoalFields,
    creation: GoalCreation,
    links: readonly LinkRef[],
  ): Promise<GoalRecord> {
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
      await insertLinks(tx, created.id, links);
      return created;
    });
  }

  /** `links` ausente mantém os vínculos; uma lista (mesmo vazia) substitui o conjunto inteiro. */
  async update(
    id: string,
    fields: GoalFields,
    links: readonly LinkRef[] | undefined,
  ): Promise<GoalRecord | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(goals)
        .set(fields)
        .where(eq(goals.id, id))
        .returning(goalColumns);
      if (!row) return null;
      if (links === undefined) return row;
      await tx.delete(goalLinks).where(eq(goalLinks.goalId, id));
      await insertLinks(tx, id, links);
      return row;
    });
  }

  /** Os aportes e os vínculos saem junto (`ON DELETE CASCADE`). Devolve `false` quando a meta não existia. */
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

  async hasLinks(goalId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: goalLinks.id })
      .from(goalLinks)
      .where(eq(goalLinks.goalId, goalId))
      .limit(1);
    return row !== undefined;
  }

  /** Vínculos das metas pedidas com o saldo atual de cada item: uma query por tipo, sem N+1. */
  async findLinks(goalIds: readonly string[]): Promise<GoalLinkRecord[]> {
    if (goalIds.length === 0) return [];
    const ids = [...goalIds];
    const [accountRows, investmentRows] = await Promise.all([
      this.db
        .select({ goalId: goalLinks.goalId, ...accountItemColumns })
        .from(goalLinks)
        .innerJoin(accounts, eq(goalLinks.accountId, accounts.id))
        .leftJoin(connections, eq(accounts.connectionId, connections.id))
        .where(inArray(goalLinks.goalId, ids)),
      this.db
        .select({ goalId: goalLinks.goalId, ...investmentItemColumns })
        .from(goalLinks)
        .innerJoin(investments, eq(goalLinks.investmentId, investments.id))
        .innerJoin(connections, eq(investments.connectionId, connections.id))
        .where(inArray(goalLinks.goalId, ids)),
    ]);
    return [
      ...accountRows.map((row) => ({ goalId: row.goalId, ...toAccountCandidate(row) })),
      ...investmentRows.map((row) => ({ goalId: row.goalId, ...toInvestmentCandidate(row) })),
    ];
  }

  /** Os itens pedidos que existem, com o tipo da conta e se o banco está arquivado. */
  async findLinkCandidates(refs: readonly LinkRef[]): Promise<LinkCandidateRecord[]> {
    const accountIds = idsOfType(refs, 'account');
    const investmentIds = idsOfType(refs, 'investment');
    const [accountRows, investmentRows] = await Promise.all([
      accountIds.length === 0
        ? []
        : this.db
            .select(accountItemColumns)
            .from(accounts)
            .leftJoin(connections, eq(accounts.connectionId, connections.id))
            .where(inArray(accounts.id, accountIds)),
      investmentIds.length === 0
        ? []
        : this.db
            .select(investmentItemColumns)
            .from(investments)
            .innerJoin(connections, eq(investments.connectionId, connections.id))
            .where(inArray(investments.id, investmentIds)),
    ]);
    return [...accountRows.map(toAccountCandidate), ...investmentRows.map(toInvestmentCandidate)];
  }

  /** Fotos diárias dos itens de `fromDate` (inclusive) até `beforeDate` (exclusive). */
  async findLinkSnapshots(
    refs: readonly LinkRef[],
    window: { readonly fromDate: string; readonly beforeDate: string },
  ): Promise<LinkSnapshotRecord[]> {
    const accountIds = idsOfType(refs, 'account');
    const investmentIds = idsOfType(refs, 'investment');
    const [accountRows, investmentRows] = await Promise.all([
      accountIds.length === 0
        ? []
        : this.db
            .select({
              id: balanceSnapshots.accountId,
              date: balanceSnapshots.date,
              balanceCents: balanceSnapshots.balanceCents,
            })
            .from(balanceSnapshots)
            .where(
              and(
                inArray(balanceSnapshots.accountId, accountIds),
                gte(balanceSnapshots.date, window.fromDate),
                lt(balanceSnapshots.date, window.beforeDate),
              ),
            ),
      investmentIds.length === 0
        ? []
        : this.db
            .select({
              id: investmentSnapshots.investmentId,
              date: investmentSnapshots.date,
              balanceCents: investmentSnapshots.balanceCents,
            })
            .from(investmentSnapshots)
            .where(
              and(
                inArray(investmentSnapshots.investmentId, investmentIds),
                gte(investmentSnapshots.date, window.fromDate),
                lt(investmentSnapshots.date, window.beforeDate),
              ),
            ),
    ]);
    return [
      ...accountRows.map((row) => ({ type: 'account' as const, ...row })),
      ...investmentRows.map((row) => ({ type: 'investment' as const, ...row })),
    ];
  }
}
