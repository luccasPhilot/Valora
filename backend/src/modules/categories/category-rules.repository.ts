import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DbExecutor } from '../../db/database.js';
import { categoryRules } from '../../db/schema.js';
import type { MatchType } from './category-decision.js';

const matchTypeSchema = z.enum(['contains', 'starts_with', 'equals']);

export interface CategoryRuleRecord {
  readonly id: string;
  readonly pattern: string;
  readonly matchType: MatchType;
  readonly categoryId: string;
  readonly priority: number;
  readonly learnedFromTransactionId: string | null;
  readonly createdAt: Date;
}

export interface CategoryRuleFields {
  readonly pattern: string;
  readonly matchType: MatchType;
  readonly categoryId: string;
  readonly priority: number;
}

export interface LearnedRuleFields extends CategoryRuleFields {
  readonly learnedFromTransactionId: string;
}

function toRecord(row: typeof categoryRules.$inferSelect): CategoryRuleRecord {
  return {
    id: row.id,
    pattern: row.pattern,
    matchType: matchTypeSchema.parse(row.matchType),
    categoryId: row.categoryId,
    priority: row.priority,
    learnedFromTransactionId: row.learnedFromTransactionId,
    createdAt: row.createdAt,
  };
}

export class CategoryRulesRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Da mais forte para a mais fraca: prioridade e, no empate, a mais recente. */
  async findAll(): Promise<CategoryRuleRecord[]> {
    const rows = await this.db
      .select()
      .from(categoryRules)
      .orderBy(desc(categoryRules.priority), desc(categoryRules.createdAt), asc(categoryRules.id));
    return rows.map(toRecord);
  }

  async findById(ruleId: string): Promise<CategoryRuleRecord | null> {
    const [row] = await this.db.select().from(categoryRules).where(eq(categoryRules.id, ruleId));
    return row ? toRecord(row) : null;
  }

  async findByMatchType(matchType: MatchType): Promise<CategoryRuleRecord[]> {
    const rows = await this.db
      .select()
      .from(categoryRules)
      .where(eq(categoryRules.matchType, matchType));
    return rows.map(toRecord);
  }

  async insert(fields: CategoryRuleFields | LearnedRuleFields): Promise<CategoryRuleRecord> {
    const [row] = await this.db.insert(categoryRules).values(fields).returning();
    if (!row) throw new Error('A regra não foi gravada');
    return toRecord(row);
  }

  async update(ruleId: string, fields: CategoryRuleFields): Promise<CategoryRuleRecord | null> {
    const [row] = await this.db
      .update(categoryRules)
      .set(fields)
      .where(eq(categoryRules.id, ruleId))
      .returning();
    return row ? toRecord(row) : null;
  }

  async updateCategory(ruleId: string, categoryId: string): Promise<void> {
    await this.db.update(categoryRules).set({ categoryId }).where(eq(categoryRules.id, ruleId));
  }

  async delete(ruleId: string): Promise<boolean> {
    const rows = await this.db
      .delete(categoryRules)
      .where(eq(categoryRules.id, ruleId))
      .returning({ id: categoryRules.id });
    return rows.length > 0;
  }
}
