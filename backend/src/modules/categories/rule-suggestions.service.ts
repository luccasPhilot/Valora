import { normalizeDescription } from '../../shared/text.js';
import type { CategoriesRepository } from './categories.repository.js';
import { assertCategoryIsSelectable } from './category-availability.js';
import { compileRules } from './category-decision.js';
import type { CategoryRulesRepository } from './category-rules.repository.js';
import {
  chooseRuleSuggestions,
  type RuleSuggestion,
  type SuggestionPair,
} from './rule-suggestions.js';
import type {
  CorrectionGroupScope,
  RuleSuggestionsRepository,
} from './rule-suggestions.repository.js';

export interface RuleSuggestionsDependencies {
  readonly suggestions: RuleSuggestionsRepository;
  readonly rules: Pick<CategoryRulesRepository, 'findAll'>;
  readonly categories: CategoriesRepository;
}

/**
 * Regra sugerida pelas correções, calculada a cada consulta (sem tabela de contagem). Aceitar é o
 * `POST /category-rules` que já existe; aqui só se lista e se dispensa.
 */
export class RuleSuggestionsService {
  constructor(private readonly deps: RuleSuggestionsDependencies) {}

  list(): Promise<RuleSuggestion[]> {
    return this.choose();
  }

  /** A sugestão para as descrições recém-trocadas para `categoryId` (a de mais correções), ou nula. */
  async suggestionFor(
    transactionIds: readonly string[],
    categoryId: string,
  ): Promise<RuleSuggestion | null> {
    const patterns = await this.deps.suggestions.findDescriptions(transactionIds);
    if (patterns.length === 0) return null;
    const [suggestion] = await this.choose({ patterns, categoryId });
    return suggestion ?? null;
  }

  async dismiss(pair: SuggestionPair): Promise<void> {
    await assertCategoryIsSelectable(this.deps.categories, pair.categoryId);
    await this.deps.suggestions.dismiss({
      pattern: normalizeDescription(pair.pattern),
      categoryId: pair.categoryId,
    });
  }

  private async choose(scope?: CorrectionGroupScope): Promise<RuleSuggestion[]> {
    const [groups, rules, dismissedPairs] = await Promise.all([
      this.deps.suggestions.findCorrectionGroups(scope),
      this.deps.rules.findAll(),
      this.deps.suggestions.findDismissedPairs(),
    ]);
    return chooseRuleSuggestions({ groups, rules: compileRules(rules), dismissedPairs });
  }
}
