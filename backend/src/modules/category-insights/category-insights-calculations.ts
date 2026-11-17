import { budgetPercent, type BudgetStatus, budgetStatus } from '../budgets/budget-status.js';
import type {
  CategorySpending,
  MonthCategorySpending,
} from '../transactions/transaction-totals.repository.js';

const PERCENT_SCALE = 1000;
const PERCENT_DECIMALS_DIVISOR = 10;
export const UNCATEGORIZED_NAME = 'Sem categoria';
export const UNCATEGORIZED_KEY = 'uncategorized';

export interface CategoryBudget {
  readonly limitCents: number;
  readonly percent: number;
  readonly status: BudgetStatus;
}

export interface CategoryInsightItem {
  readonly kind: 'category' | 'uncategorized';
  /** Nulo em "Sem categoria". */
  readonly categoryId: string | null;
  readonly name: string;
  /** Nulo em "Sem categoria". */
  readonly icon: string | null;
  readonly spentCents: number;
  /** Fatia do gasto do mês, com uma casa decimal. */
  readonly percent: number;
  readonly previousSpentCents: number;
  /** Nulo quando o período de comparação não teve gasto na categoria. */
  readonly variationPercent: number | null;
  readonly budget: CategoryBudget | null;
  /** Alinhado a `months`: um valor por mês, zero nos meses sem gasto. */
  readonly monthlyCents: readonly number[];
  /** Média dos meses anteriores ao pedido dentro da janela; nulo sem nenhum. */
  readonly averageCents: number | null;
  readonly peak: { readonly month: string; readonly cents: number };
}

export interface InsightTotals {
  readonly spentCents: number;
  readonly previousSpentCents: number;
  readonly variationPercent: number | null;
}

export interface CategoryKey {
  readonly categoryId: string | null;
  readonly name: string;
  readonly icon: string | null;
  readonly kind: 'category' | 'uncategorized';
}

/** Gasto de uma categoria no mês pedido e no período de comparação; base das listas e dos pontos de atenção. */
export interface CategoryDifference extends CategoryKey {
  readonly spentCents: number;
  readonly previousSpentCents: number;
  readonly differenceCents: number;
}

export function keyOf(categoryId: string | null): string {
  return categoryId ?? UNCATEGORIZED_KEY;
}

/** `-0` vira `0`: a tela nunca mostra "−0%". */
function withoutNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/** Fatia com uma casa decimal; zero quando o total é zero. */
export function percentOf(amountCents: number, totalCents: number): number {
  if (totalCents <= 0) return 0;
  return Math.round((amountCents * PERCENT_SCALE) / totalCents) / PERCENT_DECIMALS_DIVISOR;
}

/** `(atual − anterior) ÷ anterior × 100` com uma casa decimal; nulo sem base de comparação. */
export function variationPercentOf(currentCents: number, previousCents: number): number | null {
  if (previousCents <= 0) return null;
  const rounded = Math.round(((currentCents - previousCents) * PERCENT_SCALE) / previousCents);
  return withoutNegativeZero(rounded / PERCENT_DECIMALS_DIVISOR);
}

function describeCategory(spending: CategorySpending): CategoryKey {
  if (spending.categoryId === null || spending.categoryName === null) {
    return { categoryId: null, name: UNCATEGORIZED_NAME, icon: null, kind: 'uncategorized' };
  }
  return {
    categoryId: spending.categoryId,
    name: spending.categoryName,
    icon: spending.categoryIcon,
    kind: 'category',
  };
}

function compareByNameInPtBr(first: CategoryKey, second: CategoryKey): number {
  return first.name.localeCompare(second.name, 'pt-BR');
}

/**
 * Para a união das categorias com gasto no mês e no período de comparação: o gasto de cada um, o
 * anterior e a diferença. Quem só gastou antes tem `spentCents` zero (a queda inteira).
 */
export function buildDifferences(
  current: readonly CategorySpending[],
  previous: readonly CategorySpending[],
): CategoryDifference[] {
  const previousByKey = new Map(previous.map((item) => [keyOf(item.categoryId), item]));
  const currentByKey = new Map(current.map((item) => [keyOf(item.categoryId), item]));
  const keys = new Set([...currentByKey.keys(), ...previousByKey.keys()]);
  return [...keys].flatMap((key) => {
    const source = currentByKey.get(key) ?? previousByKey.get(key);
    if (!source) return [];
    const spentCents = currentByKey.get(key)?.spentCents ?? 0;
    const previousSpentCents = previousByKey.get(key)?.spentCents ?? 0;
    const differenceCents = spentCents - previousSpentCents;
    return [{ ...describeCategory(source), spentCents, previousSpentCents, differenceCents }];
  });
}

function sumSpent(items: readonly { readonly spentCents: number }[]): number {
  return items.reduce((sum, item) => sum + item.spentCents, 0);
}

export function buildTotals(
  current: readonly CategorySpending[],
  previous: readonly CategorySpending[],
): InsightTotals {
  const spentCents = sumSpent(current);
  const previousSpentCents = sumSpent(previous);
  return {
    spentCents,
    previousSpentCents,
    variationPercent: variationPercentOf(spentCents, previousSpentCents),
  };
}

/** Do maior gasto para o menor; em empate, pelo nome. */
export function compareBySpentThenName(
  first: { readonly spentCents: number } & CategoryKey,
  second: { readonly spentCents: number } & CategoryKey,
): number {
  return second.spentCents - first.spentCents || compareByNameInPtBr(first, second);
}

function monthlyCentsOf(
  rows: readonly MonthCategorySpending[],
  months: readonly string[],
): Map<string, number[]> {
  const monthlyByKey = new Map<string, number[]>();
  for (const row of rows) {
    const index = months.indexOf(row.month);
    if (index < 0) continue;
    const monthly = monthlyByKey.get(keyOf(row.categoryId)) ?? months.map(() => 0);
    monthly[index] = (monthly[index] ?? 0) + row.spentCents;
    monthlyByKey.set(keyOf(row.categoryId), monthly);
  }
  return monthlyByKey;
}

/** Média dos meses anteriores ao último (o pedido); nulo sem nenhum, arredondada ao centavo. */
function averageOfEarlierMonths(monthlyCents: readonly number[]): number | null {
  const earlier = monthlyCents.slice(0, -1);
  if (earlier.length === 0) return null;
  return Math.round(sumSpent(earlier.map((spentCents) => ({ spentCents }))) / earlier.length);
}

/** O maior mês da janela; em empate, o mais recente. */
function peakOf(
  monthlyCents: readonly number[],
  months: readonly string[],
): { month: string; cents: number } {
  let peak = { month: months.at(-1) ?? '', cents: 0 };
  monthlyCents.forEach((cents, index) => {
    if (cents >= peak.cents) peak = { month: months[index] ?? peak.month, cents };
  });
  return peak;
}

function budgetOf(limitCents: number | undefined, spentCents: number): CategoryBudget | null {
  if (limitCents === undefined) return null;
  return {
    limitCents,
    percent: budgetPercent(spentCents, limitCents),
    status: budgetStatus(spentCents, limitCents),
  };
}

export interface BuildItemsInput {
  readonly differences: readonly CategoryDifference[];
  readonly rows: readonly MonthCategorySpending[];
  /** `AAAA-MM`, do mais antigo ao mais recente; o último é o mês pedido. */
  readonly months: readonly string[];
  /** Limite do mês por id de categoria. */
  readonly limitsByCategoryId: ReadonlyMap<string, number>;
}

/** Todas as categorias com gasto no mês, do maior para o menor, com tendência e orçamento. */
export function buildItems(input: BuildItemsInput): CategoryInsightItem[] {
  const { differences, rows, months, limitsByCategoryId } = input;
  const spending = differences.filter((difference) => difference.spentCents > 0);
  const totalCents = sumSpent(spending);
  const monthlyByKey = monthlyCentsOf(rows, months);
  return [...spending].sort(compareBySpentThenName).map((difference) => {
    const monthlyCents = monthlyByKey.get(keyOf(difference.categoryId)) ?? months.map(() => 0);
    const limitCents =
      difference.categoryId === null ? undefined : limitsByCategoryId.get(difference.categoryId);
    return {
      kind: difference.kind,
      categoryId: difference.categoryId,
      name: difference.name,
      icon: difference.icon,
      spentCents: difference.spentCents,
      percent: percentOf(difference.spentCents, totalCents),
      previousSpentCents: difference.previousSpentCents,
      variationPercent: variationPercentOf(difference.spentCents, difference.previousSpentCents),
      budget: budgetOf(limitCents, difference.spentCents),
      monthlyCents,
      averageCents: averageOfEarlierMonths(monthlyCents),
      peak: peakOf(monthlyCents, months),
    };
  });
}
