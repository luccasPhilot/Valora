import { normalizeDescription } from '../../shared/text.js';

export type MatchType = 'contains' | 'starts_with' | 'equals';
export type CategorySource = 'user' | 'rule' | 'pluggy' | 'none';

export interface RuleInput {
  readonly id: string;
  readonly pattern: string;
  readonly matchType: MatchType;
  readonly categoryId: string;
  readonly priority: number;
  readonly createdAt: Date;
}

export interface CategorizableTransaction {
  readonly descriptionNormalized: string;
  readonly pluggyCategory: string | null;
  readonly categoryId: string | null;
  readonly categorySource: CategorySource;
}

export interface CategoryDecision {
  readonly categoryId: string | null;
  readonly source: CategorySource;
}

export interface CompiledRule {
  readonly categoryId: string;
  readonly matchType: MatchType;
  /** Já normalizado do mesmo jeito que `description_normalized`. */
  readonly pattern: string;
}

/** Quem tem `category_source` nestes valores pode ser recategorizado; `user` nunca é. */
export const AUTOMATIC_SOURCES = ['none', 'pluggy', 'rule'] as const;

const MATCHERS: Readonly<Record<MatchType, (description: string, pattern: string) => boolean>> = {
  contains: (description, pattern) => description.includes(pattern),
  starts_with: (description, pattern) => description.startsWith(pattern),
  equals: (description, pattern) => description === pattern,
};

function compareByPrecedence(first: RuleInput, second: RuleInput): number {
  if (first.priority !== second.priority) return second.priority - first.priority;
  const byCreation = second.createdAt.getTime() - first.createdAt.getTime();
  if (byCreation !== 0) return byCreation;
  return first.id.localeCompare(second.id);
}

/**
 * Ordena as regras (maior prioridade primeiro; empate pela mais recente) e normaliza os padrões uma
 * vez só, para aplicar em lote. Regra com padrão vazio depois de normalizada seria "casa com tudo":
 * é descartada.
 */
export function compileRules(rules: readonly RuleInput[]): readonly CompiledRule[] {
  return [...rules]
    .sort(compareByPrecedence)
    .map((rule) => ({
      categoryId: rule.categoryId,
      matchType: rule.matchType,
      pattern: normalizeDescription(rule.pattern),
    }))
    .filter((rule) => rule.pattern !== '');
}

/** Ordem de decisão: escolha do usuário → regra → mapeamento do Pluggy → sem categoria. */
export function decideCategory(
  transaction: CategorizableTransaction,
  rules: readonly CompiledRule[],
  pluggyMappings: ReadonlyMap<string, string>,
): CategoryDecision {
  if (transaction.categorySource === 'user') {
    return { categoryId: transaction.categoryId, source: 'user' };
  }
  const matchedRule = rules.find((rule) =>
    MATCHERS[rule.matchType](transaction.descriptionNormalized, rule.pattern),
  );
  if (matchedRule) return { categoryId: matchedRule.categoryId, source: 'rule' };
  const mappedCategoryId =
    transaction.pluggyCategory === null
      ? undefined
      : pluggyMappings.get(transaction.pluggyCategory);
  if (mappedCategoryId) return { categoryId: mappedCategoryId, source: 'pluggy' };
  return { categoryId: null, source: 'none' };
}
