import { type CompiledRule, decideCategory } from './category-decision.js';

/** A Fase 4 pede 2 ou mais correções: com 1, "Aplicar sempre" já resolve. */
export const MIN_CORRECTIONS_FOR_SUGGESTION = 2;
export const MAX_RULE_SUGGESTIONS = 20;
/** O mesmo limite do padrão de `POST /category-rules`: uma sugestão maior não poderia ser aceita. */
export const MAX_RULE_PATTERN_LENGTH = 120;

/** Transações do Open Finance com a mesma descrição normalizada e a mesma categoria sua. */
export interface CorrectionGroup {
  readonly pattern: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryIcon: string;
  readonly isCategoryArchived: boolean;
  readonly correctionCount: number;
}

export interface SuggestionPair {
  readonly pattern: string;
  readonly categoryId: string;
}

export interface RuleSuggestion extends SuggestionPair {
  readonly categoryName: string;
  readonly categoryIcon: string;
  readonly correctionCount: number;
}

export interface RuleSuggestionInput {
  readonly groups: readonly CorrectionGroup[];
  /** Regras atuais, já compiladas na ordem de decisão. */
  readonly rules: readonly CompiledRule[];
  readonly dismissedPairs: readonly SuggestionPair[];
}

function pairKey({ pattern, categoryId }: SuggestionPair): string {
  return JSON.stringify([pattern, categoryId]);
}

/** Uma regra atual já leva esta descrição para esta categoria. */
function isCoveredByRules(group: CorrectionGroup, rules: readonly CompiledRule[]): boolean {
  const decision = decideCategory(
    {
      descriptionNormalized: group.pattern,
      pluggyCategory: null,
      categoryId: null,
      categorySource: 'none',
    },
    rules,
    new Map(),
  );
  return decision.categoryId === group.categoryId;
}

function bySuggestionOrder(first: RuleSuggestion, second: RuleSuggestion): number {
  return (
    second.correctionCount - first.correctionCount || first.pattern.localeCompare(second.pattern)
  );
}

/**
 * Regra fixa, sem IA: sugere `equals` para os pares com 2 ou mais correções, de categoria ativa,
 * não dispensados e que nenhuma regra atual já decide. Mais correções primeiro, até 20.
 */
export function chooseRuleSuggestions({
  groups,
  rules,
  dismissedPairs,
}: RuleSuggestionInput): RuleSuggestion[] {
  const dismissedKeys = new Set(dismissedPairs.map(pairKey));
  return groups
    .filter(
      (group) =>
        group.correctionCount >= MIN_CORRECTIONS_FOR_SUGGESTION &&
        !group.isCategoryArchived &&
        group.pattern.length <= MAX_RULE_PATTERN_LENGTH &&
        !dismissedKeys.has(pairKey(group)) &&
        !isCoveredByRules(group, rules),
    )
    .map(({ isCategoryArchived: _isCategoryArchived, ...suggestion }) => suggestion)
    .sort(bySuggestionOrder)
    .slice(0, MAX_RULE_SUGGESTIONS);
}
