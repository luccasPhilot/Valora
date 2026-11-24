import { percentWithOneDecimal } from '../../shared/percent.js';
import { buildSpendingBreakdown, type SpendingItem } from '../dashboard/dashboard-calculations.js';
import type {
  CategorySpending,
  MonthCategorySpending,
} from '../transactions/transaction-totals.repository.js';

const UNCATEGORIZED_KEY = 'uncategorized';
const OTHER_KEY = 'other';

export interface CategoryReportSeries {
  readonly kind: 'category' | 'uncategorized' | 'other';
  /** Nulo em "Sem categoria" e "Outros". */
  readonly categoryId: string | null;
  readonly name: string;
  /** Nulo em "Sem categoria" e "Outros". */
  readonly icon: string | null;
  readonly totalCents: number;
  /** Fatia do total do período, com uma casa decimal. */
  readonly percent: number;
  /** Alinhado a `months`: um valor por mês, zero nos meses sem gasto. */
  readonly monthlyCents: readonly number[];
}

export interface CategoryReport {
  /** `AAAA-MM`, do mais antigo ao mais recente. */
  readonly months: readonly string[];
  readonly series: readonly CategoryReportSeries[];
  readonly totals: {
    readonly totalCents: number;
    readonly monthlyCents: readonly number[];
  };
}

function keyOf(categoryId: string | null): string {
  return categoryId ?? UNCATEGORIZED_KEY;
}

function sumPerCategory(rows: readonly MonthCategorySpending[]): CategorySpending[] {
  const perCategory = new Map<string, CategorySpending>();
  for (const row of rows) {
    const key = keyOf(row.categoryId);
    const known = perCategory.get(key);
    perCategory.set(key, {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
      spentCents: (known?.spentCents ?? 0) + row.spentCents,
    });
  }
  return [...perCategory.values()];
}

function seriesKeyOf(item: SpendingItem): string {
  if (item.kind === 'category') return item.categoryId;
  return item.kind === 'uncategorized' ? UNCATEGORIZED_KEY : OTHER_KEY;
}

/** Gasto de cada série em cada mês; a linha de uma categoria fora das séries vai para "Outros". */
function monthlyCentsBySeries(
  rows: readonly MonthCategorySpending[],
  months: readonly string[],
  seriesKeys: ReadonlySet<string>,
): Map<string, number[]> {
  const monthlyBySeries = new Map<string, number[]>();
  for (const row of rows) {
    const index = months.indexOf(row.month);
    if (index < 0) continue;
    const key = seriesKeys.has(keyOf(row.categoryId)) ? keyOf(row.categoryId) : OTHER_KEY;
    const monthly = monthlyBySeries.get(key) ?? months.map(() => 0);
    monthly[index] = (monthly[index] ?? 0) + row.spentCents;
    monthlyBySeries.set(key, monthly);
  }
  return monthlyBySeries;
}

function toSeries(
  item: SpendingItem,
  totalCents: number,
  monthlyCents: number[],
): CategoryReportSeries {
  return {
    kind: item.kind,
    categoryId: item.kind === 'category' ? item.categoryId : null,
    name: item.name,
    icon: item.kind === 'category' ? item.icon : null,
    totalCents: item.amountCents,
    percent: percentWithOneDecimal(item.amountCents, totalCents),
    monthlyCents,
  };
}

/**
 * Gasto líquido por categoria mês a mês. O ranking é o do Início aplicado ao total do período (a
 * soma dos meses de cada categoria): as 5 maiores, "Sem categoria" disputando vaga, e "Outros" com
 * o resto, somado mês a mês. `months` vem em `AAAA-MM`.
 */
export function buildCategoryReport(
  rows: readonly MonthCategorySpending[],
  months: readonly string[],
): CategoryReport {
  const items = buildSpendingBreakdown(sumPerCategory(rows));
  const totalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
  const seriesKeys = new Set(items.map(seriesKeyOf));
  const monthlyBySeries = monthlyCentsBySeries(rows, months, seriesKeys);
  const series = items.map((item) =>
    toSeries(item, totalCents, monthlyBySeries.get(seriesKeyOf(item)) ?? []),
  );
  return { months, series, totals: { totalCents, monthlyCents: sumColumns(series, months) } };
}

function sumColumns(series: readonly CategoryReportSeries[], months: readonly string[]): number[] {
  return months.map((_, index) =>
    series.reduce((sum, item) => sum + (item.monthlyCents[index] ?? 0), 0),
  );
}
