import { and, count, eq, inArray, isNotNull, type SQL } from 'drizzle-orm';

import type { DbExecutor } from '../../db/database.js';
import { categories, dismissedRuleSuggestions, transactions } from '../../db/schema.js';
import type { CorrectionGroup, SuggestionPair } from './rule-suggestions.js';

/** Restringe os grupos às descrições recém-trocadas para uma categoria. */
export interface CorrectionGroupScope {
  readonly patterns: readonly string[];
  readonly categoryId: string;
}

export class RuleSuggestionsRepository {
  constructor(private readonly db: DbExecutor) {}

  /** Correções suas em transações do Open Finance, agrupadas por descrição e categoria. */
  async findCorrectionGroups(scope?: CorrectionGroupScope): Promise<CorrectionGroup[]> {
    const conditions: SQL[] = [
      eq(transactions.source, 'open_finance'),
      eq(transactions.categorySource, 'user'),
      isNotNull(transactions.categoryId),
    ];
    if (scope) {
      conditions.push(inArray(transactions.descriptionNormalized, [...scope.patterns]));
      conditions.push(eq(transactions.categoryId, scope.categoryId));
    }
    return this.db
      .select({
        pattern: transactions.descriptionNormalized,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        isCategoryArchived: categories.isArchived,
        correctionCount: count(),
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(...conditions))
      .groupBy(transactions.descriptionNormalized, categories.id);
  }

  async findDismissedPairs(): Promise<SuggestionPair[]> {
    return this.db
      .select({
        pattern: dismissedRuleSuggestions.pattern,
        categoryId: dismissedRuleSuggestions.categoryId,
      })
      .from(dismissedRuleSuggestions);
  }

  /** Dispensar de novo não muda nada. */
  async dismiss(pair: SuggestionPair): Promise<void> {
    await this.db.insert(dismissedRuleSuggestions).values(pair).onConflictDoNothing();
  }

  /** Descrições normalizadas distintas das transações. */
  async findDescriptions(transactionIds: readonly string[]): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ pattern: transactions.descriptionNormalized })
      .from(transactions)
      .where(inArray(transactions.id, [...transactionIds]));
    return rows.map((row) => row.pattern);
  }
}
