import { percentWithOneDecimal } from '../../shared/percent.js';
import {
  type CategoryDifference,
  type CategoryInsightItem,
  type CategoryKey,
  variationPercentOf,
} from './category-insights-calculations.js';

export const MAX_LISTED_CHANGES = 3;
/** Alta de 30% ou mais, e de R$ 50,00 ou mais, vira ponto de atenção. */
export const SURGE_MIN_VARIATION_PERCENT = 30;
export const SURGE_MIN_DIFFERENCE_CENTS = 5000;
/** "Sem categoria" com 10% ou mais do gasto do mês vira ponto de atenção. */
export const UNCATEGORIZED_ALERT_PERCENT = 10;
const FULL_PERCENT = 100;

export interface CategoryChange extends CategoryKey {
  readonly differenceCents: number;
}

export interface CategoryChanges {
  readonly increases: readonly CategoryChange[];
  readonly decreases: readonly CategoryChange[];
}

export type AttentionPoint =
  | {
      readonly type: 'budget_exceeded';
      readonly categoryId: string;
      readonly name: string;
      readonly limitCents: number;
      readonly spentCents: number;
    }
  | {
      readonly type: 'category_surge';
      readonly categoryId: string;
      readonly name: string;
      readonly differenceCents: number;
      readonly variationPercent: number;
    }
  | {
      readonly type: 'uncategorized_high';
      readonly spentCents: number;
      readonly percent: number;
    };

function toChange(difference: CategoryDifference): CategoryChange {
  return {
    kind: difference.kind,
    categoryId: difference.categoryId,
    name: difference.name,
    icon: difference.icon,
    differenceCents: difference.differenceCents,
  };
}

function byLargestChange(first: CategoryDifference, second: CategoryDifference): number {
  return (
    Math.abs(second.differenceCents) - Math.abs(first.differenceCents) ||
    first.name.localeCompare(second.name, 'pt-BR')
  );
}

/** As maiores altas e quedas contra o período de comparação; diferença zero fica de fora. */
export function buildChanges(differences: readonly CategoryDifference[]): CategoryChanges {
  const sorted = [...differences].sort(byLargestChange);
  return {
    increases: sorted
      .filter((difference) => difference.differenceCents > 0)
      .slice(0, MAX_LISTED_CHANGES)
      .map(toChange),
    decreases: sorted
      .filter((difference) => difference.differenceCents < 0)
      .slice(0, MAX_LISTED_CHANGES)
      .map(toChange),
  };
}

/** Comparação em centavos inteiros (`diferença × 100 ≥ anterior × 30`): a fronteira de 30% é exata. */
function isSurge(difference: CategoryDifference): boolean {
  return (
    difference.categoryId !== null &&
    difference.previousSpentCents > 0 &&
    difference.differenceCents >= SURGE_MIN_DIFFERENCE_CENTS &&
    difference.differenceCents * FULL_PERCENT >=
      difference.previousSpentCents * SURGE_MIN_VARIATION_PERCENT
  );
}

function budgetPoints(items: readonly CategoryInsightItem[]): AttentionPoint[] {
  return items.flatMap((item) => {
    if (item.categoryId === null || item.budget?.status !== 'exceeded') return [];
    return [
      {
        type: 'budget_exceeded' as const,
        categoryId: item.categoryId,
        name: item.name,
        limitCents: item.budget.limitCents,
        spentCents: item.spentCents,
      },
    ];
  });
}

function surgePoints(differences: readonly CategoryDifference[]): AttentionPoint[] {
  return differences
    .filter(isSurge)
    .sort(byLargestChange)
    .slice(0, MAX_LISTED_CHANGES)
    .flatMap((difference) => {
      const variationPercent = variationPercentOf(
        difference.spentCents,
        difference.previousSpentCents,
      );
      if (difference.categoryId === null || variationPercent === null) return [];
      return [
        {
          type: 'category_surge' as const,
          categoryId: difference.categoryId,
          name: difference.name,
          differenceCents: difference.differenceCents,
          variationPercent,
        },
      ];
    });
}

function uncategorizedPoints(
  items: readonly CategoryInsightItem[],
  totalCents: number,
): AttentionPoint[] {
  const uncategorized = items.find((item) => item.kind === 'uncategorized');
  if (!uncategorized) return [];
  const isHigh =
    uncategorized.spentCents * FULL_PERCENT >= totalCents * UNCATEGORIZED_ALERT_PERCENT;
  if (!isHigh) return [];
  return [
    {
      type: 'uncategorized_high',
      spentCents: uncategorized.spentCents,
      percent: percentWithOneDecimal(uncategorized.spentCents, totalCents),
    },
  ];
}

/** Pontos de atenção em ordem fixa: orçamento estourado, alta forte e "Sem categoria" alta. */
export function buildAttention(
  items: readonly CategoryInsightItem[],
  differences: readonly CategoryDifference[],
  totalCents: number,
): AttentionPoint[] {
  return [
    ...budgetPoints(items),
    ...surgePoints(differences),
    ...uncategorizedPoints(items, totalCents),
  ];
}
